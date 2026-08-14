import { constrainImageDimensions } from '../utils/exportUtils';
import { removeBackground } from './backgroundRemoval';

/**
 * Frames travel to the partner through the signalling socket, which rejects
 * anything over 900,000 data-URL characters (~675KB). A 1280px frame at q0.88
 * can cross that on a busy shared background, and the rejection was silent, so
 * the shot appeared on the shooting device and nowhere else. These values leave
 * real headroom while staying well above the printed strip's needs.
 */
const CAPTURE_MAX_EDGE = 1_080;
const CAPTURE_QUALITY = 0.82;

export interface CoverCrop {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export function computeCoverCrop(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number): CoverCrop {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  if (sourceRatio > targetRatio) {
    const sw = sourceHeight * targetRatio;
    return { sx: (sourceWidth - sw) / 2, sy: 0, sw, sh: sourceHeight };
  }
  const sh = sourceWidth / targetRatio;
  return { sx: 0, sy: (sourceHeight - sh) / 2, sw: sourceWidth, sh };
}

type CaptureSource = HTMLVideoElement | HTMLCanvasElement;

function sourceDimensions(source: CaptureSource) {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth || 640, height: source.videoHeight || 480 };
  }
  return { width: source.width, height: source.height };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load the shared background.'));
    image.src = url;
  });
}

function drawCover(
  context: CanvasRenderingContext2D,
  source: CaptureSource | HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  mirror = false
) {
  const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth || 640 : source.width;
  const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight || 480 : source.height;
  const crop = computeCoverCrop(sourceWidth, sourceHeight, width, height);
  context.save();
  if (mirror) {
    context.translate(x + width, y);
    context.scale(-1, 1);
    context.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
  } else {
    context.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, x, y, width, height);
  }
  context.restore();
}

interface ComposeRemoteFrameOptions {
  localSource: CaptureSource;
  remoteSource: CaptureSource;
  backgroundUrl?: string;
  width?: number;
  height?: number;
  localOnLeft?: boolean;
  removeSourceBackgrounds?: boolean;
}

export async function composeRemoteFrame({
  localSource,
  remoteSource,
  backgroundUrl,
  width = 1280,
  height = 960,
  localOnLeft = true,
  removeSourceBackgrounds = false
}: ComposeRemoteFrameOptions): Promise<string> {
  const bounded = constrainImageDimensions(width, height, CAPTURE_MAX_EDGE);
  const canvas = document.createElement('canvas');
  canvas.width = bounded.width;
  canvas.height = bounded.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');

  context.fillStyle = removeSourceBackgrounds ? '#F7F4EF' : '#171717';
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (backgroundUrl) {
    try {
      drawCover(context, await loadImage(backgroundUrl), 0, 0, canvas.width, canvas.height);
    } catch {
      // A failed optional background never blocks a capture.
    }
  }

  const half = canvas.width / 2;
  const localX = localOnLeft ? 0 : half;
  const remoteX = localOnLeft ? half : 0;
  let preparedLocal: CaptureSource = localSource;
  let preparedRemote: CaptureSource = remoteSource;
  if (removeSourceBackgrounds) {
    try {
      [preparedLocal, preparedRemote] = await Promise.all([
        removeBackground(localSource),
        removeBackground(remoteSource)
      ]);
    } catch {
      // Removal is an optional enhancement. Preserve the original feeds if the
      // model cannot initialize or run on this browser/device.
    }
  }
  drawCover(context, preparedLocal, localX, 0, half, canvas.height, true);
  drawCover(context, preparedRemote, remoteX, 0, half, canvas.height);
  context.fillStyle = 'rgba(255,255,255,.72)';
  context.fillRect(half - 1, 0, 2, canvas.height);
  return canvas.toDataURL('image/jpeg', CAPTURE_QUALITY);
}

export function getCaptureSourceDimensions(source: CaptureSource) {
  return sourceDimensions(source);
}
