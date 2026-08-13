import type { ImageSegmenter as MediaPipeImageSegmenter } from '@mediapipe/tasks-vision';

type SegmentSource = HTMLVideoElement | HTMLCanvasElement;

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';

let segmenterPromise: Promise<MediaPipeImageSegmenter> | null = null;

export function isForegroundCategory(category: number) {
  return category !== 0;
}

async function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = import('@mediapipe/tasks-vision')
      .then(async ({ FilesetResolver, ImageSegmenter }) => {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        return ImageSegmenter.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_PATH },
          outputCategoryMask: true,
          outputConfidenceMasks: false,
          runningMode: 'IMAGE'
        });
      })
      .catch((error) => {
        segmenterPromise = null;
        throw error;
      });
  }
  return segmenterPromise;
}

function dimensions(source: SegmentSource) {
  return source instanceof HTMLVideoElement
    ? { width: source.videoWidth || 640, height: source.videoHeight || 480 }
    : { width: source.width, height: source.height };
}

/**
 * Produces a transparent person cutout for a single captured frame. The model is
 * lazy-loaded only after a participant enables removal or chooses a background.
 * Callers deliberately fall back to the original source when initialization or
 * inference is unavailable so camera capture can never become blank.
 */
export async function removeBackground(source: SegmentSource): Promise<HTMLCanvasElement> {
  const segmenter = await getSegmenter();
  const { width, height } = dimensions(source);
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('Canvas is unavailable.');
  sourceContext.drawImage(source, 0, 0, width, height);

  const result = segmenter.segment(sourceCanvas);
  const mask = result.categoryMask;
  if (!mask) {
    result.close();
    throw new Error('The background removal model returned no mask.');
  }

  const categories = mask.getAsUint8Array();
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = mask.width;
  maskCanvas.height = mask.height;
  const maskContext = maskCanvas.getContext('2d');
  if (!maskContext) {
    result.close();
    throw new Error('Canvas is unavailable.');
  }
  const pixels = maskContext.createImageData(mask.width, mask.height);
  for (let index = 0; index < categories.length; index += 1) {
    const alpha = isForegroundCategory(categories[index]) ? 255 : 0;
    const offset = index * 4;
    pixels.data[offset] = 255;
    pixels.data[offset + 1] = 255;
    pixels.data[offset + 2] = 255;
    pixels.data[offset + 3] = alpha;
  }
  maskContext.putImageData(pixels, 0, 0);

  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const outputContext = output.getContext('2d');
  if (!outputContext) {
    result.close();
    throw new Error('Canvas is unavailable.');
  }
  outputContext.drawImage(sourceCanvas, 0, 0);
  outputContext.globalCompositeOperation = 'destination-in';
  outputContext.imageSmoothingEnabled = true;
  outputContext.drawImage(maskCanvas, 0, 0, width, height);
  outputContext.globalCompositeOperation = 'source-over';
  result.close();
  return output;
}
