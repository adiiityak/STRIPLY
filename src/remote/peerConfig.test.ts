import { describe, expect, it } from 'vitest';
import { buildIceServers, loadIceServers } from './usePeerVideo';

describe('WebRTC ICE configuration', () => {
  it('always includes a STUN server and adds TURN when fully configured', () => {
    expect(buildIceServers({})).toEqual([{ urls: 'stun:stun.l.google.com:19302' }]);
    expect(
      buildIceServers({
        VITE_WEBRTC_TURN_URL: 'turn:turn.example.com:3478',
        VITE_WEBRTC_TURN_USERNAME: 'striply',
        VITE_WEBRTC_TURN_CREDENTIAL: 'secret'
      })
    ).toHaveLength(2);
  });

  it('loads short-lived Cloudflare credentials and ignores browser-blocked port 53 URLs', async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          iceServers: [
            {
              urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53']
            },
            {
              urls: [
                'turn:turn.cloudflare.com:3478?transport=udp',
                'turn:turn.cloudflare.com:53?transport=udp',
                'turns:turn.cloudflare.com:443?transport=tcp'
              ],
              username: 'temporary-user',
              credential: 'temporary-secret'
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    await expect(loadIceServers({}, fetcher)).resolves.toEqual([
      { urls: ['stun:stun.cloudflare.com:3478'] },
      {
        urls: [
          'turn:turn.cloudflare.com:3478?transport=udp',
          'turns:turn.cloudflare.com:443?transport=tcp'
        ],
        username: 'temporary-user',
        credential: 'temporary-secret'
      }
    ]);
  });

  it('falls back to the local ICE configuration when credentials are unavailable', async () => {
    const fetcher = async () => new Response('unavailable', { status: 503 });

    await expect(loadIceServers({}, fetcher)).resolves.toEqual([
      { urls: 'stun:stun.l.google.com:19302' }
    ]);
  });
});
