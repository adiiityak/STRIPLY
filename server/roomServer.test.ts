import { afterEach, describe, expect, it } from 'vitest';
import { io as createClient } from 'socket.io-client';
import { createRoomHttpServer } from './roomServer';
import { ROOM_SOCKET_PATH } from '../src/remote/socketConfig';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

describe('room service entrypoint', () => {
  it('creates rooms through the public service path', async () => {
    const { server, io } = createRoomHttpServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('missing test address');

    const socket = createClient(`http://127.0.0.1:${address.port}`, {
      path: ROOM_SOCKET_PATH,
      transports: ['websocket'],
      forceNew: true
    });
    cleanups.push(async () => {
      socket.disconnect();
      await new Promise<void>((resolve) => io.close(() => resolve()));
    });

    const created = await new Promise<any>((resolve) =>
      socket.emit('room:create', { name: 'Production check' }, resolve)
    );

    expect(created.ok).toBe(true);
    expect(created.data.snapshot.code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('serves temporary TURN credentials from the room service', async () => {
    const { server, io } = createRoomHttpServer({
      environment: {
        CLOUDFLARE_TURN_KEY_ID: 'turn-key-id',
        CLOUDFLARE_TURN_API_TOKEN: 'permanent-api-token'
      },
      fetcher: async () =>
        new Response(
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
        )
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('missing test address');
    cleanups.push(async () => {
      await new Promise<void>((resolve) => io.close(() => resolve()));
    });

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/socket-io/turn-credentials`
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      iceServers: [
        { urls: ['stun:stun.cloudflare.com:3478'] },
        {
          urls: ['turns:turn.cloudflare.com:443?transport=tcp'],
          username: 'temporary-user',
          credential: 'temporary-credential'
        }
      ]
    });
  });
});
