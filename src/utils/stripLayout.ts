export const BASELINE_COUNT = 4;
export const BASELINE_ASPECT = 4 / 3; // width / height
export const MIN_PHOTO_COUNT = 2;
export const MAX_PHOTO_COUNT = 6;
/** Counts at or above this lose the inter-photo gap and the space below the photos. */
export const FLUSH_THRESHOLD = 5;

export interface StripSlotLayout {
  /** px gap between photo slots. */
  gap: number;
  /** True when the strip should have no padding below the photo column. */
  flushBottom: boolean;
}

export function clampPhotoCount(count: number): number {
  if (!Number.isFinite(count)) return BASELINE_COUNT;
  return Math.min(MAX_PHOTO_COUNT, Math.max(MIN_PHOTO_COUNT, count));
}

export function computeSlotLayout(photoCount: number, configuredGap: number): StripSlotLayout {
  const flushBottom = photoCount >= FLUSH_THRESHOLD;
  const gap = flushBottom ? 0 : configuredGap;

  return { gap, flushBottom };
}

/**
 * The photo column's fixed height, expressed as a CSS `aspect-ratio` of its own width
 * (`"1 / N"`, i.e. column height = N x column width). N is the baseline (4-photo) total
 * photo height in units of photo width, so it depends only on `baseAspect` — never on
 * `photoCount`. That is what makes the column height identical for every photo count
 * (2-6): gaps and per-slot padding are absorbed by the flexed slots inside the column
 * rather than adding to the column's own height.
 */
export function getColumnAspectRatio(baseAspect: number = BASELINE_ASPECT): string {
  const totalPhotoHeightUnits = BASELINE_COUNT / baseAspect;
  return `1 / ${totalPhotoHeightUnits}`;
}
