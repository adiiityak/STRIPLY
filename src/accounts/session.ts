import type { AccountUser } from './types';

const STORAGE_KEY = 'striply-account';

export interface StoredSession {
  token: string;
  user: AccountUser;
}

/**
 * Storage that cannot throw.
 *
 * Safari in private browsing throws on localStorage access rather than returning
 * null, and a signed-out photobooth is a far better outcome than a blank page.
 */
function safeStorage(storage?: Storage): Storage | null {
  try {
    const target = storage ?? window.localStorage;
    const probe = '__striply_probe__';
    target.setItem(probe, '1');
    target.removeItem(probe);
    return target;
  } catch {
    return null;
  }
}

export function readStoredSession(storage?: Storage): StoredSession | null {
  const target = safeStorage(storage);
  if (!target) return null;
  const raw = target.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed?.token !== 'string' || !parsed.token) return null;
    if (!parsed.user || typeof parsed.user.id !== 'string') return null;
    return { token: parsed.token, user: parsed.user as AccountUser };
  } catch {
    // Corrupt entry: drop it rather than failing on every load.
    target.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeStoredSession(session: StoredSession, storage?: Storage): void {
  const target = safeStorage(storage);
  target?.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(storage?: Storage): void {
  safeStorage(storage)?.removeItem(STORAGE_KEY);
}
