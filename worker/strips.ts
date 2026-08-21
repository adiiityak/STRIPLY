/**
 * Saved-strip storage.
 *
 * Every read and write is scoped to the signed-in user in the SQL itself rather
 * than checked afterwards, so a route cannot accidentally serve somebody else's
 * strip by forgetting a guard.
 */

export interface StripRow {
  id: string;
  user_id: string;
  r2_key: string;
  template_id: string | null;
  layout: string | null;
  width: number | null;
  height: number | null;
  bytes: number;
  created_at: number;
}

export interface StripSummary {
  id: string;
  templateId: string | null;
  layout: string | null;
  width: number | null;
  height: number | null;
  bytes: number;
  createdAt: number;
  imageUrl: string;
}

/** Largest strip accepted, in bytes. A 810x1800 PNG sits well under this. */
export const MAX_STRIP_BYTES = 8 * 1024 * 1024;

export function stripObjectKey(userId: string, stripId: string): string {
  return `strips/${userId}/${stripId}.png`;
}

export function toSummary(row: StripRow): StripSummary {
  return {
    id: row.id,
    templateId: row.template_id,
    layout: row.layout,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    createdAt: row.created_at,
    imageUrl: `/strips/${row.id}/image`
  };
}

export interface SaveStripInput {
  templateId?: unknown;
  layout?: unknown;
  width?: unknown;
  height?: unknown;
  image?: unknown;
}

export type SaveFailure = 'missing-image' | 'unsupported-format' | 'too-large' | 'undecodable';

/**
 * Validates and decodes an incoming strip.
 *
 * PNG only, and the size is checked against the decoded bytes rather than the
 * data-URL length, because base64 inflates by a third and a limit applied to the
 * string would reject images that are actually fine.
 */
export function decodeStripImage(
  image: unknown
): { ok: true; bytes: Uint8Array } | { ok: false; reason: SaveFailure } {
  if (typeof image !== 'string' || image.length === 0) return { ok: false, reason: 'missing-image' };
  const match = /^data:image\/png;base64,(.+)$/i.exec(image);
  if (!match) return { ok: false, reason: 'unsupported-format' };
  let bytes: Uint8Array;
  try {
    const binary = atob(match[1]);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  } catch {
    return { ok: false, reason: 'undecodable' };
  }
  if (bytes.byteLength === 0) return { ok: false, reason: 'undecodable' };
  if (bytes.byteLength > MAX_STRIP_BYTES) return { ok: false, reason: 'too-large' };
  return { ok: true, bytes };
}

function optionalText(value: unknown, max = 120): string | null {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : null;
}

function optionalInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

export interface StripStore {
  db: D1Database;
  bucket: R2Bucket;
}

export async function listStrips(store: StripStore, userId: string, limit = 60): Promise<StripSummary[]> {
  const result = await store.db
    .prepare(
      'SELECT id, user_id, r2_key, template_id, layout, width, height, bytes, created_at FROM strips WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    )
    .bind(userId, limit)
    .all<StripRow>();
  return (result.results ?? []).map(toSummary);
}

export async function saveStrip(
  store: StripStore,
  userId: string,
  input: SaveStripInput,
  options: { id: string; nowMs: number }
): Promise<{ ok: true; strip: StripSummary } | { ok: false; reason: SaveFailure }> {
  const decoded = decodeStripImage(input.image);
  if (!decoded.ok) return { ok: false, reason: decoded.reason };

  const key = stripObjectKey(userId, options.id);
  await store.bucket.put(key, decoded.bytes as unknown as ArrayBuffer, {
    httpMetadata: { contentType: 'image/png' }
  });

  const row: StripRow = {
    id: options.id,
    user_id: userId,
    r2_key: key,
    template_id: optionalText(input.templateId),
    layout: optionalText(input.layout, 32),
    width: optionalInteger(input.width),
    height: optionalInteger(input.height),
    bytes: decoded.bytes.byteLength,
    created_at: options.nowMs
  };

  await store.db
    .prepare(
      'INSERT INTO strips (id, user_id, r2_key, template_id, layout, width, height, bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(row.id, row.user_id, row.r2_key, row.template_id, row.layout, row.width, row.height, row.bytes, row.created_at)
    .run();

  return { ok: true, strip: toSummary(row) };
}

/** Looks a strip up, scoped to its owner. A miss and a wrong owner are the same thing. */
export async function findOwnedStrip(
  store: StripStore,
  userId: string,
  stripId: string
): Promise<StripRow | null> {
  return store.db
    .prepare(
      'SELECT id, user_id, r2_key, template_id, layout, width, height, bytes, created_at FROM strips WHERE id = ? AND user_id = ?'
    )
    .bind(stripId, userId)
    .first<StripRow>();
}

export async function deleteStrip(store: StripStore, userId: string, stripId: string): Promise<boolean> {
  const row = await findOwnedStrip(store, userId, stripId);
  if (!row) return false;
  await store.bucket.delete(row.r2_key);
  await store.db.prepare('DELETE FROM strips WHERE id = ? AND user_id = ?').bind(stripId, userId).run();
  return true;
}
