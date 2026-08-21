import { describe, expect, it, vi } from 'vitest';
import { AccountsApi, AccountsApiError, isAccountsConfigured, readAccountsConfig } from './apiClient';
import type { SavedStrip } from './types';

const strip: SavedStrip = {
  id: 's1',
  templateId: 'airmail',
  layout: '1x4',
  width: 810,
  height: 1800,
  bytes: 1234,
  createdAt: 1,
  imageUrl: '/strips/s1/image'
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('readAccountsConfig', () => {
  it('trims a trailing slash off the API base', () => {
    expect(readAccountsConfig({ VITE_API_BASE_URL: 'https://api.example.com/' }).apiBaseUrl).toBe(
      'https://api.example.com'
    );
  });

  it('treats missing values as empty', () => {
    expect(readAccountsConfig({})).toEqual({ apiBaseUrl: '', googleClientId: '' });
  });
});

describe('isAccountsConfigured', () => {
  // A sign-in button that cannot work is worse than no button at all.
  it('needs both an API and a client id', () => {
    expect(isAccountsConfigured({ apiBaseUrl: 'https://api', googleClientId: 'abc' })).toBe(true);
    expect(isAccountsConfigured({ apiBaseUrl: 'https://api', googleClientId: '' })).toBe(false);
    expect(isAccountsConfigured({ apiBaseUrl: '', googleClientId: 'abc' })).toBe(false);
  });
});

function api(fetchImpl: typeof fetch, token: string | null = 'session-token') {
  const onUnauthorized = vi.fn();
  const client = new AccountsApi({
    baseUrl: 'https://api.example.com',
    getToken: () => token,
    onUnauthorized,
    fetchImpl
  });
  return { client, onUnauthorized };
}

describe('AccountsApi', () => {
  it('sends the session as a bearer token', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ strips: [strip] })) as unknown as typeof fetch;
    const { client } = api(fetchImpl);

    await client.listStrips();

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.example.com/strips');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer session-token' });
  });

  it('does not send a token to the sign-in endpoint', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ token: 't', user: { id: 'u1' } })) as unknown as typeof fetch;
    const { client } = api(fetchImpl);

    const result = await client.signInWithGoogle('google-credential');

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init as RequestInit).headers).not.toHaveProperty('Authorization');
    expect(result.user.id).toBe('u1');
  });

  it('refuses to call an authenticated route with no session', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const { client } = api(fetchImpl, null);

    await expect(client.listStrips()).rejects.toBeInstanceOf(AccountsApiError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  // An expired session should log the user out once, centrally, rather than
  // leaving every screen to notice for itself.
  it('signs the user out when the API rejects the session', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: 'Please sign in.' }, 401)) as unknown as typeof fetch;
    const { client, onUnauthorized } = api(fetchImpl);

    await expect(client.listStrips()).rejects.toThrow(/expired/i);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('surfaces the API error message', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: 'Only PNG strips can be saved.' }, 415)
    ) as unknown as typeof fetch;
    const { client } = api(fetchImpl);

    await expect(client.saveStrip({ image: 'data:image/jpeg;base64,AA' })).rejects.toThrow(
      'Only PNG strips can be saved.'
    );
  });

  it('falls back to a generic message when the error body is unreadable', async () => {
    const fetchImpl = vi.fn(async () => new Response('boom', { status: 500 })) as unknown as typeof fetch;
    const { client } = api(fetchImpl);

    await expect(client.listStrips()).rejects.toThrow('Something went wrong.');
  });

  it('returns an empty list rather than undefined', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({})) as unknown as typeof fetch;
    const { client } = api(fetchImpl);

    expect(await client.listStrips()).toEqual([]);
  });

  it('saves a strip and returns it', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ strip }, 201)) as unknown as typeof fetch;
    const { client } = api(fetchImpl);

    const saved = await client.saveStrip({ image: 'data:image/png;base64,AA', templateId: 'airmail' });
    expect(saved.id).toBe('s1');
  });

  it('deletes a strip', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
    const { client } = api(fetchImpl);

    await client.deleteStrip('s1');
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.example.com/strips/s1');
    expect((init as RequestInit).method).toBe('DELETE');
  });

  // The image endpoint checks ownership, so it needs the header an <img src>
  // cannot send.
  it('fetches an image through the session rather than linking to it', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    const fetchImpl = vi.fn(async () => new Response(blob, { status: 200 })) as unknown as typeof fetch;
    const createObjectURL = vi.fn(() => 'blob:strip-1');
    vi.stubGlobal('URL', { ...URL, createObjectURL });
    const { client } = api(fetchImpl);

    expect(await client.fetchStripImageUrl(strip)).toBe('blob:strip-1');
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.example.com/strips/s1/image');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer session-token' });
    vi.unstubAllGlobals();
  });
});
