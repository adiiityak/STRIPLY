import { constrainImageDimensions } from './exportUtils';

export const MAX_IMPORTED_PHOTO_DIMENSION = 1600;
export const MAX_SHARED_BACKGROUND_DIMENSION = 1000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to decode the selected photo.'));
    image.src = dataUrl;
  });
}

/**
 * Browser exports rasterise every source photo at once. A handful of unmodified phone-camera
 * files can therefore exceed the browser's canvas/GPU memory budget and leave individual slots
 * blank. Decode each upload once, honour its browser-corrected orientation, and retain enough
 * resolution for a 300-DPI strip without carrying the original multi-megapixel bitmap forward.
 */
export async function optimisePhotoFile(file: File): Promise<string> {
  const original = await readFileAsDataUrl(file);
  const image = await loadImage(original);
  const dimensions = constrainImageDimensions(
    image.naturalWidth,
    image.naturalHeight,
    MAX_IMPORTED_PHOTO_DIMENSION
  );

  if (dimensions.width === image.naturalWidth && dimensions.height === image.naturalHeight) {
    return original;
  }

  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to prepare the selected photo.');
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

export async function optimiseSharedBackground(file: File): Promise<string> {
  const original = await readFileAsDataUrl(file);
  const image = await loadImage(original);
  const dimensions = constrainImageDimensions(
    image.naturalWidth,
    image.naturalHeight,
    MAX_SHARED_BACKGROUND_DIMENSION
  );
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to prepare the selected background.');
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.76);
  if (dataUrl.length > 700_000) {
    throw new Error('That background is too large. Please choose a smaller image.');
  }
  return dataUrl;
}
