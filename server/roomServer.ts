import { createServer } from 'node:http';
import { ROOM_SOCKET_PATH } from '../src/remote/socketConfig';
import { attachRoomSocketServer } from './roomSocket';

export function createRoomHttpServer() {
  const server = createServer();
  const io = attachRoomSocketServer(server, undefined, { path: ROOM_SOCKET_PATH });

  return { server, io };
}
