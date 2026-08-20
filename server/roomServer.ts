import { createServer } from 'node:http';
import { ROOM_SOCKET_PATH } from '../src/remote/socketConfig';
import { fetchCloudflareIceServers } from './cloudflareTurn';
import { attachRoomSocketServer } from './roomSocket';

const TURN_CREDENTIALS_PATH = '/api/socket-io/turn-credentials';

interface RoomServerOptions {
  environment?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}

export function createRoomHttpServer({
  environment = process.env,
  fetcher = fetch
}: RoomServerOptions = {}) {
  const server = createServer((request, response) => {
    if (request.url?.split('?')[0] !== TURN_CREDENTIALS_PATH) return;

    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' });
      response.end();
      return;
    }

    const keyId = environment.CLOUDFLARE_TURN_KEY_ID;
    const apiToken = environment.CLOUDFLARE_TURN_API_TOKEN;
    if (!keyId || !apiToken) {
      response.writeHead(503, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      });
      response.end(JSON.stringify({ error: 'TURN service is not configured' }));
      return;
    }

    void fetchCloudflareIceServers({ keyId, apiToken, fetcher })
      .then((iceServers) => {
        response.writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json'
        });
        response.end(JSON.stringify({ iceServers }));
      })
      .catch((error) => {
        console.error('Unable to generate TURN credentials:', error);
        response.writeHead(502, {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json'
        });
        response.end(JSON.stringify({ error: 'TURN credentials are temporarily unavailable' }));
      });
  });
  const io = attachRoomSocketServer(server, undefined, { path: ROOM_SOCKET_PATH });

  return { server, io };
}
