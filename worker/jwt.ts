/**
 * Minimal JWT helpers built on WebCrypto.
 *
 * Deliberately dependency-free: a Worker bundle should not pull a JOSE library in
 * for two algorithms, and the verification rules here are ones we want to read
 * plainly rather than configure.
 */

export function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const encoder = new TextEncoder();

export function encodeSegment(value: unknown): string {
  return bytesToBase64Url(encoder.encode(JSON.stringify(value)));
}

export function decodeSegment<T>(segment: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment))) as T;
}

export interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: Uint8Array;
  signedContent: string;
}

/**
 * Splits a compact JWT without validating anything.
 *
 * Returns null rather than throwing, so a malformed token is an ordinary
 * "unauthorised" outcome instead of a 500.
 */
export function parseJwt(token: string): JwtParts | null {
  const segments = token.split('.');
  if (segments.length !== 3) return null;
  const [headerSegment, payloadSegment, signatureSegment] = segments;
  try {
    return {
      header: decodeSegment<Record<string, unknown>>(headerSegment),
      payload: decodeSegment<Record<string, unknown>>(payloadSegment),
      signature: base64UrlToBytes(signatureSegment),
      signedContent: `${headerSegment}.${payloadSegment}`
    };
  } catch {
    return null;
  }
}

/** Signs a payload with HS256. Used for Striply's own session tokens. */
export async function signHs256(payload: Record<string, unknown>, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signedContent = `${encodeSegment({ alg: 'HS256', typ: 'JWT' })}.${encodeSegment(payload)}`;
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedContent));
  return `${signedContent}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

/** Verifies an HS256 signature. Returns the payload, or null if it does not hold. */
export async function verifyHs256(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = parseJwt(token);
  if (!parts || parts.header.alg !== 'HS256') return null;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    parts.signature as unknown as ArrayBuffer,
    encoder.encode(parts.signedContent)
  );
  return valid ? parts.payload : null;
}

export interface JsonWebKey {
  kid: string;
  n: string;
  e: string;
  alg?: string;
  kty?: string;
}

/** Verifies an RS256 signature against one JWK. Used for Google's ID tokens. */
export async function verifyRs256(parts: JwtParts, jwk: JsonWebKey): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    parts.signature as unknown as ArrayBuffer,
    encoder.encode(parts.signedContent)
  );
}
