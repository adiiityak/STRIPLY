import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { attachRoomSocketServer } from './roomSocket';
import type { ClientToServerEvents, ServerToClientEvents } from '../src/remote/types';

type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>;
const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

async function startSockets() {
  const httpServer = createServer();
  const io = attachRoomSocketServer(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  if (!address || typeof address === 'string') throw new Error('missing test address');
  const url = `http://127.0.0.1:${address.port}`;
  const connect = () => createClient(url, { transports: ['websocket'], forceNew: true }) as TestClient;
  cleanups.push(async () => {
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });
  return { connect };
}

function emitAck<T>(socket: TestClient, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve) => (socket as any).emit(event, payload, resolve));
}

describe('room socket server', () => {
  it('creates a room, joins a guest, and synchronizes shared updates', async () => {
    const { connect } = await startSockets();
    const creator = connect();
    const guest = connect();

    const created: any = await emitAck(creator, 'room:create', { name: 'Maya' });
    expect(created.ok).toBe(true);
    const joined: any = await emitAck(guest, 'room:join', { code: created.data.snapshot.code, name: 'Noah' });
    expect(joined.ok).toBe(true);

    const update: any = await emitAck(guest, 'room:update', {
      baseRevision: joined.data.snapshot.revision,
      patch: { background: { mode: 'preset', value: '/template-previews/pattern-love-notes.png' } }
    });

    expect(update.ok).toBe(true);
    expect(update.data.revision).toBe(1);
    expect(update.data.updatedBy).toBe('Noah');
    creator.disconnect();
    guest.disconnect();
  });

  it('relays WebRTC signals only to the other participant', async () => {
    const { connect } = await startSockets();
    const creator = connect();
    const guest = connect();
    const created: any = await emitAck(creator, 'room:create', { name: 'Maya' });
    await emitAck(guest, 'room:join', { code: created.data.snapshot.code, name: 'Noah' });

    const received = new Promise<any>((resolve) => guest.once('signal:receive', resolve));
    creator.emit('signal:send', { kind: 'offer', data: { type: 'offer', sdp: 'test' } });
    await expect(received).resolves.toEqual({ kind: 'offer', data: { type: 'offer', sdp: 'test' } });
    creator.disconnect();
    guest.disconnect();
  });

  it('broadcasts a bounded captured frame to the partner', async () => {
    const { connect } = await startSockets();
    const creator = connect();
    const guest = connect();
    const created: any = await emitAck(creator, 'room:create', { name: 'Maya' });
    await emitAck(guest, 'room:join', { code: created.data.snapshot.code, name: 'Noah' });

    const received = new Promise<any>((resolve) => guest.once('capture:frame', resolve));
    creator.emit('capture:publish', { index: 0, dataUrl: 'data:image/jpeg;base64,abc' });
    await expect(received).resolves.toEqual({ index: 0, dataUrl: 'data:image/jpeg;base64,abc' });
    creator.disconnect();
    guest.disconnect();
  });
});
