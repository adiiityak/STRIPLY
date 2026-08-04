import { describe, it, expect } from 'vitest';
import {
  BASELINE_COUNT,
  BASELINE_ASPECT,
  clampPhotoCount,
  computeSlotLayout
} from './stripLayout';

describe('computeSlotLayout', () => {
  it('reduces exactly to the 4:3 baseline at 4 photos (no-regression guarantee)', () => {
    const layout = computeSlotLayout(4, 12);
    expect(layout.aspectRatio).toBe(4 / 3);
    expect(layout.gap).toBe(12);
    expect(layout.flushBottom).toBe(false);
  });

  it('makes each photo taller than the baseline at 2 photos', () => {
    const layout = computeSlotLayout(2, 12);
    expect(layout.aspectRatio).toBe(2 / 3);
    expect(layout.aspectRatio).toBeLessThan(computeSlotLayout(4, 12).aspectRatio);
  });

  it('goes flush with no gap at 6 photos', () => {
    const layout = computeSlotLayout(6, 12);
    expect(layout.aspectRatio).toBe(2);
    expect(layout.gap).toBe(0);
    expect(layout.flushBottom).toBe(true);
  });

  it('goes flush with no gap at 5 photos', () => {
    const layout = computeSlotLayout(5, 12);
    expect(layout.gap).toBe(0);
    expect(layout.flushBottom).toBe(true);
  });

  it('keeps the configured gap and non-flush state at 3 photos', () => {
    const layout = computeSlotLayout(3, 12);
    expect(layout.gap).toBe(12);
    expect(layout.flushBottom).toBe(false);
  });

  it('keeps total photo height invariant across every count (strip size stays the same)', () => {
    const expectedTotal = BASELINE_COUNT / BASELINE_ASPECT;
    for (let n = 2; n <= 6; n++) {
      const layout = computeSlotLayout(n, 0);
      const totalHeight = n * (1 / layout.aspectRatio);
      expect(totalHeight).toBeCloseTo(expectedTotal);
    }
  });

  it('uses the provided square (1:1) baseline for boothycall-style strips', () => {
    const layout = computeSlotLayout(4, 12, 1);
    expect(layout.aspectRatio).toBe(1);
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
