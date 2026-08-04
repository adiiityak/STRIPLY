import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';

export async function exportStripToDataUrl(
  element: HTMLElement,
  options: { scale?: number; transparent?: boolean } = {}
): Promise<string> {
  const scale = options.scale || 2.5;
  return await toPng(element, {
    quality: 0.95,
    pixelRatio: scale,
    backgroundColor: options.transparent ? 'transparent' : undefined,
    cacheBust: true,
    filter: (node) => {
      if (node instanceof HTMLElement && node.classList.contains('no-export')) {
        return false;
      }
      return true;
    }
  });
}

export async function downloadStripAsPNG(
  element: HTMLElement,
  filename: string = 'striply-photo-strip.png',
  options: { scale?: number; transparent?: boolean } = {}
) {
  try {
    const scale = options.scale || 3; // high resolution for crisp print/share

    const dataUrl = await toPng(element, {
      quality: 0.98,
      pixelRatio: scale,
      backgroundColor: options.transparent ? 'transparent' : undefined,
      cacheBust: true,
      filter: (node) => {
        // Exclude UI control overlay handles from final image export
        if (node instanceof HTMLElement && node.classList.contains('no-export')) {
          return false;
        }
        return true;
      }
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();

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

export async function downloadStripAsPDF(
  element: HTMLElement,
  filename: string = 'striply-photo-strip.pdf',
  layoutType: '2x6' | '4x6_double' | 'a4_grid' = '2x6'
) {
  try {
    const dataUrl = await toPng(element, {
      quality: 0.98,
      pixelRatio: 3,
      cacheBust: true,
      filter: (node) => {
        if (node instanceof HTMLElement && node.classList.contains('no-export')) {
          return false;
        }
        return true;
      }
    });

    if (layoutType === '2x6') {
      // 2x6 inches = 50.8mm x 152.4mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [2, 6]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, 2, 6);
      pdf.save(filename);
    } else if (layoutType === '4x6_double') {
      // 4x6 inches = print 2 strips side-by-side
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [4, 6]
      });

      // Left strip
      pdf.addImage(dataUrl, 'PNG', 0.1, 0.1, 1.85, 5.8);
      // Right strip
      pdf.addImage(dataUrl, 'PNG', 2.05, 0.1, 1.85, 5.8);
      pdf.save(filename);
    } else {
      // A4 grid (8.27 x 11.69 inches)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Render 3 strips side by side on A4 sheet
      pdf.addImage(dataUrl, 'PNG', 15, 15, 55, 165);
      pdf.addImage(dataUrl, 'PNG', 77, 15, 55, 165);
      pdf.addImage(dataUrl, 'PNG', 139, 15, 55, 165);
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
