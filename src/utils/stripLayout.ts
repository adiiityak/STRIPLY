import type { PhotoLayout } from '../types';

export const BASELINE_COUNT = 4;
export const BASELINE_ASPECT = 4 / 3; // width / height
export const MIN_PHOTO_COUNT = 2;
export const MAX_PHOTO_COUNT = 6;
/** Counts at or above this lose the inter-photo gap only; the strip's outer margin is unaffected. */
export const FLUSH_THRESHOLD = 5;

export interface StripSlotLayout {
  /** px gap between photo slots. */
  gap: number;
}

export function clampPhotoCount(count: number | undefined): number {
  if (count === undefined || !Number.isFinite(count)) return BASELINE_COUNT;
  // Photo counts are whole slots (2-6): round a fractional caller-supplied value before clamping.
  const rounded = Math.round(count);
  return Math.min(MAX_PHOTO_COUNT, Math.max(MIN_PHOTO_COUNT, rounded));
}

export function computeSlotLayout(photoCount: number, configuredGap: number): StripSlotLayout {
  const gap = photoCount >= FLUSH_THRESHOLD ? 0 : configuredGap;
  return { gap };
}

export interface ColumnMetrics {
  /** Usable width of the photo column in px. */
  columnWidth: number;
  framePadding: number;
  photoGap: number;
  /** width / height of a single photo box at the baseline. */
  baseAspect?: number;
}

export interface PhotoAreaLayout {
  columns: 1 | 2;
  rows: 2 | 4;
  gap: number;
  height: number;
}

/**
 * Height of the photo column in px, fixed at the 4-photo baseline so every count shares it:
 * 4 baseline slots plus the 3 gaps between them. Independent of the current count by design.
 */
export function computeColumnHeight(m: ColumnMetrics): number {
  const baseAspect = m.baseAspect ?? BASELINE_ASPECT;
  const photoBoxWidth = m.columnWidth - 2 * m.framePadding;
  const baselineSlotHeight = 2 * m.framePadding + photoBoxWidth / baseAspect;
  return BASELINE_COUNT * baselineSlotHeight + (BASELINE_COUNT - 1) * m.photoGap;
}

export function computePhotoAreaLayout(
  layout: PhotoLayout,
  metrics: ColumnMetrics
): PhotoAreaLayout {
  if (layout === 'vertical-1x4') {
    return {
      columns: 1,
      rows: 4,
      gap: metrics.photoGap,
      height: computeColumnHeight(metrics)
    };
  }

  const cellWidth = (metrics.columnWidth - metrics.photoGap) / 2;
  const photoWidth = cellWidth - 2 * metrics.framePadding;
  const slotHeight =
    2 * metrics.framePadding + photoWidth / (metrics.baseAspect ?? BASELINE_ASPECT);
  return {
    columns: 2,
    rows: 2,
    gap: metrics.photoGap,
    height: 2 * slotHeight + metrics.photoGap
  };
}
