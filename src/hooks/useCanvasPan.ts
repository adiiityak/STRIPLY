import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Movement in px before a press counts as a pan rather than a click. */
export const DRAG_THRESHOLD = 4;

/**
 * How much one wheel notch of a pinch changes zoom.
 *
 * Applied exponentially, so each notch is a constant proportion and the gesture
 * feels the same at 40% as at 300%.
 */
export const WHEEL_ZOOM_SENSITIVITY = 0.01;

/**
 * A wheel/pinch stream has no end event, so idleness is what ends the gesture.
 * Long enough to bridge the gap between notches, short enough that the zoom
 * animation is back before a button press needs it.
 */
const ZOOM_IDLE_MS = 180;

export function zoomFromWheelDelta(zoom: number, deltaY: number): number {
  return zoom * Math.exp(-deltaY * WHEEL_ZOOM_SENSITIVITY);
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

interface UseCanvasPanOptions {
  /** Presses starting inside an element matching this selector never pan. */
  ignoreSelector?: string;
  /** Current zoom, needed so a pinch scales from where it started. */
  zoom?: number;
  /** Called with the new zoom during a two-finger pinch. Clamping is the caller's job. */
  onZoom?: (zoom: number) => void;
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
  const { ignoreSelector, zoom, onZoom } = options;
  const [isPanning, setIsPanning] = useState(false);
  const [canPan, setCanPan] = useState(false);
  const [isZooming, setIsZooming] = useState(false);

  // Mirrored in a ref so the raw listeners can check the flag without re-binding,
  // and so a stream of wheel events sets state once rather than per notch.
  const zooming = useRef(false);
  const zoomIdleTimer = useRef<number | null>(null);

  // Live values for the pointer handlers, which are bound once and must not close over
  // a stale zoom or callback.
  const zoomRef = useRef(zoom ?? 1);
  const onZoomRef = useRef(onZoom);
  zoomRef.current = zoom ?? 1;
  onZoomRef.current = onZoom;

  /** Active pointers, so a second finger can start a pinch. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ startDistance: number; startZoom: number } | null>(null);

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

    /**
     * Marks a zoom gesture as live, and keeps it live until the notches stop.
     *
     * Callers use this to drop the strip's zoom transition: a 200ms tween is right
     * for a button press but makes a gesture lag behind the fingers, which reads
     * as the zoom being broken rather than smoothed.
     */
    const markZooming = () => {
      if (!zooming.current) {
        zooming.current = true;
        setIsZooming(true);
      }
      if (zoomIdleTimer.current !== null) window.clearTimeout(zoomIdleTimer.current);
      zoomIdleTimer.current = window.setTimeout(() => {
        zooming.current = false;
        zoomIdleTimer.current = null;
        setIsZooming(false);
      }, ZOOM_IDLE_MS);
    };

    const onWheel = (event: WheelEvent) => {
      // A trackpad pinch arrives as a wheel event with ctrlKey set. There is no
      // second pointer to find, which is why the pointer pinch below never fired
      // for a touchpad; Ctrl/Cmd + wheel is the same gesture with a mouse.
      if (!onZoomRef.current || (!event.ctrlKey && !event.metaKey)) return;
      // Without this the browser zooms the whole page instead of the strip.
      event.preventDefault();

      const rect = el.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      // What sits under the cursor, as a fraction of the content. Ratios need no
      // knowledge of the zoom factor or of how the wrapper sizes itself, so the
      // same point can be restored once the strip has resized.
      const ratioX = el.scrollWidth > 0 ? (el.scrollLeft + offsetX) / el.scrollWidth : 0;
      const ratioY = el.scrollHeight > 0 ? (el.scrollTop + offsetY) / el.scrollHeight : 0;

      markZooming();
      onZoomRef.current(zoomFromWheelDelta(zoomRef.current, event.deltaY));

      // The wrapper takes its new size on the next render; put the cursor's point
      // back once it has, so the strip grows around the pointer rather than out of
      // the top-left corner.
      requestAnimationFrame(() => {
        el.scrollLeft = clamp(
          ratioX * el.scrollWidth - offsetX,
          0,
          Math.max(0, el.scrollWidth - el.clientWidth)
        );
        el.scrollTop = clamp(
          ratioY * el.scrollHeight - offsetY,
          0,
          Math.max(0, el.scrollHeight - el.clientHeight)
        );
      });
    };

    const distanceBetweenPointers = () => {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return 0;
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return; // primary button only
      const target = event.target as Element | null;
      if (ignoreSelector && target?.closest?.(ignoreSelector)) return;

      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      // Second finger down: stop panning and start a pinch from the current spread.
      if (pointers.current.size === 2 && onZoomRef.current) {
        gesture.current = null;
        setIsPanning(false);
        pinch.current = { startDistance: distanceBetweenPointers(), startZoom: zoomRef.current };
        return;
      }
      if (pointers.current.size !== 1) return;

      gesture.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: el.scrollLeft,
        startScrollTop: el.scrollTop,
        moved: false
      };
      // Deliberately NOT capturing the pointer yet. While a pointer is captured the browser
      // fires the following `click` at the capturing element, so capturing on every press made
      // clicks land on <main> instead of the photo and the photo editor never opened. Capture is
      // taken only once the press is confirmed to be a drag, below.
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointers.current.has(event.pointerId)) {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }

      // Pinch takes precedence: two fingers zoom rather than pan.
      if (pinch.current && pointers.current.size >= 2) {
        const distance = distanceBetweenPointers();
        if (distance > 0 && pinch.current.startDistance > 0) {
          markZooming();
          onZoomRef.current?.((pinch.current.startZoom * distance) / pinch.current.startDistance);
        }
        return;
      }

      const g = gesture.current;
      if (!g || event.pointerId !== g.pointerId) return;
      const dx = event.clientX - g.startX;
      const dy = event.clientY - g.startY;

      if (!g.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      if (!g.moved) {
        g.moved = true;
        setIsPanning(true);
        // Now that this is definitely a pan, capture so the gesture survives the pointer
        // leaving the container. Taking capture here rather than on pointerdown keeps plain
        // clicks retargeting normally to the photo underneath.
        try {
          el.setPointerCapture(event.pointerId);
        } catch {
          // Pointer already gone; the move handler simply stops receiving events.
        }
      }
      // Dragging the strip right reveals content to its left, so scroll decreases.
      el.scrollLeft = g.startScrollLeft - dx;
      el.scrollTop = g.startScrollTop - dy;
    };

    const endGesture = (event: PointerEvent) => {
      pointers.current.delete(event.pointerId);
      // Lifting one finger ends the pinch; the remaining finger does not resume panning,
      // otherwise the strip jumps as the pinch unwinds.
      if (pinch.current && pointers.current.size < 2) {
        pinch.current = null;
        gesture.current = null;
        setIsPanning(false);
        return;
      }

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
    // Not passive: the handler has to preventDefault to stop the browser zooming
    // the page, and a passive listener may not.
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endGesture);
      el.removeEventListener('pointercancel', endGesture);
      el.removeEventListener('wheel', onWheel);
      if (zoomIdleTimer.current !== null) window.clearTimeout(zoomIdleTimer.current);
    };
  }, [containerRef, ignoreSelector]);

  /** Centre the strip in the container, used by the zoom Reset control. */
  const centre = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
    el.scrollTop = Math.max(0, (el.scrollHeight - el.clientHeight) / 2);
  }, [containerRef]);

  return { isPanning, canPan, centre, isZooming };
}
