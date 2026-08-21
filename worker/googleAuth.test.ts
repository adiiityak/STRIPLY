import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetGoogleKeyCacheForTests,
  selectSigningKey,
  validateGoogleClaims,
  verifyGoogleIdToken
} from './googleAuth';
import { bytesToBase64Url, encodeSegment, parseJwt } from './jwt';

const CLIENT_ID = '1234567890-striply.apps.googleusercontent.com';
const NOW_MS = 1_800_000_000_000;
const NOW_S = Math.floor(NOW_MS / 1000);

const goodPayload = {
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  sub: '110000000000000000001',
  email: 'aditya@example.com',
  email_verified: true,
  name: 'Aditya',
  exp: NOW_S + 3600
};

describe('validateGoogleClaims', () => {
  const opts = { clientId: CLIENT_ID, nowSeconds: NOW_S };

  it('accepts a well-formed token for this app', () => {
    const result = validateGoogleClaims(goodPayload, opts);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.claims.sub).toBe(goodPayload.sub);
  });

  it('accepts either spelling of the Google issuer', () => {
    expect(validateGoogleClaims({ ...goodPayload, iss: 'accounts.google.com' }, opts).ok).toBe(true);
  });

  // The check that stops a validly-signed token minted for a different site
  // being accepted here.
  it('rejects a token issued for another application', () => {
    const result = validateGoogleClaims({ ...goodPayload, aud: 'someone-else.apps.googleusercontent.com' }, opts);
    expect(result).toEqual({ ok: false, reason: 'wrong-audience' });
  });

  it('accepts an audience array that includes this app', () => {
    expect(validateGoogleClaims({ ...goodPayload, aud: ['other', CLIENT_ID] }, opts).ok).toBe(true);
  });

  it('rejects an audience array that does not', () => {
    expect(validateGoogleClaims({ ...goodPayload, aud: ['other', 'another'] }, opts).ok).toBe(false);
  });

  it('rejects a foreign issuer', () => {
    expect(validateGoogleClaims({ ...goodPayload, iss: 'https://evil.example' }, opts)).toEqual({
      ok: false,
      reason: 'wrong-issuer'
    });
  });

  it('rejects an expired token', () => {
    expect(validateGoogleClaims({ ...goodPayload, exp: NOW_S - 3600 }, opts)).toEqual({
      ok: false,
      reason: 'expired'
    });
  });

  it('rejects a token with no expiry at all', () => {
    const { exp, ...noExp } = goodPayload;
    expect(validateGoogleClaims(noExp, opts)).toEqual({ ok: false, reason: 'expired' });
  });

  it('forgives expiry within the clock-skew window', () => {
    expect(validateGoogleClaims({ ...goodPayload, exp: NOW_S - 30 }, opts).ok).toBe(true);
  });

  it('rejects a token that is not valid yet', () => {
    expect(validateGoogleClaims({ ...goodPayload, nbf: NOW_S + 600 }, opts)).toEqual({
      ok: false,
      reason: 'not-yet-valid'
    });
  });

  it('rejects a token with no subject', () => {
    const { sub, ...noSub } = goodPayload;
    expect(validateGoogleClaims(noSub, opts)).toEqual({ ok: false, reason: 'missing-subject' });
  });
});

describe('selectSigningKey', () => {
  const parts = parseJwt(`${encodeSegment({ alg: 'RS256', kid: 'abc' })}.${encodeSegment(goodPayload)}.AAAA`)!;

  it('finds the key the header names', () => {
    expect(selectSigningKey(parts, [{ kid: 'zzz', n: 'n', e: 'AQAB' }, { kid: 'abc', n: 'n', e: 'AQAB' }])?.kid).toBe('abc');
  });

  it('refuses when no key matches', () => {
    expect(selectSigningKey(parts, [{ kid: 'zzz', n: 'n', e: 'AQAB' }])).toBeNull();
  });

  // "alg": "none" and algorithm-confusion attacks start exactly here.
  it('refuses any algorithm other than RS256', () => {
    const hs = parseJwt(`${encodeSegment({ alg: 'HS256', kid: 'abc' })}.${encodeSegment(goodPayload)}.AAAA`)!;
    expect(selectSigningKey(hs, [{ kid: 'abc', n: 'n', e: 'AQAB' }])).toBeNull();
    const none = parseJwt(`${encodeSegment({ alg: 'none', kid: 'abc' })}.${encodeSegment(goodPayload)}.`)!;
    expect(selectSigningKey(none, [{ kid: 'abc', n: 'n', e: 'AQAB' }])).toBeNull();
  });
});

/** Stands in for Google: a real RSA key pair, used to mint real signatures. */
async function issuer(kid = 'test-key') {
  const pair = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair;
  const jwk = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as { n: string; e: string };
  const sign = async (payload: Record<string, unknown>, header: Record<string, unknown> = {}) => {
    const content = `${encodeSegment({ alg: 'RS256', kid, ...header })}.${encodeSegment(payload)}`;
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      pair.privateKey,
      new TextEncoder().encode(content)
    );
    return `${content}.${bytesToBase64Url(new Uint8Array(signature))}`;
  };
  return { keys: [{ kid, n: jwk.n, e: jwk.e }], sign };
}

describe('verifyGoogleIdToken', () => {
  beforeEach(() => resetGoogleKeyCacheForTests());

  it('accepts a genuinely signed token', async () => {
    const google = await issuer();
    const token = await google.sign(goodPayload);
    const claims = await verifyGoogleIdToken(token, { clientId: CLIENT_ID, nowMs: NOW_MS, keysOverride: google.keys });
    expect(claims?.sub).toBe(goodPayload.sub);
    expect(claims?.email).toBe('aditya@example.com');
  });

  it('rejects a token signed by somebody else', async () => {
    const real = await issuer();
    const impostor = await issuer();
    const token = await impostor.sign(goodPayload);
    // Same kid, different private key: only the signature check can catch this.
    expect(await verifyGoogleIdToken(token, { clientId: CLIENT_ID, nowMs: NOW_MS, keysOverride: real.keys })).toBeNull();
  });

  it('rejects a token whose payload was edited after signing', async () => {
    const google = await issuer();
    const token = await google.sign(goodPayload);
    const [header, , signature] = token.split('.');
    const tampered = `${header}.${encodeSegment({ ...goodPayload, sub: 'attacker' })}.${signature}`;
    expect(await verifyGoogleIdToken(tampered, { clientId: CLIENT_ID, nowMs: NOW_MS, keysOverride: google.keys })).toBeNull();
  });

  it('rejects a correctly signed token meant for another app', async () => {
    const google = await issuer();
    const token = await google.sign({ ...goodPayload, aud: 'other.apps.googleusercontent.com' });
    expect(await verifyGoogleIdToken(token, { clientId: CLIENT_ID, nowMs: NOW_MS, keysOverride: google.keys })).toBeNull();
  });

  it('rejects an expired token even when properly signed', async () => {
    const google = await issuer();
    const token = await google.sign({ ...goodPayload, exp: NOW_S - 7200 });
    expect(await verifyGoogleIdToken(token, { clientId: CLIENT_ID, nowMs: NOW_MS, keysOverride: google.keys })).toBeNull();
  });

  it('rejects nonsense instead of throwing', async () => {
    const google = await issuer();
    for (const bad of ['', 'not-a-jwt', 'a.b', 'a.b.c.d']) {
      expect(await verifyGoogleIdToken(bad, { clientId: CLIENT_ID, nowMs: NOW_MS, keysOverride: google.keys })).toBeNull();
    }
  });

  it('rejects everything when the key set cannot be fetched', async () => {
    const google = await issuer();
    const token = await google.sign(goodPayload);
    const failingFetch = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    expect(await verifyGoogleIdToken(token, { clientId: CLIENT_ID, nowMs: NOW_MS, fetchImpl: failingFetch })).toBeNull();
  });
});
