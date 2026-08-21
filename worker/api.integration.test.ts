// @vitest-environment node
// jsdom's TextEncoder returns a Uint8Array from a different realm, which esbuild
// refuses to run under, and Miniflare wants real Node globals regardless.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signHs256 } from './jwt';

/**
 * Exercises the API against real D1 and R2 via Miniflare.
 *
 * The unit tests use hand-written fakes that pattern-match on the start of each
 * statement, so they cannot catch a wrong column name or a broken query. This
 * runs the actual SQL against the actual schema.
 *
 * The Google sign-in exchange is covered by googleAuth.test.ts with a generated
 * key pair; here a session token is minted directly, since only Google can sign
 * a real ID token.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SESSION_SECRET = 'integration-secret';
const ORIGIN = 'http://localhost:3000';

let mf: Miniflare;

const png = (bytes: number) => `data:image/png;base64,${btoa('P'.repeat(bytes))}`;

// A plain record rather than a Headers instance: Miniflare types its fetch
// against undici's Headers, which the global one is not assignable to.
async function request(
  path: string,
  init: { method?: string; body?: string; token?: string; headers?: Record<string, string> } = {}
) {
  const headers: Record<string, string> = { Origin: ORIGIN, ...init.headers };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  if (init.body) headers['Content-Type'] = 'application/json';
  return mf.dispatchFetch(`http://api.local${path}`, { method: init.method, body: init.body, headers });
}

beforeAll(async () => {
  const bundle = await build({
    entryPoints: [join(HERE, 'index.ts')],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    write: false,
    platform: 'neutral'
  });

  // Miniflare 5 takes a different options shape; convertV4MiniflareOptions is
  // its own adapter for the flat form, which is far easier to read than the
  // nested one.
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: [{ type: 'ESModule', path: join(HERE, 'index.mjs'), contents: bundle.outputFiles[0].text }],
      compatibilityDate: '2026-08-01',
      d1Databases: { DB: 'striply-test' },
      r2Buckets: { STRIPS: 'striply-strips-test' },
      bindings: {
        GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
        SESSION_SECRET,
        ALLOWED_ORIGINS: ORIGIN
      }
    })
  );

  // Real schema, real database.
  const db = await mf.getD1Database('DB');
  // Strip comments per line before splitting: a leading comment block would
  // otherwise be glued to the first statement and dropped along with it.
  const schema = readFileSync(join(HERE, 'schema.sql'), 'utf8')
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
  for (const statement of schema.split(';').map((s) => s.trim()).filter(Boolean)) {
    await db.prepare(statement).run();
  }
  // Two users, so isolation can be checked.
  const now = Date.now();
  for (const [id, sub] of [['user-a', 'google-a'], ['user-b', 'google-b']]) {
    await db
      .prepare('INSERT INTO users (id, google_sub, email, name, picture, created_at, last_seen_at) VALUES (?,?,?,?,?,?,?)')
      .bind(id, sub, `${id}@example.com`, id, null, now, now)
      .run();
  }
});

afterAll(async () => {
  await mf?.dispose();
});

const tokenFor = (userId: string) =>
  signHs256({ sub: userId, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }, SESSION_SECRET);

describe('the API, against real D1 and R2', () => {
  it('turns away a request with no session', async () => {
    const response = await request('/strips');
    expect(response.status).toBe(401);
  });

  it('turns away a forged session', async () => {
    const forged = await signHs256({ sub: 'user-a', exp: 9_999_999_999 }, 'the-wrong-secret');
    expect((await request('/strips', { token: forged })).status).toBe(401);
  });

  it('answers a CORS preflight for an allowed origin only', async () => {
    const allowed = await mf.dispatchFetch('http://api.local/strips', {
      method: 'OPTIONS',
      headers: { Origin: ORIGIN }
    });
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

    const foreign = await mf.dispatchFetch('http://api.local/strips', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example' }
    });
    // No allow-origin header at all, rather than reflecting the caller back.
    expect(foreign.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('saves a strip and lists it back', async () => {
    const token = await tokenFor('user-a');
    const saved = await request('/strips', {
      method: 'POST',
      token,
      body: JSON.stringify({ image: png(256), templateId: 'airmail', layout: '1x4', width: 810, height: 1800 })
    });
    expect(saved.status).toBe(201);
    const { strip } = (await saved.json()) as { strip: { id: string; bytes: number; templateId: string } };
    expect(strip.bytes).toBe(256);
    expect(strip.templateId).toBe('airmail');

    const listed = await request('/strips', { token });
    const { strips } = (await listed.json()) as { strips: Array<{ id: string }> };
    expect(strips.map((s) => s.id)).toContain(strip.id);
  });

  it('streams the image back as a PNG', async () => {
    const token = await tokenFor('user-a');
    const saved = await request('/strips', { method: 'POST', token, body: JSON.stringify({ image: png(64) }) });
    const { strip } = (await saved.json()) as { strip: { id: string } };

    const image = await request(`/strips/${strip.id}/image`, { token });
    expect(image.status).toBe(200);
    expect(image.headers.get('Content-Type')).toBe('image/png');
    expect((await image.arrayBuffer()).byteLength).toBe(64);
  });

  // The property that matters: another signed-in user knowing the id gets nothing.
  it('hides one user\'s strip from another', async () => {
    const mine = await tokenFor('user-a');
    const theirs = await tokenFor('user-b');
    const saved = await request('/strips', { method: 'POST', token: mine, body: JSON.stringify({ image: png(32) }) });
    const { strip } = (await saved.json()) as { strip: { id: string } };

    expect((await request(`/strips/${strip.id}/image`, { token: theirs })).status).toBe(404);
    expect((await request(`/strips/${strip.id}`, { method: 'DELETE', token: theirs })).status).toBe(404);

    // Still there for its owner after the failed attempts.
    expect((await request(`/strips/${strip.id}/image`, { token: mine })).status).toBe(200);
  });

  it('does not leak other users into a listing', async () => {
    await request('/strips', { method: 'POST', token: await tokenFor('user-b'), body: JSON.stringify({ image: png(8) }) });
    const listed = await request('/strips', { token: await tokenFor('user-a') });
    const { strips } = (await listed.json()) as { strips: Array<{ id: string }> };
    const theirs = await request('/strips', { token: await tokenFor('user-b') });
    const { strips: bStrips } = (await theirs.json()) as { strips: Array<{ id: string }> };
    const overlap = strips.filter((s) => bStrips.some((b) => b.id === s.id));
    expect(overlap).toEqual([]);
  });

  it('deletes a strip and its image together', async () => {
    const token = await tokenFor('user-a');
    const saved = await request('/strips', { method: 'POST', token, body: JSON.stringify({ image: png(48) }) });
    const { strip } = (await saved.json()) as { strip: { id: string } };

    expect((await request(`/strips/${strip.id}`, { method: 'DELETE', token })).status).toBe(204);
    expect((await request(`/strips/${strip.id}/image`, { token })).status).toBe(404);

    const bucket = await mf.getR2Bucket('STRIPS');
    expect(await bucket.get(`strips/user-a/${strip.id}.png`)).toBeNull();
  });

  it('refuses a non-PNG with a useful status', async () => {
    const token = await tokenFor('user-a');
    const response = await request('/strips', {
      method: 'POST',
      token,
      body: JSON.stringify({ image: 'data:image/jpeg;base64,AAAA' })
    });
    expect(response.status).toBe(415);
  });

  it('rejects an unverifiable Google credential', async () => {
    const response = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: 'not.a.token' })
    });
    expect(response.status).toBe(401);
  });

  it('404s an unknown route', async () => {
    expect((await request('/nope', { token: await tokenFor('user-a') })).status).toBe(404);
  });

  // A missing table once escaped as a runtime 500 with no CORS headers, which the
  // browser reported as "Failed to fetch" -- hiding the status and making a
  // database problem look like a network one.
  it('answers an unexpected failure with a CORS-bearing 500', async () => {
    const db = await mf.getD1Database('DB');
    await db.prepare('DROP TABLE strips').run();
    try {
      const response = await request('/strips', { token: await tokenFor('user-a') });
      expect(response.status).toBe(500);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
      expect(((await response.json()) as { error: string }).error).toMatch(/our side/i);
    } finally {
      // Restore for any test that runs after this one.
      await db
        .prepare(
          'CREATE TABLE strips (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, r2_key TEXT NOT NULL, template_id TEXT, layout TEXT, width INTEGER, height INTEGER, bytes INTEGER NOT NULL, created_at INTEGER NOT NULL)'
        )
        .run();
    }
  });
});
