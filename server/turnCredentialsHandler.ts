import type { IncomingMessage, ServerResponse } from 'node:http';
import { fetchCloudflareIceServers } from './cloudflareTurn';

export const TURN_CREDENTIALS_PATH = '/api/socket-io/turn-credentials';

interface TurnCredentialsHandlerOptions {
  environment?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}

export function createTurnCredentialsHandler({
  environment = process.env,
  fetcher = fetch
}: TurnCredentialsHandlerOptions = {}) {
  return async (_request: IncomingMessage, response: ServerResponse) => {
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

    try {
      const iceServers = await fetchCloudflareIceServers({ keyId, apiToken, fetcher });
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      });
      response.end(JSON.stringify({ iceServers }));
    } catch (error) {
      console.error('Unable to generate TURN credentials:', error);
      response.writeHead(502, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      });
      response.end(JSON.stringify({ error: 'TURN credentials are temporarily unavailable' }));
    }
  };
}
