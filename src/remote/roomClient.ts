import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, RoomSnapshot, ServerToClientEvents } from './types';

export type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let singleton: RoomSocket | undefined;

export function getRoomSocket(): RoomSocket {
  if (!singleton) singleton = io({ autoConnect: true, transports: ['websocket', 'polling'] });
  return singleton;
}

export function shouldAcceptRoomSnapshot(current: RoomSnapshot | null, incoming: RoomSnapshot): boolean {
  return current === null || incoming.code !== current.code || incoming.revision >= current.revision;
}
