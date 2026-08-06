import { describe, expect, it } from 'vitest';
import * as exportUtils from './exportUtils';

type ExportSizingApi = {
  constrainImageDimensions?: (
    width: number,
    height: number,
    maxDimension: number
  ) => { width: number; height: number };
  fitImageWithin?: (
    sourceWidth: number,
    sourceHeight: number,
    box: { x: number; y: number; width: number; height: number }
  ) => { x: number; y: number; width: number; height: number };
  shouldIncludeInExport?: (node: HTMLElement) => boolean;
};

const sizing = exportUtils as ExportSizingApi;

describe('export image sizing', () => {
  it('downsizes a phone camera frame without changing its aspect ratio', () => {
    expect(sizing.constrainImageDimensions?.(4032, 3024, 1280)).toEqual({
      width: 1280,
      height: 960
    });
  });

  it('keeps the strip aspect ratio when placing a tall image on a 2x6 PDF page', () => {
    const placement = sizing.fitImageWithin?.(280, 980, {
      x: 0,
      y: 0,
      width: 2,
      height: 6
    });

    expect(placement?.x).toBeCloseTo(1 / 7);
    expect(placement?.y).toBe(0);
    expect(placement?.width).toBeCloseTo(12 / 7);
    expect(placement?.height).toBe(6);
  });

  it('keeps text nodes that do not expose an element class list', () => {
    expect(sizing.shouldIncludeInExport?.({} as HTMLElement)).toBe(true);
  });
});
