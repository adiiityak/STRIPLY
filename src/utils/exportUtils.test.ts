import { afterEach, describe, expect, it, vi } from 'vitest';
import * as exportUtils from './exportUtils';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';

vi.mock('html2canvas', () => ({ default: vi.fn() }));
vi.mock('html-to-image', () => ({ toPng: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

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
  isCanvasVisuallyBlank?: (
    canvas: Pick<HTMLCanvasElement, 'width' | 'height' | 'getContext'>
  ) => boolean;
  shouldUseFileShareSheet?: (matchesTouchDevice: boolean) => boolean;
  getExportPhotoRasterSize?: (
    displayWidth: number,
    displayHeight: number,
    exportScale: number,
    sourceWidth: number,
    sourceHeight: number
  ) => { width: number; height: number };
};

const sizing = exportUtils as ExportSizingApi;

describe('export image sizing', () => {
  afterEach(() => vi.restoreAllMocks());
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

  it('detects a fully transparent export canvas as blank', () => {
    const pixels = new Uint8ClampedArray(16 * 4);
    const canvas = {
      width: 4,
      height: 4,
      getContext: () => ({ getImageData: () => ({ data: pixels }) })
    } as unknown as HTMLCanvasElement;

    expect(sizing.isCanvasVisuallyBlank?.(canvas)).toBe(true);
  });

  it('accepts an export canvas with visible contrasting pixels', () => {
    const pixels = new Uint8ClampedArray(100 * 4);
    for (let index = 0; index < pixels.length; index += 4) {
      pixels[index] = 243;
      pixels[index + 1] = 234;
      pixels[index + 2] = 225;
      pixels[index + 3] = 255;
    }
    for (let pixel = 0; pixel < 20; pixel += 1) {
      const index = pixel * 4;
      pixels[index] = 25;
      pixels[index + 1] = 40;
      pixels[index + 2] = 70;
    }
    const canvas = {
      width: 10,
      height: 10,
      getContext: () => ({ getImageData: () => ({ data: pixels }) })
    } as unknown as HTMLCanvasElement;

    expect(sizing.isCanvasVisuallyBlank?.(canvas)).toBe(false);
  });

  it('uses the independent renderer when the primary renderer returns a blank canvas', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'clientWidth', { value: 280 });
    Object.defineProperty(element, 'clientHeight', { value: 980 });
    const blankPixels = new Uint8ClampedArray(16 * 4);
    vi.mocked(html2canvas).mockResolvedValue({
      width: 4,
      height: 4,
      getContext: () => ({ getImageData: () => ({ data: blankPixels }) })
    } as unknown as HTMLCanvasElement);
    vi.mocked(toPng).mockResolvedValue(`data:image/png;base64,${'a'.repeat(2_000)}`);

    const result = await exportUtils.exportStripToDataUrl(element, { scale: 1 });

    expect(toPng).toHaveBeenCalledOnce();
    expect(result.length).toBeGreaterThan(1_000);
  });

  it('does not stall a cold export when an image finishes between the ready check and listener setup', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'clientWidth', { value: 280 });
    Object.defineProperty(element, 'clientHeight', { value: 980 });
    const image = document.createElement('img');
    let completeReads = 0;
    Object.defineProperty(image, 'complete', {
      configurable: true,
      get: () => {
        completeReads += 1;
        return completeReads > 1;
      }
    });
    Object.defineProperty(image, 'decode', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined)
    });
    element.appendChild(image);

    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255,
      255, 255, 255, 255,
      0, 0, 0, 255,
      0, 0, 0, 255
    ]);
    vi.mocked(html2canvas).mockResolvedValue({
      width: 2,
      height: 2,
      getContext: () => ({ getImageData: () => ({ data: pixels }) }),
      toDataURL: () => `data:image/png;base64,${'a'.repeat(2_000)}`
    } as unknown as HTMLCanvasElement);

    const outcome = await Promise.race([
      exportUtils.exportStripToDataUrl(element, { scale: 1 }).then(() => 'exported'),
      new Promise<string>((resolve) => setTimeout(() => resolve('stalled'), 50))
    ]);

    expect(outcome).toBe('exported');
  });

  it('uses direct downloads on desktop even when the browser supports file sharing', () => {
    expect(sizing.shouldUseFileShareSheet?.(false)).toBe(false);
  });

  it('allows the native file share sheet on touch-only devices', () => {
    expect(sizing.shouldUseFileShareSheet?.(true)).toBe(true);
  });

  it('downloads PNG exports directly on touch devices instead of entering the share flow', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'clientWidth', { value: 280 });
    Object.defineProperty(element, 'clientHeight', { value: 980 });
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255,
      255, 255, 255, 255,
      0, 0, 0, 255,
      0, 0, 0, 255
    ]);
    vi.mocked(html2canvas).mockResolvedValue({
      width: 2,
      height: 2,
      getContext: () => ({ getImageData: () => ({ data: pixels }) }),
      toDataURL: () => `data:image/png;base64,${'a'.repeat(2_000)}`
    } as unknown as HTMLCanvasElement);

    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn(() => true)
    });
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true }))
    });
    const createObjectURL = vi.fn(() => 'blob:striply-png');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await exportUtils.downloadStripAsPNG(element, 'strip.png', { scale: 1 });

    expect(share).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });

  it('prepares photo bitmaps at final export resolution without upscaling the source', () => {
    expect(sizing.getExportPhotoRasterSize?.(240, 180, 2.5, 1600, 1200)).toEqual({
      width: 600,
      height: 450
    });
    expect(sizing.getExportPhotoRasterSize?.(800, 600, 2.5, 1600, 1200)).toEqual({
      width: 1600,
      height: 1200
    });
  });
});
