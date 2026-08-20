import { describe, expect, it } from 'vitest';
import { fetchCloudflareIceServers } from './cloudflareTurn';

describe('Cloudflare TURN credentials', () => {
  it('mints short-lived ICE servers with the permanent key kept in the request header', async () => {
    const requests: Array<{ input: string; init?: RequestInit }> = [];
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ input: String(input), init });
      return new Response(
        JSON.stringify({
          iceServers: [
            { urls: ['stun:stun.cloudflare.com:3478'] },
            {
              urls: ['turns:turn.cloudflare.com:443?transport=tcp'],
              username: 'temporary-user',
              credential: 'temporary-credential'
            }
          ]
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const iceServers = await fetchCloudflareIceServers({
      keyId: 'turn-key-id',
      apiToken: 'permanent-api-token',
      fetcher,
      ttlSeconds: 3600
    });

    expect(requests).toEqual([
      {
        input:
          'https://rtc.live.cloudflare.com/v1/turn/keys/turn-key-id/credentials/generate-ice-servers',
        init: {
          method: 'POST',
          headers: {
            Authorization: 'Bearer permanent-api-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ttl: 3600 })
        }
      }
    ]);
    expect(iceServers).toEqual([
      { urls: ['stun:stun.cloudflare.com:3478'] },
      {
        urls: ['turns:turn.cloudflare.com:443?transport=tcp'],
        username: 'temporary-user',
        credential: 'temporary-credential'
      }
    ]);
  });

  it('rejects an unsuccessful credential response without leaking its body', async () => {
    await expect(
      fetchCloudflareIceServers({
        keyId: 'turn-key-id',
        apiToken: 'permanent-api-token',
        fetcher: async () => new Response('sensitive provider response', { status: 401 })
      })
    ).rejects.toThrow('Cloudflare TURN credential request failed (401)');
  });
});
