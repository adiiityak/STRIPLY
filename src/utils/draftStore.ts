import type { PhotoItem, StripConfiguration } from '../types';

/**
 * The in-progress strip, kept across reloads.
 *
 * IndexedDB rather than localStorage: photos are data URLs, and four of them
 * comfortably exceed the ~5MB localStorage budget that everything else on the
 * origin shares.
 */
export interface StripDraft {
  photos: PhotoItem[];
  config: StripConfiguration;
  savedAt: number;
}

const DB_NAME = 'striply';
const DB_VERSION = 1;
const STORE = 'drafts';
const KEY = 'current';

/**
 * Restoring is only worth doing when there is work to restore.
 *
 * An empty editor is a dead end -- nothing to edit and no obvious next step --
 * so a draft with no photos is left alone and the start screen shown instead. An
 * invite link also wins, because joining someone's room is a more specific
 * intention than picking up an old draft.
 */
export function shouldRestoreDraft(
  draft: StripDraft | null,
  options: { invited: boolean }
): draft is StripDraft {
  if (!draft || options.invited) return false;
  return draft.photos.length > 0;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Every entry point swallows its own failures.
 *
 * Storage can be unavailable (private browsing, blocked origins) or full, and
 * none of that is worth interrupting someone mid-edit for. Losing a draft is a
 * far smaller harm than an editor that throws.
 */
export async function readDraft(): Promise<StripDraft | null> {
  try {
    if (typeof indexedDB === 'undefined') return null;
    const db = await openDatabase();
    return await new Promise<StripDraft | null>((resolve) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve((request.result as StripDraft | undefined) ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function writeDraft(draft: Omit<StripDraft, 'savedAt'>, nowMs = Date.now()): Promise<void> {
  try {
    if (typeof indexedDB === 'undefined') return;
    const db = await openDatabase();
    await new Promise<void>((resolve) => {
      const request = db
        .transaction(STORE, 'readwrite')
        .objectStore(STORE)
        .put({ ...draft, savedAt: nowMs }, KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    // Quota or unavailable storage. Nothing to do but carry on.
  }
}

/**
 * Removes the draft.
 *
 * Called on sign-out, because photos of someone's face must not sit on a shared
 * laptop for the next person who opens Striply.
 */
export async function clearDraft(): Promise<void> {
  try {
    if (typeof indexedDB === 'undefined') return;
    const db = await openDatabase();
    await new Promise<void>((resolve) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    // Ignored for the same reason as above.
  }
}
