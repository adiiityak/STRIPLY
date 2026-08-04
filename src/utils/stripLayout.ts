export const BASELINE_COUNT = 4;
export const BASELINE_ASPECT = 4 / 3; // width / height
export const MIN_PHOTO_COUNT = 2;
export const MAX_PHOTO_COUNT = 6;
/** Counts at or above this lose the inter-photo gap and the space below the photos. */
export const FLUSH_THRESHOLD = 5;

export interface StripSlotLayout {
  /** CSS aspect-ratio (width / height) for each photo box. */
  aspectRatio: number;
  /** px gap between photo slots. */
  gap: number;
  /** True when the strip should have no padding below the photo column. */
  flushBottom: boolean;
}

export function clampPhotoCount(count: number): number {
  if (!Number.isFinite(count)) return BASELINE_COUNT;
  return Math.min(MAX_PHOTO_COUNT, Math.max(MIN_PHOTO_COUNT, count));
}

export function computeSlotLayout(
  photoCount: number,
  configuredGap: number,
  baseAspect: number = BASELINE_ASPECT
): StripSlotLayout {
  const totalPhotoHeightUnits = BASELINE_COUNT / baseAspect;
  const aspectRatio = photoCount / totalPhotoHeightUnits;
  const flushBottom = photoCount >= FLUSH_THRESHOLD;
  const gap = flushBottom ? 0 : configuredGap;

  return { aspectRatio, gap, flushBottom };
}
