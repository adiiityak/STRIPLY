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
 */
export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ value }) => {
  if (value === null) return null;

  return (
    <div
      data-testid="countdown-overlay"
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs"
    >
      <div className="text-7xl font-black text-[#FF6B6B] animate-ping drop-shadow-md">
        {value === 0 ? '📸 SNAP!' : value}
      </div>
    </div>
  );
};
