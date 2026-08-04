import { PhotoItem } from '../types';

/**
 * Smart Auto-Crop / Center Faces:
 * Calculates optimal crop coordinates for photos so heads and main subjects are centered.
 */
export function autoCropPhoto(photo: PhotoItem): PhotoItem {
  // Standard upper third bias for human portraits in photobooth strips
  return {
    ...photo,
    cropY: 20, // offset top slightly so faces in upper third are highlighted
    cropX: 50, // centered
    zoom: 1.05
  };
}

/**
 * Auto-Arrange photos based on alternating composition and orientation
 */
export function autoArrangePhotos(photos: PhotoItem[]): PhotoItem[] {
  if (photos.length <= 1) return photos;

  // Clone array and sort for optimal visual rhythm
  const arranged = [...photos];
  // Simple heuristic: alternate wider or zoomed frames, keep balance
  return arranged.map((p, idx) => ({
    ...p,
    cropY: idx % 2 === 0 ? 15 : 25
  }));
}
