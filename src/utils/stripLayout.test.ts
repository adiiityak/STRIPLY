import { describe, it, expect } from 'vitest';
import {
  BASELINE_COUNT,
  BASELINE_ASPECT,
  clampPhotoCount,
  computeSlotLayout,
  getColumnAspectRatio
} from './stripLayout';

describe('computeSlotLayout', () => {
  it('keeps the configured gap and non-flush state at 4 photos (no-regression guarantee)', () => {
    const layout = computeSlotLayout(4, 12);
    expect(layout.gap).toBe(12);
    expect(layout.flushBottom).toBe(false);
  });

  it('keeps the configured gap and non-flush state at 2 photos', () => {
    const layout = computeSlotLayout(2, 12);
    expect(layout.gap).toBe(12);
    expect(layout.flushBottom).toBe(false);
  });

  it('keeps the configured gap and non-flush state at 3 photos', () => {
    const layout = computeSlotLayout(3, 12);
    expect(layout.gap).toBe(12);
    expect(layout.flushBottom).toBe(false);
  });

  it('goes flush with no gap at 5 photos', () => {
    const layout = computeSlotLayout(5, 12);
    expect(layout.gap).toBe(0);
    expect(layout.flushBottom).toBe(true);
  });

  it('goes flush with no gap at 6 photos', () => {
    const layout = computeSlotLayout(6, 12);
    expect(layout.gap).toBe(0);
    expect(layout.flushBottom).toBe(true);
  });
});

describe('getColumnAspectRatio', () => {
  it('reduces to "1 / 3" for the default 4:3 baseline (4 photos at 4:3 = 3 units tall)', () => {
    expect(getColumnAspectRatio()).toBe('1 / 3');
    expect(getColumnAspectRatio(BASELINE_ASPECT)).toBe('1 / 3');
  });

  it('uses "1 / 4" for a square (1:1) baseline photo, as used by boothycall-style strips', () => {
    expect(getColumnAspectRatio(1)).toBe('1 / 4');
  });

  it('never varies with photo count: the column height (in units of its own width) is invariant', () => {
    // getColumnAspectRatio takes no photoCount argument at all, so for a fixed column width
    // the resulting height is identical no matter how many photos (2-6) are laid out inside
    // it — gaps and per-slot padding are absorbed by the flexed slots, not by the column.
    // Simulate every supported count and confirm the derived ratio string never changes.
    const ratios = [2, 3, 4, 5, 6].map((count) => {
      void computeSlotLayout(clampPhotoCount(count), 12); // gap/flushBottom vary; ratio must not.
      return getColumnAspectRatio();
    });
    expect(new Set(ratios).size).toBe(1);
    expect(ratios[0]).toBe(`1 / ${BASELINE_COUNT / BASELINE_ASPECT}`);
  });
});

describe('clampPhotoCount', () => {
  it('clamps below the minimum up to 2', () => {
    expect(clampPhotoCount(1)).toBe(2);
  });

  it('clamps above the maximum down to 6', () => {
    expect(clampPhotoCount(7)).toBe(6);
  });

  it('leaves an in-range count unchanged', () => {
    expect(clampPhotoCount(4)).toBe(4);
  });

  it('falls back to the baseline count for non-finite input', () => {
    expect(clampPhotoCount(Number.NaN)).toBe(4);
  });
});
