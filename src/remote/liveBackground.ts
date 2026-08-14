import type { ImageSegmenter as MediaPipeImageSegmenter } from '@mediapipe/tasks-vision';
import { isForegroundCategory } from './backgroundRemoval';

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';

/** Backdrop drawn behind a cut-out person when no image is chosen. */
export const REMOVED_BACKDROP = '#F7F4EF';

/** Total segmentations per second across every feed on screen. */
const TARGET_INTERVAL_MS = 1000 / 15;
/** Cadence fallen back to when a device cannot hold the target. */
const DEGRADED_INTERVAL_MS = 1000 / 8;
/** A segmentation slower than this counts as a struggle. */
const SLOW_FRAME_MS = 120;
/** Consecutive slow segmentations before easing off. */
const SLOW_FRAMES_BEFORE_DEGRADING = 5;
/** Consecutive slow segmentations at the degraded cadence before giving up. */
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

interface Source extends LiveBackgroundOptions {
  backgroundImage: HTMLImageElement | null;
  announcedFirstFrame: boolean;
  frameCanvas: HTMLCanvasElement;
  frameContext: CanvasRenderingContext2D;
  maskCanvas: HTMLCanvasElement;
  maskContext: CanvasRenderingContext2D;
  outputContext: CanvasRenderingContext2D;
}

/**
 * Every live feed on screen shares one segmenter, one clock and one loop.
 *
 * MediaPipe's video-mode segmenter is single-stream stateful and requires
 * monotonically increasing timestamps. Two feeds calling it concurrently -- the
 * room shows yours and your partner's -- each kept their own timestamp counter,
 * so the two streams collided and most frames were rejected: the background
 * appeared occasionally and was missing the rest of the time. Serialising the
 * feeds through one scheduler also costs far less on a phone than giving each
 * feed its own model instance.
 */
const sources = new Set<Source>();
let loopHandle = 0;
let lastRunAt = 0;
let lastTimestamp = 0;
let interval = TARGET_INTERVAL_MS;
let slowFrames = 0;
let cursor = 0;
let activeSegmenter: MediaPipeImageSegmenter | null = null;

/**
 * One clock for every feed.
 *
 * The shared segmenter rejects a timestamp that does not advance, so per-feed
 * counters made two feeds collide and most frames were dropped.
 */
export function nextSegmentationTimestamp(): number {
  lastTimestamp += 1;
  return lastTimestamp;
}

/**
 * Picks the feed to segment next, rotating so one can never starve the other.
 */
export function selectNextSource<T>(list: readonly T[], cursor: number): { source?: T; nextCursor: number } {
  if (list.length === 0) return { nextCursor: 0 };
  const index = cursor % list.length;
  return { source: list[index], nextCursor: (index + 1) % list.length };
}

function stopSource(source: Source, reason?: 'unsupported' | 'too-slow') {
  if (!sources.has(source)) return;
  sources.delete(source);
  if (sources.size === 0 && loopHandle) {
    cancelAnimationFrame(loopHandle);
    loopHandle = 0;
  }
  if (reason) source.onInactive?.(reason);
}

function stopAll(reason: 'unsupported' | 'too-slow') {
  for (const source of [...sources]) stopSource(source, reason);
}

function renderSource(segmenter: MediaPipeImageSegmenter, source: Source) {
  const { video, canvas, frameCanvas, frameContext, maskCanvas, maskContext, outputContext } = source;
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    frameCanvas.width = width;
    frameCanvas.height = height;
  }

  frameContext.globalCompositeOperation = 'source-over';
  frameContext.drawImage(video, 0, 0, width, height);

  const timestamp = nextSegmentationTimestamp();

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

    outputContext.globalCompositeOperation = 'source-over';
    if (source.backgroundImage) {
      drawCover(
        outputContext,
        source.backgroundImage,
        source.backgroundImage.naturalWidth,
        source.backgroundImage.naturalHeight,
        width,
        height
      );
    } else {
      outputContext.fillStyle = REMOVED_BACKDROP;
      outputContext.fillRect(0, 0, width, height);
    }

    frameContext.globalCompositeOperation = 'destination-in';
    frameContext.drawImage(maskCanvas, 0, 0, width, height);
    frameContext.globalCompositeOperation = 'source-over';
    outputContext.drawImage(frameCanvas, 0, 0);

    if (!source.announcedFirstFrame) {
      source.announcedFirstFrame = true;
      source.onFirstFrame?.();
    }
  });
}

function tick() {
  loopHandle = requestAnimationFrame(tick);
  if (!activeSegmenter || sources.size === 0) return;

  const now = performance.now();
  if (now - lastRunAt < interval) return;
  lastRunAt = now;

  const picked = selectNextSource([...sources], cursor);
  cursor = picked.nextCursor;
  const source = picked.source;
  if (!source) return;

  const startedAt = performance.now();
  try {
    renderSource(activeSegmenter, source);
  } catch {
    stopAll('unsupported');
    return;
  }
  const elapsed = performance.now() - startedAt;

  if (elapsed > SLOW_FRAME_MS) {
    slowFrames += 1;
    if (interval === TARGET_INTERVAL_MS && slowFrames >= SLOW_FRAMES_BEFORE_DEGRADING) {
      interval = DEGRADED_INTERVAL_MS;
    } else if (slowFrames >= SLOW_FRAMES_BEFORE_GIVING_UP) {
      // Better an honest live feed than a stuttering composite.
      stopAll('too-slow');
    }
  } else {
    slowFrames = 0;
  }
}

/**
 * Composites a live camera feed over a chosen background, in place.
 *
 * Feeds register with a shared scheduler rather than each running their own loop
 * (see the note on `sources`). If the model cannot load or the device cannot keep
 * up, `onInactive` fires and the caller shows the untouched feed.
 */
export function startLiveBackground(options: LiveBackgroundOptions) {
  const { canvas, backgroundUrl } = options;
  const frameCanvas = document.createElement('canvas');
  const frameContext = frameCanvas.getContext('2d', { willReadFrequently: true });
  const maskCanvas = document.createElement('canvas');
  const maskContext = maskCanvas.getContext('2d');
  const outputContext = canvas.getContext('2d');

  if (!frameContext || !maskContext || !outputContext) {
    options.onInactive?.('unsupported');
    return { stop: () => {} };
  }

  const source: Source = {
    ...options,
    backgroundImage: null,
    announcedFirstFrame: false,
    frameCanvas,
    frameContext,
    maskCanvas,
    maskContext,
    outputContext
  };

  let cancelled = false;

  void (async () => {
    try {
      if (backgroundUrl) source.backgroundImage = await loadImage(backgroundUrl);
    } catch {
      // A missing image is not fatal; fall through to the plain backdrop.
      source.backgroundImage = null;
    }

    let segmenter: MediaPipeImageSegmenter;
    try {
      segmenter = await getVideoSegmenter();
    } catch {
      if (!cancelled) options.onInactive?.('unsupported');
      return;
    }
    if (cancelled) return;

    activeSegmenter = segmenter;
    sources.add(source);
    if (!loopHandle) {
      lastRunAt = 0;
      loopHandle = requestAnimationFrame(tick);
    }
  })();

  return {
    stop: () => {
      cancelled = true;
      stopSource(source);
    }
  };
}

/** Test seam: forget every registered feed and stop the shared loop. */
export function resetLiveBackgroundForTests() {
  for (const source of [...sources]) sources.delete(source);
  if (loopHandle) cancelAnimationFrame(loopHandle);
  loopHandle = 0;
  lastRunAt = 0;
  lastTimestamp = 0;
  interval = TARGET_INTERVAL_MS;
  slowFrames = 0;
  cursor = 0;
  activeSegmenter = null;
}
