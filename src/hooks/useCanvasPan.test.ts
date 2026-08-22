import { describe, expect, it } from 'vitest';
import { WHEEL_ZOOM_SENSITIVITY, zoomFromWheelDelta } from './useCanvasPan';

describe('zoomFromWheelDelta', () => {
  it('zooms in when the wheel scrolls up and out when it scrolls down', () => {
    expect(zoomFromWheelDelta(1, -10)).toBeGreaterThan(1);
    expect(zoomFromWheelDelta(1, 10)).toBeLessThan(1);
  });

  // Exponential rather than additive: pinching in and back out by the same amount
  // has to land exactly where it started, or a gesture drifts.
  it('is exactly reversible', () => {
    expect(zoomFromWheelDelta(zoomFromWheelDelta(0.9, -37), 37)).toBeCloseTo(0.9, 10);
  });

  // The same notch is the same proportion at any zoom, which is what keeps the
  // gesture feeling even instead of coarse when zoomed out and sluggish when in.
  it('changes zoom by a constant proportion, not a constant amount', () => {
    const small = zoomFromWheelDelta(0.5, -10) / 0.5;
    const large = zoomFromWheelDelta(2.5, -10) / 2.5;
    expect(small).toBeCloseTo(large, 10);
  });

  // An absurd delta underflows to exactly zero rather than going negative, so the
  // strip can never come out mirrored. The caller clamps to its own floor.
  it('never turns negative however hard the wheel is spun', () => {
    expect(zoomFromWheelDelta(1, 100_000)).toBeGreaterThanOrEqual(0);
    expect(zoomFromWheelDelta(1, -100_000)).toBe(Infinity);
  });

  it('holds still for a zero delta', () => {
    expect(zoomFromWheelDelta(1.25, 0)).toBe(1.25);
  });

  it('keeps a single notch gentle enough to be controllable', () => {
    // A trackpad pinch arrives as many small deltas; one should barely move.
    expect(zoomFromWheelDelta(1, -3)).toBeLessThan(1.05);
    expect(WHEEL_ZOOM_SENSITIVITY).toBeLessThan(0.05);
  });
});
