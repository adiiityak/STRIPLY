import React from 'react';

const NUDGE_STEP = 16;

interface ResizeHandleProps {
  width: number;
  minWidth: number;
  maxWidth: number;
  /** id of the region this separator resizes, per the APG window-splitter pattern. */
  controlsId: string;
  onResize: (px: number) => void;
  onNudge: (delta: number) => void;
  onReset: () => void;
}

export function ResizeHandle({
  width,
  minWidth,
  maxWidth,
  controlsId,
  onResize,
  onNudge,
  onReset
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  // Pointer capture keeps the drag alive once the cursor leaves the 11px hit area.
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    // The panel is right-anchored, so dragging left widens it.
    onResize(window.innerWidth - event.clientX);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (!isDragging) return;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onNudge(NUDGE_STEP);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onNudge(-NUDGE_STEP);
    } else if (event.key === 'Home') {
      event.preventDefault();
      onResize(minWidth);
    } else if (event.key === 'End') {
      event.preventDefault();
      onResize(maxWidth);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize controls sidebar"
      aria-controls={controlsId}
      aria-valuenow={width}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      title="Drag to resize. Double-click to reset."
      className="hidden lg:block absolute left-0 top-0 h-full w-[11px] -translate-x-1/2 z-30 cursor-col-resize group touch-none focus-visible:outline-none"
    >
      {/* The native outline is suppressed, so the bar itself is the focus indicator: it both
          colours and widens on focus so a keyboard user can actually see where they are. */}
      <div
        className={`mx-auto h-full rounded-full transition-all ${
          isDragging
            ? 'w-[7px] bg-[#FF6B6B]'
            : 'w-[5px] bg-transparent group-hover:bg-[#FF6B6B]/40 group-focus-visible:w-[7px] group-focus-visible:bg-[#FF6B6B]'
        }`}
      />
    </div>
  );
}
