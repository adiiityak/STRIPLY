import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Trash2, Download, LogOut, Save, Loader2 } from 'lucide-react';
import type { Account } from '../accounts/useAccount';
import type { SavedStrip } from '../accounts/types';
import { forgetGoogleSelection, renderGoogleSignIn } from '../accounts/googleIdentity';

interface SavedStripsModalProps {
  account: Account;
  isOpen: boolean;
  onClose: () => void;
  /** Produces the current strip as a PNG data URL, or null if there is nothing to save. */
  onRequestCurrentStrip: () => Promise<string | null>;
  templateId?: string;
  layout?: string;
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
  onClose,
  onRequestCurrentStrip,
  templateId,
  layout
}) => {
  const signInRef = useRef<HTMLDivElement | null>(null);
  const [strips, setStrips] = useState<SavedStrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const image = await onRequestCurrentStrip();
      if (!image) {
        setMessage('Add some photos before saving a strip.');
        return;
      }
      await account.api.saveStrip({ image, templateId, layout });
      setMessage('Saved to your account.');
      await refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not save that strip.');
    } finally {
      setSaving(false);
    }
  };

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white p-5">
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
            {account.busy && <Loader2 className="h-4 w-4 animate-spin text-[#FF6B6B]" />}
          </div>
        )}

        {account.status === 'signed-in' && (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-[#FF6B6B] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save current strip
              </button>
              <button
                onClick={() => {
                  void forgetGoogleSelection();
                  account.signOut();
                }}
                className="flex items-center gap-1.5 rounded-xl border border-[#E8E6DF] px-4 py-2 text-xs font-bold text-[#2D2D2D]"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {loading && <p className="py-6 text-center text-xs text-[#666]">Loading your strips…</p>}
              {!loading && strips.length === 0 && (
                <p className="py-6 text-center text-xs text-[#666]">No saved strips yet.</p>
              )}
              <ul className="grid grid-cols-3 gap-3">
                {strips.map((strip) => (
                  <li key={strip.id} className="rounded-xl border border-[#E8E6DF] p-2">
                    {thumbnails[strip.id] ? (
                      <img
                        src={thumbnails[strip.id]}
                        alt="Saved strip"
                        className="h-32 w-full rounded-lg object-contain"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-lg bg-[#FAF9F6]">
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
