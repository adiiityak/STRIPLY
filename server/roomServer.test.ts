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
});
