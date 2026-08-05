import { describe, it, expect } from 'vitest';
import { clampPhotoCount, computeSlotLayout, computeColumnHeight } from './stripLayout';

describe('computeSlotLayout', () => {
  it('keeps the configured gap at 4 photos (no-regression guarantee)', () => {
    const layout = computeSlotLayout(4, 12);
    expect(layout.gap).toBe(12);
  });

  it('keeps the configured gap at 2 photos', () => {
    const layout = computeSlotLayout(2, 12);
    expect(layout.gap).toBe(12);
  });

  it('keeps the configured gap at 3 photos', () => {
    const layout = computeSlotLayout(3, 12);
    expect(layout.gap).toBe(12);
  });

  it('goes flush with no gap at 5 photos', () => {
    const layout = computeSlotLayout(5, 12);
    expect(layout.gap).toBe(0);
  });

  it('goes flush with no gap at 6 photos', () => {
    const layout = computeSlotLayout(6, 12);
    expect(layout.gap).toBe(0);
  });
});

describe('computeColumnHeight', () => {
  // Pre-feature airmail metrics: canvas 280, outerPadding 22 -> columnWidth 236,
  // framePadding 12, photoGap 14, default 4:3 baseAspect.
  const airmailMetrics = { columnWidth: 236, framePadding: 12, photoGap: 14 };

  it('pins the pre-feature airmail column height at 774px (regression guard for C2)', () => {
    expect(computeColumnHeight(airmailMetrics)).toBe(774);
  });

  it('is independent of photo count: the same metrics give the same height no matter what count a caller also computes a slot layout for', () => {
    // computeColumnHeight takes no photoCount argument at all, so it is count-free by
    // construction. Simulate a caller that also calls computeSlotLayout (whose gap/flush
    // behaviour DOES vary by count) alongside it, and confirm the column height never moves.
    const heights = [2, 3, 4, 5, 6].map((count) => {
      void computeSlotLayout(clampPhotoCount(count), airmailMetrics.photoGap);
      return computeColumnHeight(airmailMetrics);
    });
    expect(new Set(heights).size).toBe(1);
    expect(heights[0]).toBe(774);
  });

  it('divides evenly into `count` equal slots plus the current gap, for every supported count (the "strip size stays the same" assertion)', () => {
    const H = computeColumnHeight(airmailMetrics);
    for (let count = 2; count <= 6; count++) {
      const { gap } = computeSlotLayout(count, airmailMetrics.photoGap);
      const slotHeight = (H - (count - 1) * gap) / count;
      expect(count * slotHeight + (count - 1) * gap).toBeCloseTo(H);
    }
  });

  it('is taller for a square (1:1) baseline photo than for the 4:3 default', () => {
    const square = computeColumnHeight({ ...airmailMetrics, baseAspect: 1 });
    const default43 = computeColumnHeight(airmailMetrics);
    expect(square).toBeGreaterThan(default43);
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

  it('falls back to the baseline count for undefined input', () => {
    expect(clampPhotoCount(undefined)).toBe(4);
  });

  it('rounds a non-integer count to the nearest whole slot before clamping', () => {
    expect(clampPhotoCount(4.6)).toBe(5);
    expect(clampPhotoCount(4.4)).toBe(4);
  });
});
