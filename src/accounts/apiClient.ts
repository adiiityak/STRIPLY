import type { AccountUser, SaveStripInput, SavedStrip } from './types';

export interface AccountsConfig {
  apiBaseUrl: string;
  googleClientId: string;
}

type Env = Record<string, string | undefined>;

export function readAccountsConfig(env: Env): AccountsConfig {
  return {
    apiBaseUrl: (env.VITE_API_BASE_URL ?? '').replace(/\/+$/, ''),
    googleClientId: env.VITE_GOOGLE_CLIENT_ID ?? ''
  };
}

/**
 * Accounts stay hidden until both halves are configured.
 *
 * A sign-in button that cannot work is worse than no button, and this keeps the
 * feature invisible until the deployment actually has an API and a client ID.
 */
export function isAccountsConfigured(config: AccountsConfig): boolean {
  return config.apiBaseUrl.length > 0 && config.googleClientId.length > 0;
}

export class AccountsApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'AccountsApiError';
  }
}

interface AccountsApiOptions {
  baseUrl: string;
  getToken: () => string | null;
  /** Called when the API rejects the session, so the app can sign out. */
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
}

export class AccountsApi {
  constructor(private readonly options: AccountsApiOptions) {}

  private get fetchImpl() {
    return this.options.fetchImpl ?? fetch;
  }

  private async send(path: string, init: RequestInit = {}, authenticated = true): Promise<Response> {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
    if (authenticated) {
      const token = this.options.getToken();
      if (!token) throw new AccountsApiError('Please sign in.', 401);
      headers.Authorization = `Bearer ${token}`;
    }
    if (init.body) headers['Content-Type'] = 'application/json';

    const response = await this.fetchImpl(`${this.options.baseUrl}${path}`, { ...init, headers });

    if (response.status === 401 && authenticated) {
      // An expired or revoked session should log the user out once, here, rather
      // than leaving every caller to notice.
      this.options.onUnauthorized?.();
      throw new AccountsApiError('Your session has expired. Please sign in again.', 401);
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new AccountsApiError(body?.error ?? 'Something went wrong.', response.status);
    }
    return response;
  }

  async signInWithGoogle(credential: string): Promise<{ token: string; user: AccountUser }> {
    const response = await this.send(
      '/auth/google',
      { method: 'POST', body: JSON.stringify({ credential }) },
      false
    );
    return (await response.json()) as { token: string; user: AccountUser };
  }

  async listStrips(): Promise<SavedStrip[]> {
    const response = await this.send('/strips');
    const body = (await response.json()) as { strips?: SavedStrip[] };
    return body.strips ?? [];
  }

  async saveStrip(input: SaveStripInput): Promise<SavedStrip> {
    const response = await this.send('/strips', { method: 'POST', body: JSON.stringify(input) });
    const body = (await response.json()) as { strip: SavedStrip };
    return body.strip;
  }

  async deleteStrip(id: string): Promise<void> {
    await this.send(`/strips/${id}`, { method: 'DELETE' });
  }

  /**
   * Fetches a strip image as a blob URL.
   *
   * The image endpoint checks ownership, so it needs the Authorization header --
   * which an <img src> cannot send. Callers must revoke the URL when done.
   */
  async fetchStripImageUrl(strip: SavedStrip): Promise<string> {
    const response = await this.send(strip.imageUrl);
    return URL.createObjectURL(await response.blob());
  }
}
