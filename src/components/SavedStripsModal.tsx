import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Trash2, Download, Loader2 } from 'lucide-react';
import type { Account } from '../accounts/useAccount';
import type { SavedStrip } from '../accounts/types';
import { renderGoogleSignIn } from '../accounts/googleIdentity';

interface SavedStripsModalProps {
  account: Account;
  isOpen: boolean;
  onClose: () => void;
}

/** Blob URLs are created per thumbnail and must be revoked to avoid leaking. */
function useStripThumbnails(account: Account, strips: SavedStrip[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    void (async () => {
      for (const strip of strips) {
        if (cancelled) break;
        try {
          const url = await account.api.fetchStripImageUrl(strip);
          created.push(url);
          if (cancelled) break;
          setUrls((current) => ({ ...current, [strip.id]: url }));
        } catch {
          // A thumbnail that will not load is not worth failing the gallery over.
        }
      }
    })();

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [account.api, strips]);

  return urls;
}

export const SavedStripsModal: React.FC<SavedStripsModalProps> = ({
  account,
  isOpen,
  onClose
}) => {
  const signInRef = useRef<HTMLDivElement | null>(null);
  const [strips, setStrips] = useState<SavedStrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const thumbnails = useStripThumbnails(account, strips);

  const refresh = useCallback(async () => {
    if (account.status !== 'signed-in') return;
    setLoading(true);
    try {
      setStrips(await account.api.listStrips());
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not load your strips.');
    } finally {
      setLoading(false);
    }
  }, [account.api, account.status]);

  useEffect(() => {
    if (isOpen) void refresh();
  }, [isOpen, refresh]);

  // Google's button is rendered by their script, so it needs a live element.
  useEffect(() => {
    if (!isOpen || account.status !== 'signed-out' || !signInRef.current) return;
    let cancelled = false;
    void renderGoogleSignIn({
      parent: signInRef.current,
      clientId: account.config.googleClientId,
      onCredential: (credential) => {
        if (!cancelled) void account.signInWithCredential(credential);
      },
      onError: (reason) => {
        if (!cancelled) setMessage(reason);
      }
    }).catch(() => setMessage('Google sign-in could not be loaded.'));
    return () => {
      cancelled = true;
    };
  }, [isOpen, account.status, account.config.googleClientId, account.signInWithCredential]);

  const handleDelete = async (strip: SavedStrip) => {
    try {
      await account.api.deleteStrip(strip.id);
      setStrips((current) => current.filter((item) => item.id !== strip.id));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not delete that strip.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved strips"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
    >
      {/* Roomy enough to actually browse a gallery: near-full-height on a phone,
          a wide grid on a laptop. The previous max-w-lg showed one strip per row
          with most of the panel empty. */}
      <div className="flex h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white p-5 sm:h-[85dvh] sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-[#2D2D2D]">My strips</h3>
            <p className="text-xs text-[#666]">
              {account.status === 'signed-in'
                ? `Signed in as ${account.user?.name ?? account.user?.email ?? 'you'}`
                : 'Sign in to keep your strips'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close saved strips"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF9F6] text-[#666] hover:bg-[#E8E6DF]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {message && (
          <p role="status" className="mt-3 rounded-xl bg-[#FFF8F8] px-3 py-2 text-xs font-semibold text-[#B4453C]">
            {message}
          </p>
        )}
        {account.error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {account.error}
          </p>
        )}

        {account.status === 'signed-out' && (
          <div className="mt-6 flex flex-col items-center gap-3 py-6">
            <p className="max-w-xs text-center text-xs text-[#666]">
              Sign in with Google to save finished strips and pick them up on another device.
            </p>
            <div ref={signInRef} />
            {/* Same standing hint as the landing page: a blocked sign-in pop-up
                reports nothing this code can catch. */}
            <p className="max-w-[17rem] text-center text-[11px] leading-relaxed text-[#999]">
              Nothing happens when you tap it? Allow pop-ups for this site, or try a private
              window.
            </p>
            {account.busy && <Loader2 className="h-4 w-4 animate-spin text-[#FF6B6B]" />}
          </div>
        )}

        {account.status === 'signed-in' && (
          <>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {loading && <p className="py-6 text-center text-xs text-[#666]">Loading your strips…</p>}
              {!loading && strips.length === 0 && (
                <p className="py-6 text-center text-xs text-[#666]">No saved strips yet.</p>
              )}
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {strips.map((strip) => (
                  <li key={strip.id} className="rounded-xl border border-[#E8E6DF] p-2">
                    {thumbnails[strip.id] ? (
                      <img
                        src={thumbnails[strip.id]}
                        alt="Saved strip"
                        className="h-40 w-full rounded-lg object-contain sm:h-44"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-lg bg-[#FAF9F6] sm:h-44">
                        <Loader2 className="h-4 w-4 animate-spin text-[#CCC]" />
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center justify-between">
                      <a
                        href={thumbnails[strip.id]}
                        download={`striply-${strip.id}.png`}
                        aria-label="Download strip"
                        className={`text-[#666] hover:text-[#2D2D2D] ${thumbnails[strip.id] ? '' : 'pointer-events-none opacity-40'}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => void handleDelete(strip)}
                        aria-label="Delete strip"
                        className="text-[#B4453C] hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
