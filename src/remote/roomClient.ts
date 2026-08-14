import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, RoomSnapshot, ServerToClientEvents } from './types';
import { ROOM_SOCKET_PATH } from './socketConfig';

export { ROOM_SOCKET_PATH } from './socketConfig';

export type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let singleton: RoomSocket | undefined;

export function getRoomSocket(): RoomSocket {
  if (!singleton) {
    singleton = io({
      autoConnect: true,
      path: ROOM_SOCKET_PATH,
      // Use WebSockets directly so room traffic stays on one persistent service.
      transports: ['websocket']
    });
  }
  return singleton;
}

export function shouldAcceptRoomSnapshot(current: RoomSnapshot | null, incoming: RoomSnapshot): boolean {
  return current === null || incoming.code !== current.code || incoming.revision >= current.revision;
}
