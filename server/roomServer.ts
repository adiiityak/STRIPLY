import { createServer } from 'node:http';
import { ROOM_SOCKET_PATH } from '../src/remote/socketConfig';
import { attachRoomSocketServer } from './roomSocket';
import { createTurnCredentialsHandler, TURN_CREDENTIALS_PATH } from './turnCredentialsHandler';

interface RoomServerOptions {
  environment?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}

export function createRoomHttpServer({
  environment = process.env,
  fetcher = fetch
}: RoomServerOptions = {}) {
  const handleTurnCredentials = createTurnCredentialsHandler({ environment, fetcher });
  const server = createServer((request, response) => {
    if (request.url?.split('?')[0] !== TURN_CREDENTIALS_PATH) return;

    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' });
      response.end();
      return;
    }

    void handleTurnCredentials(request, response);
  });
  const io = attachRoomSocketServer(server, undefined, { path: ROOM_SOCKET_PATH });

  return { server, io };
}
