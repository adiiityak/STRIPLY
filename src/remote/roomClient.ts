import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, RoomSnapshot, ServerToClientEvents } from './types';

export type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Vercel exposes the Socket.IO server through api/socket-io.ts. Keeping local
// development on the same path makes connection behavior identical in both
// environments.
export const ROOM_SOCKET_PATH = '/api/socket-io/socket.io';

let singleton: RoomSocket | undefined;

export function getRoomSocket(): RoomSocket {
  if (!singleton) {
    singleton = io({
      autoConnect: true,
      path: ROOM_SOCKET_PATH,
      // Vercel Functions support the WebSocket transport directly; Socket.IO's
      // HTTP polling transport cannot share the upgraded function connection.
      transports: ['websocket']
    });
  }
  return singleton;
}

export function shouldAcceptRoomSnapshot(current: RoomSnapshot | null, incoming: RoomSnapshot): boolean {
  return current === null || incoming.code !== current.code || incoming.revision >= current.revision;
}
