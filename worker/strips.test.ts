import { describe, expect, it } from 'vitest';
import {
  MAX_STRIP_BYTES,
  decodeStripImage,
  deleteStrip,
  findOwnedStrip,
  listStrips,
  saveStrip,
  stripObjectKey,
  toSummary,
  type StripRow,
  type StripStore
} from './strips';

const pngDataUrl = (bytes: number) => {
  const body = btoa('P'.repeat(bytes));
  return `data:image/png;base64,${body}`;
};

/** Enough of D1 and R2 to exercise the ownership scoping in the SQL. */
function fakeStore() {
  const rows: StripRow[] = [];
  const objects = new Map<string, number>();

  const db = {
    prepare(sql: string) {
      const binder = {
        args: [] as unknown[],
        bind(...args: unknown[]) {
          binder.args = args;
          return binder;
        },
        async all<T>() {
          const [userId, limit] = binder.args as [string, number];
          const results = rows
            .filter((row) => row.user_id === userId)
            .sort((a, b) => b.created_at - a.created_at)
            .slice(0, limit) as unknown as T[];
          return { results };
        },
        async first<T>() {
          const [id, userId] = binder.args as [string, string];
          return (rows.find((row) => row.id === id && row.user_id === userId) ?? null) as T | null;
        },
        async run() {
          if (sql.startsWith('INSERT')) {
            const [id, user_id, r2_key, template_id, layout, width, height, bytes, created_at] =
              binder.args as never[];
            rows.push({ id, user_id, r2_key, template_id, layout, width, height, bytes, created_at } as StripRow);
          } else if (sql.startsWith('DELETE')) {
            const [id, userId] = binder.args as [string, string];
            const index = rows.findIndex((row) => row.id === id && row.user_id === userId);
            if (index >= 0) rows.splice(index, 1);
          }
          return { success: true };
        }
      };
      return binder;
    }
  } as unknown as D1Database;

  const bucket = {
    async put(key: string, body: ArrayBuffer) {
      objects.set(key, (body as unknown as Uint8Array).byteLength);
    },
    async delete(key: string) {
      objects.delete(key);
    }
  } as unknown as R2Bucket;

  return { store: { db, bucket } as StripStore, rows, objects };
}

describe('decodeStripImage', () => {
  it('accepts a PNG data URL', () => {
    const result = decodeStripImage(pngDataUrl(64));
    expect(result.ok).toBe(true);
  });

  it('refuses a missing image', () => {
    expect(decodeStripImage(undefined)).toEqual({ ok: false, reason: 'missing-image' });
    expect(decodeStripImage('')).toEqual({ ok: false, reason: 'missing-image' });
  });

  // Only PNG is stored, so a JPEG or an SVG cannot smuggle itself in under a
  // .png key and be served back with the wrong content type.
  it('refuses anything that is not a PNG', () => {
    expect(decodeStripImage('data:image/jpeg;base64,AAAA')).toEqual({ ok: false, reason: 'unsupported-format' });
    expect(decodeStripImage('data:image/svg+xml;base64,AAAA')).toEqual({ ok: false, reason: 'unsupported-format' });
    expect(decodeStripImage('https://example.com/x.png')).toEqual({ ok: false, reason: 'unsupported-format' });
  });

  // The limit applies to decoded bytes: base64 inflates by a third, so checking
  // the string length would reject images that are actually within budget.
  it('measures the decoded size, not the encoded string', () => {
    const justUnder = decodeStripImage(pngDataUrl(MAX_STRIP_BYTES - 1024));
    expect(justUnder.ok).toBe(true);
    expect(decodeStripImage(pngDataUrl(MAX_STRIP_BYTES + 1024))).toEqual({ ok: false, reason: 'too-large' });
  });
});

describe('saved strips', () => {
  it('stores the image and its metadata together', async () => {
    const { store, rows, objects } = fakeStore();
    const result = await saveStrip(
      store,
      'user-a',
      { image: pngDataUrl(128), templateId: 'airmail', layout: '1x4', width: 810, height: 1800 },
      { id: 'strip-1', nowMs: 1_000 }
    );

    expect(result.ok).toBe(true);
    expect(rows).toHaveLength(1);
    expect(objects.get(stripObjectKey('user-a', 'strip-1'))).toBe(128);
    if (result.ok) {
      expect(result.strip.imageUrl).toBe('/strips/strip-1/image');
      expect(result.strip.templateId).toBe('airmail');
    }
  });

  it('writes nothing when the image is rejected', async () => {
    const { store, rows, objects } = fakeStore();
    const result = await saveStrip(store, 'user-a', { image: 'data:image/jpeg;base64,AAAA' }, { id: 's', nowMs: 1 });
    expect(result.ok).toBe(false);
    expect(rows).toHaveLength(0);
    expect(objects.size).toBe(0);
  });

  it('lists only the signed-in user, newest first', async () => {
    const { store } = fakeStore();
    await saveStrip(store, 'user-a', { image: pngDataUrl(16) }, { id: 'a1', nowMs: 100 });
    await saveStrip(store, 'user-a', { image: pngDataUrl(16) }, { id: 'a2', nowMs: 300 });
    await saveStrip(store, 'user-b', { image: pngDataUrl(16) }, { id: 'b1', nowMs: 200 });

    const mine = await listStrips(store, 'user-a');
    expect(mine.map((s) => s.id)).toEqual(['a2', 'a1']);
  });

  // The property that matters most: knowing an id must not be enough to read it.
  it('will not hand another user their strip by id', async () => {
    const { store } = fakeStore();
    await saveStrip(store, 'user-a', { image: pngDataUrl(16) }, { id: 'secret', nowMs: 1 });

    expect(await findOwnedStrip(store, 'user-a', 'secret')).not.toBeNull();
    expect(await findOwnedStrip(store, 'user-b', 'secret')).toBeNull();
  });

  it('will not let another user delete it either', async () => {
    const { store, rows, objects } = fakeStore();
    await saveStrip(store, 'user-a', { image: pngDataUrl(16) }, { id: 'secret', nowMs: 1 });

    expect(await deleteStrip(store, 'user-b', 'secret')).toBe(false);
    expect(rows).toHaveLength(1);
    expect(objects.size).toBe(1);

    expect(await deleteStrip(store, 'user-a', 'secret')).toBe(true);
    expect(rows).toHaveLength(0);
    // The object goes too, or the bucket fills with data nobody can reach.
    expect(objects.size).toBe(0);
  });

  it('reports a delete of something that is not there', async () => {
    const { store } = fakeStore();
    expect(await deleteStrip(store, 'user-a', 'nope')).toBe(false);
  });
});

describe('toSummary', () => {
  it('exposes no storage details to the client', () => {
    const summary = toSummary({
      id: 's1',
      user_id: 'u1',
      r2_key: 'strips/u1/s1.png',
      template_id: null,
      layout: null,
      width: null,
      height: null,
      bytes: 10,
      created_at: 5
    });
    expect(JSON.stringify(summary)).not.toContain('strips/u1/s1.png');
    expect(JSON.stringify(summary)).not.toContain('u1');
  });
});
