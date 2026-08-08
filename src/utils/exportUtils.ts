import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';

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

export const shouldIncludeInExport = (node: HTMLElement) =>
  !node.classList?.contains('no-export');

/**
 * Saves a rendered data URL to disk.
 *
 * iOS Safari will not download a multi-megabyte `data:` URL from an <a download>: the click is
 * accepted and nothing is written, which looked like "the animation runs but no file appears".
 * Converting to a Blob and handing over an object URL works there, so exports go through this
 * rather than assigning the data URL to the anchor directly.
 */
function saveDataUrl(dataUrl: string, filename: string): void {
  const [meta, base64] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(meta)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = objectUrl;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick so the download has taken a reference to the blob first.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));

  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => reject(new Error(`Failed to load ${image.alt || 'export image'}`)), {
            once: true
          });
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
  // html-to-image does not wait for images whose source is already a data URL. Phone camera
  // frames use data URLs, so explicitly decode them before cloning the strip for export.
  await waitForImages(element);

  // Captions are drawn with webfonts; rasterising before they load swaps in a fallback face.
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }

  const options = {
    pixelRatio: scale,
    backgroundColor: transparent ? 'transparent' : undefined,
    cacheBust: true,
    filter: shouldIncludeInExport
  };

  // A throwaway warm-up render primes html-to-image's clone of the strip, so the render we
  // keep is never the first one WebKit rasterises. It runs at pixelRatio 1, roughly a ninth of
  // the pixels of a scale-3 export, so the cost is small even on a phone.
  //
  // Note: this was originally added believing clone decode timing was why iPhone exports had
  // blank photos. It was not -- that was flex-sized photo slots collapsing inside the SVG
  // foreignObject, fixed by giving them explicit pixel heights in StripCanvas. This is kept as
  // cheap insurance against genuine decode races, not as the fix for that bug.
  await toPng(element, { ...options, pixelRatio: 1 }).catch(() => undefined);

  return toPng(element, options);
}

export async function exportStripToDataUrl(
  element: HTMLElement,
  options: { scale?: number; transparent?: boolean } = {}
): Promise<string> {
  const scale = options.scale || 2.5;
  return renderStripToPng(element, scale, options.transparent);
}

export async function downloadStripAsPNG(
  element: HTMLElement,
  filename: string = 'striply-photo-strip.png',
  options: { scale?: number; transparent?: boolean } = {}
) {
  try {
    const scale = options.scale || 3; // high resolution for crisp print/share

    const dataUrl = await renderStripToPng(element, scale, options.transparent);

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
  layoutType: '2x6' | '4x6_double' | 'a4_grid' = '2x6'
) {
  try {
    const sourceWidth = element.clientWidth;
    const sourceHeight = element.clientHeight;
    const dataUrl = await renderStripToPng(element, 3);

    if (layoutType === '2x6') {
      // 2x6 inches = 50.8mm x 152.4mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [2, 6]
      });

      const placement = fitImageWithin(sourceWidth, sourceHeight, {
        x: 0,
        y: 0,
        width: 2,
        height: 6
      });
      pdf.addImage(dataUrl, 'PNG', placement.x, placement.y, placement.width, placement.height, STRIP_ALIAS);
      pdf.save(filename);
    } else if (layoutType === '4x6_double') {
      // 4x6 inches = print 2 strips side-by-side
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [4, 6]
      });

      const leftPlacement = fitImageWithin(sourceWidth, sourceHeight, {
        x: 0.1,
        y: 0.1,
        width: 1.85,
        height: 5.8
      });
      const rightPlacement = fitImageWithin(sourceWidth, sourceHeight, {
        x: 2.05,
        y: 0.1,
        width: 1.85,
        height: 5.8
      });
      pdf.addImage(
        dataUrl,
        'PNG',
        leftPlacement.x,
        leftPlacement.y,
        leftPlacement.width,
        leftPlacement.height,
        STRIP_ALIAS
      );
      pdf.addImage(
        dataUrl,
        'PNG',
        rightPlacement.x,
        rightPlacement.y,
        rightPlacement.width,
        rightPlacement.height,
        STRIP_ALIAS
      );
      pdf.save(filename);
    } else {
      // A4 grid (8.27 x 11.69 inches)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Render 3 strips side by side on A4 without stretching their template proportions.
      [15, 77, 139].forEach((x) => {
        const placement = fitImageWithin(sourceWidth, sourceHeight, {
          x,
          y: 15,
          width: 55,
          height: 165
        });
        pdf.addImage(dataUrl, 'PNG', placement.x, placement.y, placement.width, placement.height, STRIP_ALIAS);
      });
      pdf.save(filename);
    }

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
