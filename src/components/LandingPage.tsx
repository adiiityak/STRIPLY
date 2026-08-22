import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Heart, Loader2 } from 'lucide-react';
import type { Account } from '../accounts/useAccount';
import { renderGoogleSignIn } from '../accounts/googleIdentity';

/**
 * Real template previews rather than mockups, so the first thing a visitor sees
 * is the actual product. These files already ship for the template picker.
 */
const STRIP_PREVIEWS = [
  { src: '/template-previews/pattern-pink-heart-tunnel.png', alt: 'Photo strip on a pink heart backdrop' },
  { src: '/template-previews/iloveyou.png', alt: 'Photo strip with an I love you headline' },
  { src: '/template-previews/pattern-love-notes.png', alt: 'Photo strip on a love notes backdrop' },
  { src: '/template-previews/film.png', alt: 'Film reel photo strip' }
];

/** Resting rotation and offset per card, front to back. */
const CARD_LAYOUT = [
  { rotate: -4, x: -10, y: 0, scale: 1 },
  { rotate: 6, x: 18, y: 5, scale: 0.96 },
  { rotate: -10, x: -28, y: 10, scale: 0.93 },
  { rotate: 9, x: 32, y: 12, scale: 0.9 }
];

const HEARTS = [
  { left: '8%', delay: '0s', duration: '11s', size: 18, opacity: 0.18 },
  { left: '22%', delay: '2.4s', duration: '13s', size: 12, opacity: 0.14 },
  { left: '41%', delay: '1.2s', duration: '15s', size: 22, opacity: 0.12 },
  { left: '63%', delay: '3.6s', duration: '12s', size: 14, opacity: 0.16 },
  { left: '78%', delay: '0.8s', duration: '14s', size: 20, opacity: 0.13 },
  { left: '91%', delay: '4.2s', duration: '16s', size: 11, opacity: 0.15 }
];

interface LandingPageProps {
  account: Account;
  /** True when arriving from an invite link, so the copy can say so. */
  invited?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ account, invited = false }) => {
  const signInRef = useRef<HTMLDivElement | null>(null);
  const stackRef = useRef<HTMLDivElement | null>(null);
  const [order, setOrder] = useState([0, 1, 2, 3]);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [signInError, setSignInError] = useState<string | null>(null);

  // Send the front card to the back.
  const shuffle = useCallback(() => {
    setOrder((current) => [...current.slice(1), current[0]]);
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = stackRef.current?.getBoundingClientRect();
    if (!box) return;
    // -1..1 from the centre, then a few degrees of lean.
    setTilt({
      x: ((event.clientY - (box.top + box.height / 2)) / box.height) * -6,
      y: ((event.clientX - (box.left + box.width / 2)) / box.width) * 8
    });
  };

  useEffect(() => {
    const parent = signInRef.current;
    if (!parent) return;
    let cancelled = false;
    void renderGoogleSignIn({
      parent,
      clientId: account.config.googleClientId,
      onCredential: (credential) => {
        if (!cancelled) void account.signInWithCredential(credential);
      },
      onError: (reason) => {
        if (!cancelled) setSignInError(reason);
      }
    }).catch(() => setSignInError('Google sign-in could not be loaded. Please reload and try again.'));
    return () => {
      cancelled = true;
    };
  }, [account.config.googleClientId, account.signInWithCredential]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#FAF9F6] px-6 py-10 text-center">
      {/* Drifting hearts. Decorative only, and still under prefers-reduced-motion. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {HEARTS.map((heart, index) => (
          <Heart
            key={index}
            className="heart-drift absolute text-[#FF6B6B]"
            style={{
              left: heart.left,
              bottom: '-40px',
              width: heart.size,
              height: heart.size,
              opacity: heart.opacity,
              fill: 'currentColor',
              animationDelay: heart.delay,
              animationDuration: heart.duration
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="mb-4 flex h-14 w-14 -rotate-6 items-center justify-center rounded-2xl bg-[#FF6B6B] shadow-md">
          <Camera className="h-7 w-7 text-white" />
        </div>

        <h1 className="text-4xl font-black tracking-tighter text-[#FF6B6B] sm:text-5xl">STRIPLY</h1>
        <p className="mt-3 text-balance text-lg font-bold leading-snug text-[#2D2D2D]">
          Take photos together, apart.
        </p>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#666666]">
          {invited
            ? 'Someone is waiting for you in a photo booth. Sign up to join them.'
            : 'Vintage photo booth strips, made with someone you miss.'}
        </p>

        {/* Interactive strip stack */}
        <div
          ref={stackRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setTilt({ x: 0, y: 0 })}
          onClick={shuffle}
          role="button"
          tabIndex={0}
          aria-label="Shuffle the photo strip previews"
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              shuffle();
            }
          }}
          // Height follows the viewport so the sign-in button stays above the
          // fold on a short screen. A gate whose only door is below the fold is
          // worse than no gate.
          className="relative mt-5 h-[min(15rem,32dvh)] w-full cursor-pointer select-none focus:outline-none sm:mt-7"
          style={{ perspective: '900px' }}
        >
          {STRIP_PREVIEWS.map((preview, index) => {
            const position = order.indexOf(index);
            const layout = CARD_LAYOUT[position] ?? CARD_LAYOUT[CARD_LAYOUT.length - 1];
            return (
              <img
                key={preview.src}
                src={preview.src}
                alt={preview.alt}
                loading={position === 0 ? 'eager' : 'lazy'}
                className="absolute left-1/2 top-0 h-full w-auto rounded-xl border border-white/70 shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-transform duration-500 ease-out"
                style={{
                  zIndex: STRIP_PREVIEWS.length - position,
                  transform: `translateX(-50%) translate(${layout.x}px, ${layout.y}px) rotate(${layout.rotate}deg) scale(${layout.scale}) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
                }}
              />
            );
          })}
        </div>
        <p className="mt-9 text-[10px] font-semibold text-[#999]">Tap the strips to flip through templates</p>

        {/* Sign up */}
        <div className="mt-5 flex flex-col items-center gap-3 sm:mt-6">
          <div>
            <p className="text-base font-black leading-snug text-[#2D2D2D]">
              Make a memory you can hold.
            </p>
            <p className="mt-1 text-xs text-[#666666]">
              Sign up below and you&rsquo;re straight into the booth.
            </p>
          </div>
          <div ref={signInRef} />
          {account.busy && <Loader2 className="h-4 w-4 animate-spin text-[#FF6B6B]" />}
        </div>

        {(signInError || account.error) && (
          <p role="alert" className="mt-3 max-w-xs rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {account.error ?? signInError}
          </p>
        )}

        {/* Shown to everyone rather than on failure. Google opens sign-in in a
            pop-up, and when an extension or blocker swallows it the library
            reports nothing this code can hook -- error_callback does not fire, so
            the button simply appears dead. A standing hint beats a silent wall. */}
        <p className="mt-3 max-w-[17rem] text-[11px] leading-relaxed text-[#999]">
          Nothing happens when you tap it? Allow pop-ups for this site, or try a
          private window &mdash; an extension may be blocking the Google window.
        </p>

        <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-[#999]">
          Free &middot; Your strips follow you to any device
        </p>
      </div>
    </div>
  );
};
