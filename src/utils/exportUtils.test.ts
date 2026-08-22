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
  fitShareStrip?: (
    aspectRatio: number,
    frame: { width: number; height: number }
  ) => { stripWidth: number; stripHeight: number };
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
  getPhotoStripExportSize?: (dpi?: number) => {
    width: number;
    height: number;
    widthInches: number;
    heightInches: number;
  };
  getPdfLayout?: (layout: '2x6' | '4x6_double' | 'a4_grid') => {
    unit: 'in' | 'mm';
    page: { width: number; height: number } | 'a4';
    placements: Array<{ x: number; y: number; width: number; height: number }>;
  };
  drawSocialShareComposition?: (
    context: CanvasRenderingContext2D,
    image: CanvasImageSource
  ) => void;
  shareSocialImageDataUrl?: (
    dataUrl: string,
    filename?: string
  ) => Promise<'shared' | 'downloaded' | 'cancelled'>;
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
    class LoadedImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 810;
      naturalHeight = 1800;
      width = 810;
      height = 1800;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', LoadedImage);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      set fillStyle(_value: string) {}
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      `data:image/png;base64,${'b'.repeat(2_000)}`
    );

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

  it('exports a single strip at 2.7 by 6 inches at print resolution', () => {
    expect(sizing.getPhotoStripExportSize?.()).toEqual({
      width: 810,
      height: 1800,
      widthInches: 2.7,
      heightInches: 6
    });
  });

  // A rendered strip is around 3.5:1, far taller than the 2.7x6 print sheet. Sizing
  // it to the sheet cropped a third of its height away -- the top of the first photo
  // and the bottom of the last -- so exports now keep the strip's own proportions.
  it('keeps the strip at its own proportions in the share image', () => {
    const fitted = sizing.fitShareStrip?.(3.475, { width: 1080, height: 1920 });
    expect(fitted?.stripWidth).toBeCloseTo(464.4, 1);
    expect((fitted?.stripHeight ?? 0) / (fitted?.stripWidth ?? 1)).toBeCloseTo(3.475, 3);
  });

  it('shrinks an unusually tall strip so its rotated corners stay inside the frame', () => {
    const frame = { width: 1080, height: 1920 };
    const fitted = sizing.fitShareStrip?.(6, frame);
    expect(fitted).toBeDefined();
    const { stripWidth, stripHeight } = fitted!;
    // Proportions survive the shrink, and the tilted bounding box clears the frame.
    expect(stripHeight / stripWidth).toBeCloseTo(6, 3);
    const radians = (6 * Math.PI) / 180;
    const halfExtentY =
      (stripWidth * Math.sin(radians) + stripHeight * Math.cos(radians)) / 2;
    expect(frame.height * 0.51 + halfExtentY).toBeLessThanOrEqual(frame.height);
    expect(frame.height * 0.51 - halfExtentY).toBeGreaterThanOrEqual(0);
  });

  it('places every PDF strip at exactly 2.7 by 6 inches', () => {
    expect(sizing.getPdfLayout?.('2x6')).toEqual({
      unit: 'in',
      page: { width: 2.7, height: 6 },
      placements: [{ x: 0, y: 0, width: 2.7, height: 6 }]
    });
    expect(sizing.getPdfLayout?.('4x6_double')).toEqual({
      unit: 'in',
      page: { width: 5.4, height: 6 },
      placements: [
        { x: 0, y: 0, width: 2.7, height: 6 },
        { x: 2.7, y: 0, width: 2.7, height: 6 }
      ]
    });

    const a4 = sizing.getPdfLayout?.('a4_grid');
    expect(a4?.placements).toHaveLength(3);
    expect(a4?.placements.every(({ width, height }) => width === 68.58 && height === 152.4)).toBe(true);
  });

  it('draws two copies of the selected strip in the social image without promotional text', () => {
    const drawImage = vi.fn();
    const fillRect = vi.fn();
    const fillText = vi.fn();
    const context = {
      canvas: { width: 1080, height: 1920 },
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage,
      fillRect,
      fillText,
      set fillStyle(_value: string) {},
      set shadowColor(_value: string) {},
      set shadowBlur(_value: number) {},
      set shadowOffsetY(_value: number) {}
    } as unknown as CanvasRenderingContext2D;

    sizing.drawSocialShareComposition?.(context, {} as CanvasImageSource);

    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(fillRect).toHaveBeenCalledTimes(1);
    expect(fillText).not.toHaveBeenCalled();
  });

  it('draws the share strips at the rendered strip shape, not the print sheet shape', () => {
    const drawImage = vi.fn();
    const context = {
      canvas: { width: 1080, height: 1920 },
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage,
      fillRect: vi.fn(),
      set fillStyle(_value: string) {},
      set shadowColor(_value: string) {},
      set shadowBlur(_value: number) {},
      set shadowOffsetY(_value: number) {}
    } as unknown as CanvasRenderingContext2D;

    // A real four-photo strip rendered at 2.5x: 3.474:1, not the sheet's 2.222:1.
    sizing.drawSocialShareComposition?.(context, {
      naturalWidth: 700,
      naturalHeight: 2432
    } as unknown as CanvasImageSource);

    const [, x, y, drawnWidth, drawnHeight] = drawImage.mock.calls[0] as number[];
    expect(drawnHeight / drawnWidth).toBeCloseTo(2432 / 700, 3);
    // Drawn centred on the rotation origin, so nothing is offset out of frame.
    expect(x).toBeCloseTo(-drawnWidth / 2, 6);
    expect(y).toBeCloseTo(-drawnHeight / 2, 6);
  });

  it('shares only the generated strip image through the native system sheet', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn(() => true)
    });
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });

    const result = await sizing.shareSocialImageDataUrl?.(
      'data:image/png;base64,QQ==',
      'striply-social.png'
    );

    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledOnce();
    const payload = share.mock.calls[0][0];
    expect(payload.files).toHaveLength(1);
    expect(payload).not.toHaveProperty('text');
    expect(payload).not.toHaveProperty('url');
  });
});
