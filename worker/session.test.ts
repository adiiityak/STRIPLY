import { describe, expect, it } from 'vitest';
import { SESSION_TTL_SECONDS, bearerToken, createSessionToken, readSessionToken } from './session';
import { encodeSegment } from './jwt';

const SECRET = 'test-secret-value-not-used-anywhere';
const NOW_MS = 1_800_000_000_000;

describe('session tokens', () => {
  it('round-trips the user it was issued for', async () => {
    const token = await createSessionToken('user-1', SECRET, NOW_MS);
    expect(await readSessionToken(token, SECRET, NOW_MS)).toBe('user-1');
  });

  it('stops being accepted once it expires', async () => {
    const token = await createSessionToken('user-1', SECRET, NOW_MS);
    const justInside = NOW_MS + (SESSION_TTL_SECONDS - 10) * 1000;
    const justOutside = NOW_MS + (SESSION_TTL_SECONDS + 10) * 1000;
    expect(await readSessionToken(token, SECRET, justInside)).toBe('user-1');
    expect(await readSessionToken(token, SECRET, justOutside)).toBeNull();
  });

  // Anyone can read a JWT payload; the signature is the only thing stopping them
  // rewriting `sub` and becoming another user.
  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken('user-1', SECRET, NOW_MS);
    expect(await readSessionToken(token, 'a-different-secret', NOW_MS)).toBeNull();
  });

  it('rejects a token whose subject was rewritten', async () => {
    const token = await createSessionToken('user-1', SECRET, NOW_MS);
    const [header, , signature] = token.split('.');
    const forged = `${header}.${encodeSegment({ sub: 'admin', exp: 9_999_999_999 })}.${signature}`;
    expect(await readSessionToken(forged, SECRET, NOW_MS)).toBeNull();
  });

  it('rejects an unsigned token claiming a long life', async () => {
    const forged = `${encodeSegment({ alg: 'none', typ: 'JWT' })}.${encodeSegment({ sub: 'admin', exp: 9_999_999_999 })}.`;
    expect(await readSessionToken(forged, SECRET, NOW_MS)).toBeNull();
  });

  it('rejects malformed input instead of throwing', async () => {
    for (const bad of ['', 'x', 'a.b', 'a.b.c']) {
      expect(await readSessionToken(bad, SECRET, NOW_MS)).toBeNull();
    }
  });
});

describe('bearerToken', () => {
  it('reads a bearer header', () => {
    expect(bearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('is case-insensitive about the scheme', () => {
    expect(bearerToken('bearer abc')).toBe('abc');
  });

  it('ignores other schemes and missing headers', () => {
    expect(bearerToken('Basic abc')).toBeNull();
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken('Bearer')).toBeNull();
  });
});
