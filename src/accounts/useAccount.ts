import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountsApi, isAccountsConfigured, readAccountsConfig, type AccountsConfig } from './apiClient';
import { clearStoredSession, readStoredSession, writeStoredSession } from './session';
import type { AccountUser } from './types';

export type AccountStatus = 'unconfigured' | 'signed-out' | 'signed-in';

interface UseAccountOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  storage?: Storage;
}

/**
 * Signed-in state for the app.
 *
 * The session is restored synchronously from storage on first render, so a
 * returning visitor never sees a signed-out flicker before their strips appear.
 */
export function useAccount(options: UseAccountOptions = {}) {
  const config: AccountsConfig = useMemo(
    () =>
      readAccountsConfig(
        options.env ?? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {}
      ),
    [options.env]
  );
  const configured = isAccountsConfigured(config);

  const stored = useRef(configured ? readStoredSession(options.storage) : null);
  const [token, setToken] = useState<string | null>(stored.current?.token ?? null);
  const [user, setUser] = useState<AccountUser | null>(stored.current?.user ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A restored session means they have signed in before, so a returning visitor
  // by definition. Only a fresh sign-in can report a brand-new account.
  const [isNewUser, setIsNewUser] = useState(false);

  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const signOut = useCallback(() => {
    clearStoredSession(options.storage);
    setToken(null);
    setUser(null);
  }, [options.storage]);

  const api = useMemo(
    () =>
      new AccountsApi({
        baseUrl: config.apiBaseUrl,
        // Read through a ref so the client is not rebuilt on every sign-in,
        // which would restart anything holding on to it.
        getToken: () => tokenRef.current,
        onUnauthorized: signOut,
        fetchImpl: options.fetchImpl
      }),
    [config.apiBaseUrl, options.fetchImpl, signOut]
  );

  const signInWithCredential = useCallback(
    async (credential: string) => {
      setBusy(true);
      setError(null);
      try {
        const result = await api.signInWithGoogle(credential);
        writeStoredSession({ token: result.token, user: result.user }, options.storage);
        tokenRef.current = result.token;
        setToken(result.token);
        setUser(result.user);
        setIsNewUser(result.isNewUser === true);
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [api, options.storage]
  );

  const status: AccountStatus = !configured ? 'unconfigured' : token && user ? 'signed-in' : 'signed-out';

  return {
    status,
    config,
    user,
    /** False for a returning visitor, which changes how the app greets them. */
    isNewUser,
    api,
    busy,
    error,
    clearError: () => setError(null),
    signInWithCredential,
    signOut
  };
}

export type Account = ReturnType<typeof useAccount>;
