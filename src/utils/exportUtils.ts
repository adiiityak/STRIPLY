import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import { inlineOklchFallbacks } from './oklch';

const STRIP_WIDTH_INCHES = 2.7;
const STRIP_HEIGHT_INCHES = 6;
const PRINT_DPI = 300;

export function getPhotoStripExportSize(dpi: number = PRINT_DPI) {
  return {
    width: Math.round(STRIP_WIDTH_INCHES * dpi),
    height: Math.round(STRIP_HEIGHT_INCHES * dpi),
    widthInches: STRIP_WIDTH_INCHES,
    heightInches: STRIP_HEIGHT_INCHES
  };
}

type PdfLayoutType = '2x6' | '4x6_double' | 'a4_grid';

export function getPdfLayout(layout: PdfLayoutType): {
  unit: 'in' | 'mm';
  page: { width: number; height: number } | 'a4';
  placements: Array<{ x: number; y: number; width: number; height: number }>;
} {
  if (layout === '2x6') {
    return {
      unit: 'in',
      page: { width: 2.7, height: 6 },
      placements: [{ x: 0, y: 0, width: 2.7, height: 6 }]
    };
  }

  if (layout === '4x6_double') {
    return {
      unit: 'in',
      page: { width: 5.4, height: 6 },
      placements: [
        { x: 0, y: 0, width: 2.7, height: 6 },
        { x: 2.7, y: 0, width: 2.7, height: 6 }
      ]
    };
  }

  const stripWidthMm = 68.58;
  const stripHeightMm = 152.4;
  const startX = 2.13;
  return {
    unit: 'mm',
    page: 'a4',
    placements: Array.from({ length: 3 }, (_, index) => ({
      x: Number((startX + index * stripWidthMm).toFixed(2)),
      y: 15,
      width: stripWidthMm,
      height: stripHeightMm
    }))
  };
}

export function constrainImageDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  };
}

export function fitImageWithin(
  sourceWidth: number,
  sourceHeight: number,
  box: { x: number; y: number; width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(box.width / sourceWidth, box.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height
  };
}

export function coverImageWithin(
  sourceWidth: number,
  sourceHeight: number,
  box: { x: number; y: number; width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  const scale = Math.max(box.width / sourceWidth, box.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height
  };
}

export const shouldIncludeInExport = (node: HTMLElement) =>
  !node.classList?.contains('no-export');

export function shouldUseFileShareSheet(matchesTouchOnlyDevice: boolean): boolean {
  return matchesTouchOnlyDevice;
}

function parseObjectPosition(value: string): { x: number; y: number } {
  const parts = value.trim().split(/\s+/);
  const parse = (part: string | undefined, fallback: number) => {
    if (!part) return fallback;
    if (part === 'left' || part === 'top') return 0;
    if (part === 'right' || part === 'bottom') return 1;
    if (part === 'center') return 0.5;
    const percentage = Number.parseFloat(part);
    return Number.isFinite(percentage) ? percentage / 100 : fallback;
  };
  return { x: parse(parts[0], 0.5), y: parse(parts[1], 0.5) };
}

export function getExportPhotoRasterSize(
  displayWidth: number,
  displayHeight: number,
  exportScale: number,
  sourceWidth: number,
  sourceHeight: number
): { width: number; height: number } {
  const requestedWidth = Math.max(1, Math.round(displayWidth * exportScale));
  const requestedHeight = Math.max(1, Math.round(displayHeight * exportScale));
  const limit = Math.min(1, sourceWidth / requestedWidth, sourceHeight / requestedHeight);
  return {
    width: Math.max(1, Math.round(requestedWidth * limit)),
    height: Math.max(1, Math.round(requestedHeight * limit))
  };
}

async function rasteriseExportPhotos(element: HTMLElement, exportScale: number): Promise<() => void> {
  const restores: Array<() => void> = [];
  const images = Array.from(element.querySelectorAll<HTMLImageElement>('img[data-export-photo]'));

  for (const image of images) {
    const width = image.clientWidth;
    const height = image.clientHeight;
    if (!width || !height || !image.naturalWidth || !image.naturalHeight) continue;

    const computed = getComputedStyle(image);
    const canvas = document.createElement('canvas');
    const rasterSize = getExportPhotoRasterSize(
      width,
      height,
      exportScale,
      image.naturalWidth,
      image.naturalHeight
    );
    canvas.width = rasterSize.width;
    canvas.height = rasterSize.height;
    const context = canvas.getContext('2d');
    if (!context) continue;

    const sourceAspect = image.naturalWidth / image.naturalHeight;
    const targetAspect = width / height;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    if (computed.objectFit === 'cover') {
      if (sourceAspect > targetAspect) sourceWidth = image.naturalHeight * targetAspect;
      else sourceHeight = image.naturalWidth / targetAspect;
    }
    const position = parseObjectPosition(computed.objectPosition);
    const sourceX = (image.naturalWidth - sourceWidth) * position.x;
    const sourceY = (image.naturalHeight - sourceHeight) * position.y;

    try {
      context.filter = computed.filter === 'none' ? 'none' : computed.filter;
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const original = {
        src: image.src,
        filter: image.style.filter,
        objectFit: image.style.objectFit,
        objectPosition: image.style.objectPosition
      };
      image.src = canvas.toDataURL('image/png');
      image.style.filter = 'none';
      image.style.objectFit = 'fill';
      image.style.objectPosition = '50% 50%';
      await image.decode().catch(() => undefined);
      restores.push(() => {
        image.src = original.src;
        image.style.filter = original.filter;
        image.style.objectFit = original.objectFit;
        image.style.objectPosition = original.objectPosition;
      });
    } catch (error) {
      console.warn('Could not prepare one photo for export; using its live rendering.', error);
    }
  }

  return () => restores.reverse().forEach((restore) => restore());
}

/**
 * Some browser/GPU combinations let html2canvas finish successfully but hand back an empty
 * bitmap. Treat a transparent or effectively uniform canvas as a failed render so callers do
 * not save a blank PNG and then embed the same blank pixels in every PDF/share path.
 */
export function isCanvasVisuallyBlank(
  canvas: Pick<HTMLCanvasElement, 'width' | 'height' | 'getContext'>
): boolean {
  if (canvas.width <= 0 || canvas.height <= 0) return true;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return true;

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const pixelCount = pixels.length / 4;
  const step = Math.max(1, Math.floor(pixelCount / 12_000));
  let sampled = 0;
  let visible = 0;
  let reference: [number, number, number] | null = null;
  let contrasting = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += step) {
    const index = pixel * 4;
    sampled += 1;
    if (pixels[index + 3] < 16) continue;
    visible += 1;
    const colour: [number, number, number] = [pixels[index], pixels[index + 1], pixels[index + 2]];
    if (!reference) reference = colour;
    else if (
      Math.abs(colour[0] - reference[0]) +
        Math.abs(colour[1] - reference[1]) +
        Math.abs(colour[2] - reference[2]) >
      24
    ) {
      contrasting += 1;
    }
  }

  return visible / Math.max(1, sampled) < 0.01 || contrasting / Math.max(1, visible) < 0.002;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(meta)?.[1] ?? 'image/png';
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function saveDataUrl(dataUrl: string, filename: string): void {
  const blob = dataUrlToBlob(dataUrl);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = objectUrl;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

export async function shareSocialImageDataUrl(
  dataUrl: string,
  filename: string = 'striply-social.png'
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], filename, { type: blob.type || 'image/png' });
  const sharePayload: ShareData = {
    title: 'Striply Photo Strip',
    files: [file]
  };

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    (typeof navigator.canShare !== 'function' || navigator.canShare(sharePayload));

  if (canShareFiles) {
    try {
      // Supplying only the image file lets iOS and Android present each app's full
      // destination chooser (for example Instagram Post, Story, or Reel).
      await navigator.share(sharePayload);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      console.warn('Native sharing failed; downloading the social image instead.', error);
    }
  }

  saveDataUrl(dataUrl, filename);
  return 'downloaded';
}

async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));

  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        // Resolve on error rather than reject: one unloadable image must not abort the whole
        // export and leave the user with no file at all.
        await new Promise<void>((resolve) => {
          const finish = () => {
            image.removeEventListener('load', finish);
            image.removeEventListener('error', finish);
            resolve();
          };
          image.addEventListener('load', finish, { once: true });
          image.addEventListener('error', finish, { once: true });

          // `complete` can flip after the check above but before these listeners are attached.
          // In that cold-load race the load event has already been missed, so resolve from the
          // current state instead of leaving mobile export pending forever.
          if (image.complete) finish();
        });
      }

      if (image.decode) {
        await image.decode().catch(() => undefined);
      }
    })
  );
}

async function renderStripToPng(
  element: HTMLElement,
  scale: number,
  transparent: boolean = false
): Promise<string> {
  // Wait for all images to settle and decode
  await waitForImages(element);
  const restorePhotos = await rasteriseExportPhotos(element, scale);

  // Rendered with html2canvas rather than html-to-image.
  //
  // html-to-image works by serialising the strip into an SVG <foreignObject> and letting the
  // browser rasterise that. WebKit does not lay that clone out the way it lays out the live
  // page, and every iPhone export failure traced back to it -- photo slots collapsing to zero
  // height, images never decoding, whole exports producing no file. Each fix I tried was a
  // different way of arguing with that clone.
  //
  // html2canvas takes the opposite approach: it walks the live DOM, reads each element's
  // *resolved* geometry and computed styles, and paints them onto a canvas itself. There is no
  // clone and no foreignObject, so the whole class of failure disappears rather than being
  // timed around. It is already in the tree as a jsPDF dependency and is now a direct one.
  //
  // html2canvas 1.4.1 cannot parse oklch(), which Tailwind 4 uses for its whole palette, and
  // throws on the first one it meets. The strip's colours are converted to rgb() for the
  // duration of the render and restored immediately afterwards.
  const restoreColours = inlineOklchFallbacks(element);
  try {
    try {
      const canvas = await html2canvas(element, {
        scale,
        // Use the strip's resolved background instead of transparency. An opaque raster is more
        // reliable in iOS share sheets and gives the blank-output check a deterministic surface.
        backgroundColor: getComputedStyle(element).backgroundColor || '#ffffff',
        useCORS: true,
        // A tainted canvas cannot be read or encoded; CORS-safe images work without this escape.
        allowTaint: false,
        logging: false,
        imageTimeout: 20_000,
        ignoreElements: (node) => node.classList?.contains('no-export') ?? false
      });

      if (isCanvasVisuallyBlank(canvas)) {
        throw new Error('Primary export renderer returned a blank canvas.');
      }
      return canvas.toDataURL('image/png');
    } catch (primaryError) {
      console.warn('Primary strip renderer failed; retrying with fallback renderer.', primaryError);
      const dataUrl = await toPng(element, {
        pixelRatio: scale,
        backgroundColor: transparent ? 'transparent' : getComputedStyle(element).backgroundColor,
        cacheBust: false,
        filter: shouldIncludeInExport,
        width: element.clientWidth,
        height: element.clientHeight,
        style: {
          width: `${element.clientWidth}px`,
          height: `${element.clientHeight}px`,
          transform: 'none'
        }
      });
      if (!dataUrl.startsWith('data:image/png;base64,') || dataUrl.length < 1_000) {
        throw new Error('Both export renderers returned an empty image.');
      }
      return dataUrl;
    }
  } finally {
    restorePhotos();
    restoreColours();
  }
}

export async function exportStripToDataUrl(
  element: HTMLElement,
  options: { scale?: number; transparent?: boolean } = {}
): Promise<string> {
  const scale = options.scale || 2.5;
  return renderStripToPng(element, scale, options.transparent);
}

function loadDataUrlImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The rendered strip could not be prepared.'));
    image.src = dataUrl;
  });
}

async function normalisePhotoStripDataUrl(dataUrl: string): Promise<string> {
  const image = await loadDataUrlImage(dataUrl);
  const size = getPhotoStripExportSize();
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The photo strip export canvas is unavailable.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size.width, size.height);
  const placement = coverImageWithin(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    { x: 0, y: 0, width: size.width, height: size.height }
  );
  context.drawImage(image, placement.x, placement.y, placement.width, placement.height);
  return canvas.toDataURL('image/png');
}

export function drawSocialShareComposition(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource
): void {
  const { width, height } = context.canvas;
  context.fillStyle = '#e9f2ff';
  context.fillRect(0, 0, width, height);

  const stripWidth = width * 0.43;
  const stripHeight = stripWidth * (STRIP_HEIGHT_INCHES / STRIP_WIDTH_INCHES);
  const placements = [
    { x: width * 0.36, y: height * 0.51, rotation: -6 },
    { x: width * 0.64, y: height * 0.51, rotation: 6 }
  ];

  placements.forEach(({ x, y, rotation }) => {
    context.save();
    context.translate(x, y);
    context.rotate((rotation * Math.PI) / 180);
    context.shadowColor = 'rgba(26, 49, 83, 0.24)';
    context.shadowBlur = 28;
    context.shadowOffsetY = 18;
    context.drawImage(image, -stripWidth / 2, -stripHeight / 2, stripWidth, stripHeight);
    context.restore();
  });
}

export async function exportSocialShareToDataUrl(element: HTMLElement): Promise<string> {
  const renderedStrip = await renderStripToPng(element, 2.5);
  const normalisedStrip = await normalisePhotoStripDataUrl(renderedStrip);
  const image = await loadDataUrlImage(normalisedStrip);
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The social share canvas is unavailable.');
  drawSocialShareComposition(context, image);
  return canvas.toDataURL('image/png');
}

export async function downloadStripAsPNG(
  element: HTMLElement,
  filename: string = 'striply-photo-strip.png',
  options: { scale?: number; transparent?: boolean } = {}
) {
  try {
    const scale = options.scale || 2.5;

    const renderedStrip = await renderStripToPng(element, scale, options.transparent);
    const dataUrl = await normalisePhotoStripDataUrl(renderedStrip);
    // Export is a download action on every device. Calling navigator.share only after the
    // asynchronous cold render loses mobile browsers' transient user activation and can leave
    // the share promise (and the Export spinner) pending. Sharing remains available through the
    // dedicated Share button, whose user gesture occurs after its preview has been prepared.
    saveDataUrl(dataUrl, filename);

    // Trigger celebratory confetti!
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });

    return true;
  } catch (err) {
    console.error('Failed to export PNG:', err);
    throw err;
  }
}

// Repeating the same strip on a sheet must reuse one embedded image. Without an explicit
// alias jsPDF re-processes the multi-megabyte PNG per placement, which on iOS Safari left the
// second and third copies blank -- exactly why 4x6 and A4 came out with empty slots while the
// single-placement 2x6 was fine. With an alias the bitmap is embedded once and referenced.
const STRIP_ALIAS = 'striply-strip';

export async function downloadStripAsPDF(
  element: HTMLElement,
  filename: string = 'striply-photo-strip.pdf',
  layoutType: PdfLayoutType = '2x6'
) {
  try {
    const renderedStrip = await renderStripToPng(element, 2.5);
    const dataUrl = await normalisePhotoStripDataUrl(renderedStrip);
    const layout = getPdfLayout(layoutType);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: layout.unit,
      format: layout.page === 'a4' ? 'a4' : [layout.page.width, layout.page.height]
    });

    layout.placements.forEach((placement) => {
      pdf.addImage(
        dataUrl,
        'PNG',
        placement.x,
        placement.y,
        placement.width,
        placement.height,
        STRIP_ALIAS,
        'FAST'
      );
    });

    const pdfArrayBuffer = pdf.output('arraybuffer');
    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

    const prefersShareSheet = shouldUseFileShareSheet(
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse) and (any-hover: none)').matches
    );

    // Native file sharing is reserved for phones/tablets. Desktop browsers such as Safari also
    // report canShare({ files: true }), but users expect a PDF button to download immediately.
    if (prefersShareSheet && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: filename
        });

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
        return true;
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return false;
        }
      }
    }

    // Direct browser download
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = blobUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      const newWin = window.open(blobUrl, '_blank');
      if (!newWin) {
        window.location.href = blobUrl;
      }
    }

    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });

    return true;
  } catch (err) {
    console.error('Failed to export PDF:', err);
    throw err;
  }
}
