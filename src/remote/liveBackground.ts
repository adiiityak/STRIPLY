import type { ImageSegmenter as MediaPipeImageSegmenter } from '@mediapipe/tasks-vision';
import { isForegroundCategory } from './backgroundRemoval';

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';

/** Backdrop drawn behind a cut-out person when no image is chosen. */
export const REMOVED_BACKDROP = '#F7F4EF';

/** Target cadence. Segmentation is far too costly to attempt every frame. */
const TARGET_INTERVAL_MS = 1000 / 15;
/** Cadence fallen back to when a device cannot hold the target. */
const DEGRADED_INTERVAL_MS = 1000 / 8;
/** A frame slower than this counts as a struggle. */
const SLOW_FRAME_MS = 120;
/** Consecutive slow frames before easing off. */
const SLOW_FRAMES_BEFORE_DEGRADING = 5;
/** Consecutive slow frames at the degraded cadence before giving up entirely. */
const SLOW_FRAMES_BEFORE_GIVING_UP = 15;

let segmenterPromise: Promise<MediaPipeImageSegmenter> | null = null;

async function getVideoSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = import('@mediapipe/tasks-vision')
      .then(async ({ FilesetResolver, ImageSegmenter }) => {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        return ImageSegmenter.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_PATH },
          outputCategoryMask: true,
          outputConfidenceMasks: false,
          runningMode: 'VIDEO'
        });
      })
      .catch((error) => {
        segmenterPromise = null;
        throw error;
      });
  }
  return segmenterPromise;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load the background image.'));
    image.src = url;
  });
}

/** Draws a source cropped to fill the target box, preserving aspect ratio. */
function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number
) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;
  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }
  context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
}

export interface LiveBackgroundOptions {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  /** Image URL to sit behind the person, or null for a plain backdrop. */
  backgroundUrl: string | null;
  /** Called when the effect stops driving the canvas, so callers can show raw video. */
  onInactive?: (reason: 'unsupported' | 'too-slow') => void;
  /**
   * Called once the canvas holds a real composited frame. The model can take
   * several seconds to fetch on a first run, and swapping to an empty canvas
   * before then would blank the feed for the whole wait.
   */
  onFirstFrame?: () => void;
}

/**
 * Composites a live camera feed over a chosen background, in place, at a capped
 * frame rate.
 *
 * Segmentation is far too expensive to run per displayed frame, so this holds a
 * target cadence, eases off if the device struggles, and stops altogether rather
 * than presenting a slideshow -- callers fall back to the untouched feed. Every
 * working canvas is allocated once and reused; allocating per frame is what makes
 * naive versions of this unusable on phones.
 */
export function startLiveBackground({
  video,
  canvas,
  backgroundUrl,
  onInactive,
  onFirstFrame
}: LiveBackgroundOptions) {
  let stopped = false;
  let announcedFirstFrame = false;
  let frameHandle = 0;
  let lastRenderedAt = 0;
  let interval = TARGET_INTERVAL_MS;
  let slowFrames = 0;
  let lastTimestamp = -1;
  let backgroundImage: HTMLImageElement | null = null;

  // Reused across frames.
  const frameCanvas = document.createElement('canvas');
  const frameContext = frameCanvas.getContext('2d', { willReadFrequently: true });
  const maskCanvas = document.createElement('canvas');
  const maskContext = maskCanvas.getContext('2d');
  const outputContext = canvas.getContext('2d');

  const stop = (reason?: 'unsupported' | 'too-slow') => {
    if (stopped) return;
    stopped = true;
    if (frameHandle) cancelAnimationFrame(frameHandle);
    if (reason) onInactive?.(reason);
  };

  if (!frameContext || !maskContext || !outputContext) {
    stop('unsupported');
    return { stop: () => {} };
  }

  const renderOnce = (segmenter: MediaPipeImageSegmenter, nowMs: number) => {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      frameCanvas.width = width;
      frameCanvas.height = height;
    }

    frameContext.drawImage(video, 0, 0, width, height);

    // segmentForVideo requires strictly increasing timestamps.
    const timestamp = Math.max(lastTimestamp + 1, Math.round(nowMs));
    lastTimestamp = timestamp;

    segmenter.segmentForVideo(frameCanvas, timestamp, (result) => {
      const mask = result.categoryMask;
      if (!mask) {
        result.close();
        return;
      }

      const categories = mask.getAsUint8Array();
      if (maskCanvas.width !== mask.width || maskCanvas.height !== mask.height) {
        maskCanvas.width = mask.width;
        maskCanvas.height = mask.height;
      }
      const pixels = maskContext.createImageData(mask.width, mask.height);
      for (let index = 0; index < categories.length; index += 1) {
        const offset = index * 4;
        pixels.data[offset] = 255;
        pixels.data[offset + 1] = 255;
        pixels.data[offset + 2] = 255;
        pixels.data[offset + 3] = isForegroundCategory(categories[index]) ? 255 : 0;
      }
      maskContext.putImageData(pixels, 0, 0);
      result.close();

      // Background first.
      outputContext.globalCompositeOperation = 'source-over';
      if (backgroundImage) {
        drawCover(
          outputContext,
          backgroundImage,
          backgroundImage.naturalWidth,
          backgroundImage.naturalHeight,
          width,
          height
        );
      } else {
        outputContext.fillStyle = REMOVED_BACKDROP;
        outputContext.fillRect(0, 0, width, height);
      }

      // Then the person, cut out of the camera frame.
      frameContext.globalCompositeOperation = 'destination-in';
      frameContext.drawImage(maskCanvas, 0, 0, width, height);
      frameContext.globalCompositeOperation = 'source-over';
      outputContext.drawImage(frameCanvas, 0, 0);

      if (!announcedFirstFrame) {
        announcedFirstFrame = true;
        onFirstFrame?.();
      }
    });
  };

  void (async () => {
    try {
      if (backgroundUrl) backgroundImage = await loadImage(backgroundUrl);
    } catch {
      // A missing image is not fatal; fall through to the plain backdrop.
      backgroundImage = null;
    }

    let segmenter: MediaPipeImageSegmenter;
    try {
      segmenter = await getVideoSegmenter();
    } catch {
      stop('unsupported');
      return;
    }
    if (stopped) return;

    const loop = () => {
      if (stopped) return;
      frameHandle = requestAnimationFrame(loop);

      const now = performance.now();
      if (now - lastRenderedAt < interval) return;
      lastRenderedAt = now;

      const startedAt = performance.now();
      try {
        renderOnce(segmenter, now);
      } catch {
        stop('unsupported');
        return;
      }
      const elapsed = performance.now() - startedAt;

      if (elapsed > SLOW_FRAME_MS) {
        slowFrames += 1;
        if (interval === TARGET_INTERVAL_MS && slowFrames >= SLOW_FRAMES_BEFORE_DEGRADING) {
          interval = DEGRADED_INTERVAL_MS;
        } else if (slowFrames >= SLOW_FRAMES_BEFORE_GIVING_UP) {
          // Better an honest live feed than a stuttering composite.
          stop('too-slow');
        }
      } else {
        slowFrames = 0;
      }
    };

    frameHandle = requestAnimationFrame(loop);
  })();

  return { stop: () => stop() };
}
