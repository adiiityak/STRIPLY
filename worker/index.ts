import type { Env } from './env';
import { verifyGoogleIdToken } from './googleAuth';
import { bearerToken, createSessionToken, readSessionToken } from './session';
import {
  deleteStrip,
  findOwnedStrip,
  listStrips,
  saveStrip,
  type StripStore
} from './strips';

/** Origins are allow-listed rather than reflected, so any site cannot call this API with a user's token. */
export function corsHeaders(origin: string | null, allowed: string): Record<string, string> {
  const list = allowed
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const permitted = origin && list.includes(origin);
  return {
    ...(permitted ? { 'Access-Control-Allow-Origin': origin } : {}),
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });

/** Maps a save failure to a status and a message safe to show a user. */
function saveFailureResponse(reason: string, headers: Record<string, string>) {
  const map: Record<string, [number, string]> = {
    'missing-image': [400, 'No image was sent.'],
    'unsupported-format': [415, 'Only PNG strips can be saved.'],
    'too-large': [413, 'That strip is too large to save.'],
    undecodable: [400, 'That image could not be read.']
  };
  const [status, message] = map[reason] ?? [400, 'That strip could not be saved.'];
  return json({ error: message }, status, headers);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(request.headers.get('Origin'), env.ALLOWED_ORIGINS ?? '');
    try {
      return await handle(request, env, headers);
    } catch (error) {
      // An escaping exception becomes a runtime-generated 500 with no CORS
      // headers, so the browser reports it as "Failed to fetch" and hides the
      // status entirely -- which is how a missing database table presented as a
      // network problem. Answer with our own 500, carrying CORS, and log the
      // cause for the worker tail.
      console.error('Unhandled API error:', error);
      return json({ error: 'Something went wrong on our side.' }, 500, headers);
    }
  }
};

async function handle(request: Request, env: Env, headers: Record<string, string>): Promise<Response> {
  {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    const store: StripStore = { db: env.DB, bucket: env.STRIPS };

    // Exchange a Google ID token for a Striply session.
    if (url.pathname === '/auth/google' && request.method === 'POST') {
      const body = (await request.json().catch(() => null)) as { credential?: string } | null;
      const credential = typeof body?.credential === 'string' ? body.credential : '';
      const claims = credential
        ? await verifyGoogleIdToken(credential, { clientId: env.GOOGLE_CLIENT_ID })
        : null;
      if (!claims) return json({ error: 'Sign-in could not be verified.' }, 401, headers);

      const now = Date.now();
      // Keyed on the Google subject, which never changes, so a user who changes
      // their email keeps their strips.
      const existing = await env.DB.prepare('SELECT id FROM users WHERE google_sub = ?')
        .bind(claims.sub)
        .first<{ id: string }>();
      const userId = existing?.id ?? crypto.randomUUID();

      if (existing) {
        await env.DB.prepare('UPDATE users SET email = ?, name = ?, picture = ?, last_seen_at = ? WHERE id = ?')
          .bind(claims.email ?? null, claims.name ?? null, claims.picture ?? null, now, userId)
          .run();
      } else {
        await env.DB.prepare(
          'INSERT INTO users (id, google_sub, email, name, picture, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(userId, claims.sub, claims.email ?? null, claims.name ?? null, claims.picture ?? null, now, now)
          .run();
      }

      return json(
        {
          token: await createSessionToken(userId, env.SESSION_SECRET, now),
          user: { id: userId, email: claims.email, name: claims.name, picture: claims.picture },
          // Lets the app greet a returning visitor differently from a new one.
          isNewUser: !existing
        },
        200,
        headers
      );
    }

    // Everything past here needs a session.
    const userId = await readSessionToken(bearerToken(request.headers.get('Authorization')) ?? '', env.SESSION_SECRET);
    if (!userId) return json({ error: 'Please sign in.' }, 401, headers);

    if (url.pathname === '/strips' && request.method === 'GET') {
      return json({ strips: await listStrips(store, userId) }, 200, headers);
    }

    if (url.pathname === '/strips' && request.method === 'POST') {
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return json({ error: 'That strip could not be saved.' }, 400, headers);
      const result = await saveStrip(store, userId, body, { id: crypto.randomUUID(), nowMs: Date.now() });
      return result.ok
        ? json({ strip: result.strip }, 201, headers)
        : saveFailureResponse(result.reason, headers);
    }

    const imageMatch = /^\/strips\/([A-Za-z0-9-]+)\/image$/.exec(url.pathname);
    if (imageMatch && request.method === 'GET') {
      const row = await findOwnedStrip(store, userId, imageMatch[1]);
      // A strip belonging to somebody else is reported as absent, not forbidden,
      // so ids cannot be probed for existence.
      if (!row) return json({ error: 'Not found.' }, 404, headers);
      const object = await env.STRIPS.get(row.r2_key);
      if (!object) return json({ error: 'Not found.' }, 404, headers);
      return new Response(object.body, {
        headers: { ...headers, 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' }
      });
    }

    const deleteMatch = /^\/strips\/([A-Za-z0-9-]+)$/.exec(url.pathname);
    if (deleteMatch && request.method === 'DELETE') {
      const removed = await deleteStrip(store, userId, deleteMatch[1]);
      return removed ? new Response(null, { status: 204, headers }) : json({ error: 'Not found.' }, 404, headers);
    }

    return json({ error: 'Not found.' }, 404, headers);
  }
}
