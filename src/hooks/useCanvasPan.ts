import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Movement in px before a press counts as a pan rather than a click. */
export const DRAG_THRESHOLD = 4;

interface UseCanvasPanOptions {
  /** Presses starting inside an element matching this selector never pan. */
  ignoreSelector?: string;
}

/**
 * Hand-tool panning for a scroll container.
 *
 * Panning moves scrollLeft/scrollTop rather than applying a transform. The canvas already sizes
 * its wrapper to (natural size x zoom), so the scroll extents match the painted strip exactly:
 * scroll-anchored panning is therefore bounded for free and cannot strand the strip off-screen.
 * A translate() pan would fight that wrapper sizing and re-introduce the unreachable-overflow
 * bug fixed in 2b90b64.
 */
export function useCanvasPan(
  containerRef: RefObject<HTMLElement | null>,
  options: UseCanvasPanOptions = {}
) {
  const { ignoreSelector } = options;
  const [isPanning, setIsPanning] = useState(false);
  const [canPan, setCanPan] = useState(false);

  // Gesture bookkeeping lives in a ref so pointermove never re-renders per frame.
  const gesture = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
    moved: boolean;
  } | null>(null);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setCanPan(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
  }, [containerRef]);

  // Whether anything can pan changes with zoom, photo count and template, so watch the box
  // rather than computing it once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // The strip wrapper resizes independently of the container when zoom changes.
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [containerRef, measure]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return; // primary button only
      const target = event.target as Element | null;
      if (ignoreSelector && target?.closest?.(ignoreSelector)) return;

      gesture.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: el.scrollLeft,
        startScrollTop: el.scrollTop,
        moved: false
      };
      el.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      const g = gesture.current;
      if (!g || event.pointerId !== g.pointerId) return;
      const dx = event.clientX - g.startX;
      const dy = event.clientY - g.startY;

      if (!g.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      if (!g.moved) {
        g.moved = true;
        setIsPanning(true);
      }
      // Dragging the strip right reveals content to its left, so scroll decreases.
      el.scrollLeft = g.startScrollLeft - dx;
      el.scrollTop = g.startScrollTop - dy;
    };

    const endGesture = (event: PointerEvent) => {
      const g = gesture.current;
      if (!g || event.pointerId !== g.pointerId) return;
      if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);

      // A drag across a photo must not also open that photo's edit modal, so swallow the
      // click this pointer sequence is about to emit. One-shot, capture phase.
      if (g.moved) {
        const swallow = (click: MouseEvent) => {
          click.stopPropagation();
          click.preventDefault();
        };
        el.addEventListener('click', swallow, { capture: true, once: true });
        // If no click follows (e.g. pointercancel), don't leave the listener armed.
        window.setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0);
      }

      gesture.current = null;
      setIsPanning(false);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endGesture);
    el.addEventListener('pointercancel', endGesture);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endGesture);
      el.removeEventListener('pointercancel', endGesture);
    };
  }, [containerRef, ignoreSelector]);

  /** Centre the strip in the container, used by the zoom Reset control. */
  const centre = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
    el.scrollTop = Math.max(0, (el.scrollHeight - el.clientHeight) / 2);
  }, [containerRef]);

  return { isPanning, canPan, centre };
}
