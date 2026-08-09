import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import { inlineOklchFallbacks } from './oklch';

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

async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));

  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        // Resolve on error rather than reject: one unloadable image must not abort the whole
        // export and leave the user with no file at all.
        await new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
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
    const canvas = await html2canvas(element, {
      scale,
      // The strip paints its own background, so leave the canvas transparent underneath and
      // let that show through, matching what the previous renderer produced.
      backgroundColor: null,
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 20_000,
      ignoreElements: (node) => node.classList?.contains('no-export') ?? false
    });

    return canvas.toDataURL('image/png');
  } finally {
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

export async function downloadStripAsPNG(
  element: HTMLElement,
  filename: string = 'striply-photo-strip.png',
  options: { scale?: number; transparent?: boolean } = {}
) {
  try {
    const scale = options.scale || 2.5;

    const dataUrl = await renderStripToPng(element, scale, options.transparent);
    const blob = dataUrlToBlob(dataUrl);
    const file = new File([blob], filename, { type: 'image/png' });

    // The share sheet is the cleanest way to save on a phone, where a plain download is awkward
    // to find afterwards. On a laptop it is the wrong behaviour: the user expects the file in
    // Downloads, not a "share to Messages/Notes" dialog.
    //
    // `navigator.canShare({ files })` alone does not distinguish the two -- it is true on macOS
    // Safari and desktop Chrome as well, which is why laptops were getting the share sheet. Gate
    // it on the pointer type too: a phone or tablet reports a coarse primary pointer and no
    // hover, a laptop does not.
    const prefersShareSheet =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse) and (any-hover: none)').matches;

    if (prefersShareSheet && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Striply Photo Strip'
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
    const dataUrl = await renderStripToPng(element, 2.5);

    let pdf: jsPDF;

    if (layoutType === '2x6') {
      // 2x6 inches = 50.8mm x 152.4mm
      pdf = new jsPDF({
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
      pdf.addImage(dataUrl, 'PNG', placement.x, placement.y, placement.width, placement.height, STRIP_ALIAS, 'FAST');
    } else if (layoutType === '4x6_double') {
      // 4x6 inches = print 2 strips side-by-side
      pdf = new jsPDF({
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
        STRIP_ALIAS,
        'FAST'
      );
      pdf.addImage(
        dataUrl,
        'PNG',
        rightPlacement.x,
        rightPlacement.y,
        rightPlacement.width,
        rightPlacement.height,
        STRIP_ALIAS,
        'FAST'
      );
    } else {
      // A4 grid (8.27 x 11.69 inches)
      pdf = new jsPDF({
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
    }

    const pdfArrayBuffer = pdf.output('arraybuffer');
    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

    // Mobile Web Share API
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
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
