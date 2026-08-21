import { signHs256, verifyHs256 } from './jwt';

/** Sessions last a week; signing in again is cheap and silent with Google. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface SessionPayload {
  sub: string;
  exp: number;
  iat: number;
}

export async function createSessionToken(
  userId: string,
  secret: string,
  nowMs: number = Date.now()
): Promise<string> {
  const issuedAt = Math.floor(nowMs / 1000);
  return signHs256({ sub: userId, iat: issuedAt, exp: issuedAt + SESSION_TTL_SECONDS }, secret);
}

/**
 * Returns the user id a session token belongs to, or null.
 *
 * Expiry is checked here rather than by the caller so no route can forget to.
 */
export async function readSessionToken(
  token: string,
  secret: string,
  nowMs: number = Date.now()
): Promise<string | null> {
  const payload = await verifyHs256(token, secret);
  if (!payload) return null;
  const exp = typeof payload.exp === 'number' ? payload.exp : 0;
  if (!exp || exp <= Math.floor(nowMs / 1000)) return null;
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  return sub || null;
}

/** Pulls a bearer token out of an Authorization header. */
export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}
