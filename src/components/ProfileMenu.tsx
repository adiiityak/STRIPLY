import React, { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, LogOut, User } from 'lucide-react';

interface ProfileMenuProps {
  name?: string;
  email?: string;
  picture?: string;
  onOpenSavedStrips: () => void;
  onSignOut: () => void;
}

/**
 * Avatar in the top-right that opens the account menu.
 *
 * Sign out lives here rather than inside the saved-strips dialog: it is an
 * account action, not a gallery action, and this is the first place anyone looks
 * for it.
 */
export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  name,
  email,
  picture,
  onOpenSavedStrips,
  onSignOut
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Close on an outside press or Escape, and return focus to the trigger, so the
  // menu behaves like every other menu a visitor has used.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const label = name ?? email ?? 'Account';

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${label}`}
        title={label}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#E8E6DF] bg-[#FAF9F6] transition-all hover:border-[#FF6B6B] active:scale-95 lg:h-10 lg:w-10"
      >
        {picture ? (
          <img src={picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <User className="h-4 w-4 text-[#FF6B6B]" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-[#E8E6DF] bg-white shadow-xl"
        >
          <div className="border-b border-[#E8E6DF] px-4 py-3 text-left">
            <p className="truncate text-sm font-bold text-[#2D2D2D]">{name ?? 'Signed in'}</p>
            {email && <p className="truncate text-xs text-[#666666]">{email}</p>}
          </div>

          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenSavedStrips();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold text-[#2D2D2D] hover:bg-[#FAF9F6]"
          >
            <BookmarkPlus className="h-4 w-4 text-[#FF6B6B]" />
            My strips
          </button>

          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2.5 border-t border-[#E8E6DF] px-4 py-3 text-left text-sm font-semibold text-[#B4453C] hover:bg-[#FFF5F5]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};
