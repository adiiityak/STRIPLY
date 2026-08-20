export interface TurnIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

interface FetchCloudflareIceServersOptions {
  keyId: string;
  apiToken: string;
  fetcher?: typeof fetch;
  ttlSeconds?: number;
}

function isIceServer(value: unknown): value is TurnIceServer {
  if (!value || typeof value !== 'object') return false;
  const server = value as Record<string, unknown>;
  const urlsAreValid =
    typeof server.urls === 'string' ||
    (Array.isArray(server.urls) && server.urls.every((url) => typeof url === 'string'));
  return (
    urlsAreValid &&
    (server.username === undefined || typeof server.username === 'string') &&
    (server.credential === undefined || typeof server.credential === 'string')
  );
}

export async function fetchCloudflareIceServers({
  keyId,
  apiToken,
  fetcher = fetch,
  ttlSeconds = 3_600
}: FetchCloudflareIceServersOptions): Promise<TurnIceServer[]> {
  const response = await fetcher(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ttl: ttlSeconds })
    }
  );

  if (!response.ok) {
    throw new Error(`Cloudflare TURN credential request failed (${response.status})`);
  }

  const payload = (await response.json()) as { iceServers?: unknown };
  if (!Array.isArray(payload.iceServers) || !payload.iceServers.every(isIceServer)) {
    throw new Error('Cloudflare TURN credential response was invalid');
  }

  return payload.iceServers;
}
