import React from 'react';

interface CountdownOverlayProps {
  /** Seconds remaining, 0 for the shutter moment, or null to show nothing. */
  value: number | null;
}

/**
 * The countdown shown over a live camera feed.
 *
 * Shared by the solo booth and the long-distance room so a shot is counted in the
 * same way wherever it is taken. The room previously drew its own flat white
 * numeral with no animation.
 *
 * Nothing here dims or blurs the frame. A countdown exists so you can pose, and
 * you pose by watching your own face -- an overlay that obscures the feed defeats
 * the only reason it is on screen. The numeral earns its contrast from a shadow
 * instead, which costs the feed nothing. A scrim would be worst of all directly
 * behind the digit, since that is exactly where the face is.
 */
export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ value }) => {
  if (value === null) return null;

  return (
    <div
      data-testid="countdown-overlay"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      <div className="relative flex items-center justify-center">
        {/* The pulse rides on a ring behind the numeral. animate-ping finishes at
            opacity 0, so animating the digit itself left the count invisible for
            part of every second -- no use to someone waiting for the shutter. */}
        <span
          aria-hidden="true"
          className="absolute h-28 w-28 rounded-full bg-[#FF6B6B]/30 animate-ping"
        />
        <span
          className="relative text-7xl font-black text-[#FF6B6B]"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.85)' }}
        >
          {value === 0 ? '📸 SNAP!' : value}
        </span>
      </div>
    </div>
  );
};
