import { useEffect, useRef, useState, type RefObject } from 'react';
import type { SharedBackground } from './types';
import { startLiveBackground } from './liveBackground';

/** The image behind the person, or null when the person is cut out onto a plain backdrop. */
export function backgroundImageUrl(background: SharedBackground): string | null {
  if (background.mode === 'preset' || background.mode === 'uploaded') return background.value ?? null;
  return null;
}

/**
 * Shows the chosen background behind a live camera feed.
 *
 * The video element stays mounted as the segmentation source and is simply hidden
 * while the composite is on screen. If the model cannot load or the device cannot
 * keep up, `active` goes false and the caller shows the untouched feed instead.
 */
export function useLiveBackground(
  video: RefObject<HTMLVideoElement | null>,
  background: SharedBackground,
  enabled = true
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<'unsupported' | 'too-slow' | null>(null);

  const wanted = enabled && background.mode !== 'original';
  const url = backgroundImageUrl(background);

  useEffect(() => {
    if (!wanted) {
      setRunning(false);
      setReady(false);
      setFallbackReason(null);
      return;
    }
    const element = video.current;
    const canvas = canvasRef.current;
    if (!element || !canvas) return;

    setFallbackReason(null);
    setRunning(true);
    setReady(false);
    const handle = startLiveBackground({
      video: element,
      canvas,
      backgroundUrl: url,
      onFirstFrame: () => setReady(true),
      onInactive: (reason) => {
        setRunning(false);
        setReady(false);
        setFallbackReason(reason);
      }
    });
    return () => handle.stop();
  }, [wanted, url, video]);

  return {
    canvasRef,
    /** Show the canvas only once it holds a real frame, never before. */
    active: running && ready,
    /** Running but not yet showing anything - the model is still being fetched. */
    preparing: running && !ready,
    fallbackReason
  };
}
