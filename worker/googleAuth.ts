import { parseJwt, verifyRs256, type JsonWebKey, type JwtParts } from './jwt';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
/** Google issues tokens under both spellings; both are legitimate. */
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
/** Tolerance for clock drift between Google and the edge, in seconds. */
const CLOCK_SKEW_SECONDS = 60;

export interface GoogleClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export type ClaimFailure =
  | 'malformed'
  | 'wrong-issuer'
  | 'wrong-audience'
  | 'expired'
  | 'not-yet-valid'
  | 'missing-subject';

/**
 * Checks everything about an ID token except its signature.
 *
 * Separated from signature verification so the rules can be read and tested on
 * their own -- audience and issuer checks are what stop a validly-signed token
 * meant for somebody else's app being accepted here, and they are easy to get
 * subtly wrong.
 */
export function validateGoogleClaims(
  payload: Record<string, unknown>,
  options: { clientId: string; nowSeconds: number }
): { ok: true; claims: GoogleClaims } | { ok: false; reason: ClaimFailure } {
  const issuer = typeof payload.iss === 'string' ? payload.iss : '';
  if (!GOOGLE_ISSUERS.includes(issuer)) return { ok: false, reason: 'wrong-issuer' };

  // `aud` must be this application's client ID. Without this check any Google
  // account holder could present a token minted for another site.
  const audience = payload.aud;
  const audiences = Array.isArray(audience) ? audience : [audience];
  if (!audiences.includes(options.clientId)) return { ok: false, reason: 'wrong-audience' };

  const exp = typeof payload.exp === 'number' ? payload.exp : 0;
  if (!exp || exp + CLOCK_SKEW_SECONDS < options.nowSeconds) return { ok: false, reason: 'expired' };

  const nbf = typeof payload.nbf === 'number' ? payload.nbf : undefined;
  if (nbf !== undefined && nbf - CLOCK_SKEW_SECONDS > options.nowSeconds) {
    return { ok: false, reason: 'not-yet-valid' };
  }

  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  if (!sub) return { ok: false, reason: 'missing-subject' };

  return {
    ok: true,
    claims: {
      sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      email_verified: payload.email_verified === true,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      picture: typeof payload.picture === 'string' ? payload.picture : undefined
    }
  };
}

/** Picks the signing key named by the token header. */
export function selectSigningKey(parts: JwtParts, keys: readonly JsonWebKey[]): JsonWebKey | null {
  if (parts.header.alg !== 'RS256') return null;
  const kid = typeof parts.header.kid === 'string' ? parts.header.kid : null;
  if (!kid) return null;
  return keys.find((key) => key.kid === kid) ?? null;
}

interface JwksCache {
  keys: JsonWebKey[];
  fetchedAtMs: number;
}

let cache: JwksCache | null = null;
/** Google rotates these keys slowly; an hour is well within their guidance. */
const JWKS_TTL_MS = 60 * 60 * 1000;

async function getGoogleKeys(fetchImpl: typeof fetch, nowMs: number): Promise<JsonWebKey[]> {
  if (cache && nowMs - cache.fetchedAtMs < JWKS_TTL_MS) return cache.keys;
  const response = await fetchImpl(GOOGLE_JWKS_URL);
  if (!response.ok) throw new Error(`Unable to fetch Google signing keys (${response.status}).`);
  const body = (await response.json()) as { keys: JsonWebKey[] };
  cache = { keys: body.keys ?? [], fetchedAtMs: nowMs };
  return cache.keys;
}

export function resetGoogleKeyCacheForTests() {
  cache = null;
}

export interface VerifyOptions {
  clientId: string;
  nowMs?: number;
  fetchImpl?: typeof fetch;
  /** Injected in tests so a generated key pair can stand in for Google's. */
  keysOverride?: readonly JsonWebKey[];
}

/**
 * Verifies a Google ID token end to end: signature, then claims.
 *
 * Returns null on any failure. Callers translate that to 401 -- the specific
 * reason is deliberately not surfaced to the client.
 */
export async function verifyGoogleIdToken(
  token: string,
  options: VerifyOptions
): Promise<GoogleClaims | null> {
  const parts = parseJwt(token);
  if (!parts) return null;

  const nowMs = options.nowMs ?? Date.now();
  const keys =
    options.keysOverride ?? (await getGoogleKeys(options.fetchImpl ?? fetch, nowMs).catch(() => []));
  const key = selectSigningKey(parts, keys);
  if (!key) return null;

  if (!(await verifyRs256(parts, key).catch(() => false))) return null;

  const result = validateGoogleClaims(parts.payload, {
    clientId: options.clientId,
    nowSeconds: Math.floor(nowMs / 1000)
  });
  return result.ok ? result.claims : null;
}
