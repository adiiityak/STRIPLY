import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccount } from './useAccount';
import { readStoredSession } from './session';

const CONFIGURED = {
  VITE_API_BASE_URL: 'https://api.example.com',
  VITE_GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com'
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v)
  } as Storage;
}

beforeEach(() => vi.clearAllMocks());

describe('useAccount', () => {
  // Nothing about accounts should appear until a deployment can actually serve
  // them.
  it('reports unconfigured when the API or client id is missing', () => {
    const { result } = renderHook(() => useAccount({ env: {}, storage: memoryStorage() }));
    expect(result.current.status).toBe('unconfigured');

    const { result: partial } = renderHook(() =>
      useAccount({ env: { VITE_API_BASE_URL: 'https://api.example.com' }, storage: memoryStorage() })
    );
    expect(partial.current.status).toBe('unconfigured');
  });

  it('starts signed out when configured with no stored session', () => {
    const { result } = renderHook(() => useAccount({ env: CONFIGURED, storage: memoryStorage() }));
    expect(result.current.status).toBe('signed-out');
    expect(result.current.user).toBeNull();
  });

  it('signs in and remembers the session', async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ token: 'session-token', user: { id: 'u1', name: 'Aditya' } })
    ) as unknown as typeof fetch;
    const { result } = renderHook(() => useAccount({ env: CONFIGURED, storage, fetchImpl }));

    await act(async () => {
      await result.current.signInWithCredential('google-credential');
    });

    expect(result.current.status).toBe('signed-in');
    expect(result.current.user?.name).toBe('Aditya');
    expect(readStoredSession(storage)?.token).toBe('session-token');
  });

  // A returning visitor should not see a signed-out flash before their strips
  // appear, so the session is read on the first render rather than in an effect.
  it('restores a stored session on the very first render', () => {
    const storage = memoryStorage();
    storage.setItem('striply-account', JSON.stringify({ token: 't', user: { id: 'u1', name: 'Aditya' } }));

    const { result } = renderHook(() => useAccount({ env: CONFIGURED, storage }));
    expect(result.current.status).toBe('signed-in');
    expect(result.current.user?.id).toBe('u1');
  });

  it('ignores a stored session when accounts are not configured', () => {
    const storage = memoryStorage();
    storage.setItem('striply-account', JSON.stringify({ token: 't', user: { id: 'u1' } }));

    const { result } = renderHook(() => useAccount({ env: {}, storage }));
    expect(result.current.status).toBe('unconfigured');
  });

  it('reports a failed sign-in without signing in', async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: 'Sign-in could not be verified.' }, 401)
    ) as unknown as typeof fetch;
    const { result } = renderHook(() => useAccount({ env: CONFIGURED, storage, fetchImpl }));

    await act(async () => {
      const ok = await result.current.signInWithCredential('bad-credential');
      expect(ok).toBe(false);
    });

    expect(result.current.status).toBe('signed-out');
    expect(result.current.error).toMatch(/could not be verified/i);
    expect(readStoredSession(storage)).toBeNull();
  });

  it('signs out and forgets the session', async () => {
    const storage = memoryStorage();
    storage.setItem('striply-account', JSON.stringify({ token: 't', user: { id: 'u1' } }));
    const { result } = renderHook(() => useAccount({ env: CONFIGURED, storage }));

    act(() => result.current.signOut());

    expect(result.current.status).toBe('signed-out');
    expect(readStoredSession(storage)).toBeNull();
  });

  // An expired session must not leave the UI believing it is signed in.
  it('signs out when the API rejects the stored session', async () => {
    const storage = memoryStorage();
    storage.setItem('striply-account', JSON.stringify({ token: 'stale', user: { id: 'u1' } }));
    const fetchImpl = vi.fn(async () => jsonResponse({ error: 'Please sign in.' }, 401)) as unknown as typeof fetch;
    const { result } = renderHook(() => useAccount({ env: CONFIGURED, storage, fetchImpl }));

    expect(result.current.status).toBe('signed-in');
    await act(async () => {
      await result.current.api.listStrips().catch(() => undefined);
    });

    await waitFor(() => expect(result.current.status).toBe('signed-out'));
    expect(readStoredSession(storage)).toBeNull();
  });

  it('discards a corrupt stored session instead of crashing', () => {
    const storage = memoryStorage();
    storage.setItem('striply-account', '{not json');
    const { result } = renderHook(() => useAccount({ env: CONFIGURED, storage }));
    expect(result.current.status).toBe('signed-out');
  });
});

describe('new versus returning visitors', () => {
  // A returning visitor should not be invited to explore something they already
  // know, so the app needs to tell the two apart.
  it('reports a brand-new account as new', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ token: 't', user: { id: 'u1' }, isNewUser: true })
    ) as unknown as typeof fetch;
    const { result } = renderHook(() => useAccount({ env: CONFIGURED, storage: memoryStorage(), fetchImpl }));

    await act(async () => {
      await result.current.signInWithCredential('credential');
    });

    expect(result.current.isNewUser).toBe(true);
  });

  it('reports an existing account as returning', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ token: 't', user: { id: 'u1' }, isNewUser: false })
    ) as unknown as typeof fetch;
    const { result } = renderHook(() => useAccount({ env: CONFIGURED, storage: memoryStorage(), fetchImpl }));

    await act(async () => {
      await result.current.signInWithCredential('credential');
    });

    expect(result.current.isNewUser).toBe(false);
  });

  // An older API that does not send the flag must not make everyone look new.
  it('treats a missing flag as returning', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ token: 't', user: { id: 'u1' } })) as unknown as typeof fetch;
    const { result } = renderHook(() => useAccount({ env: CONFIGURED, storage: memoryStorage(), fetchImpl }));

    await act(async () => {
      await result.current.signInWithCredential('credential');
    });

    expect(result.current.isNewUser).toBe(false);
  });

  it('treats a restored session as returning', () => {
    const storage = memoryStorage();
    storage.setItem('striply-account', JSON.stringify({ token: 't', user: { id: 'u1' } }));
    const { result } = renderHook(() => useAccount({ env: CONFIGURED, storage }));

    expect(result.current.status).toBe('signed-in');
    expect(result.current.isNewUser).toBe(false);
  });
});
