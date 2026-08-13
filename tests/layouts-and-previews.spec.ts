import { expect, test } from '@playwright/test';
import path from 'node:path';

test('switches between vertical and grid geometry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /explore the app first/i }).click();
  const canvas = page.locator('#striply-canvas');
  await expect(canvas).toHaveAttribute('data-photo-layout', 'vertical-1x4');
  await page.getByTestId('layout-grid-2x2').click();
  await expect(canvas).toHaveAttribute('data-photo-layout', 'grid-2x2');
  await expect(canvas.locator('[data-photo-slot]')).toHaveCount(4);
});

test('shows real preview images and produces a non-empty share raster', async ({ page }) => {
  await page.goto('/');
  const activeCard = page.getByTestId('template-card-airmail');
  await expect(activeCard.getByRole('img')).toBeVisible();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const preview = page.getByRole('img', { name: 'Strip Thumbnail' });
  await expect(preview).toBeVisible();
  const size = await preview.evaluate((image: HTMLImageElement) => ({
    width: image.naturalWidth,
    height: image.naturalHeight
  }));
  expect(size.width).toBeGreaterThan(0);
  expect(size.height).toBeGreaterThan(size.width);
});

test('export raster contains the complete strip instead of transparent or blank pixels', async ({ page }) => {
  await page.goto('/');
  const fixtures = [
    'pattern-love-notes.png',
    'pattern-blue-heart-tunnel.png',
    'pattern-sunflowers.png',
    'pattern-red-gingham.png'
  ].map((name) => path.join(process.cwd(), 'public', 'template-previews', name));
  await page.locator('input[type="file"]').setInputFiles(fixtures);
  await expect(page.locator('#striply-canvas img')).toHaveCount(4);

  const metrics = await page.evaluate(async () => {
    // The import is intentionally resolved by the running Vite app, not Node/TypeScript.
    const moduleUrl = '/src/utils/exportUtils.ts';
    const { exportStripToDataUrl } = await import(/* @vite-ignore */ moduleUrl);
    const strip = document.querySelector<HTMLElement>('#striply-canvas');
    if (!strip) throw new Error('strip canvas not found');
    const dataUrl = await exportStripToDataUrl(strip, { scale: 1 });
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('2d context not found');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    let nonWhite = 0;
    let colourful = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] > 0) opaque += 1;
      if (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245) nonWhite += 1;
      if (
        Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) -
          Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) >
        30
      ) {
        colourful += 1;
      }
    }
    const total = pixels.length / 4;
    return {
      width: canvas.width,
      height: canvas.height,
      opaqueRatio: opaque / total,
      nonWhiteRatio: nonWhite / total,
      colourfulRatio: colourful / total
    };
  });

  expect(metrics.width).toBeGreaterThan(200);
  expect(metrics.height).toBeGreaterThan(metrics.width);
  expect(metrics.opaqueRatio).toBeGreaterThan(0.98);
  expect(metrics.nonWhiteRatio).toBeGreaterThan(0.15);
  // The selected template applies a subdued filter, so saturated pixels occupy only part of the
  // full strip. Slot-specific tests below verify each photo separately; this remains a broad
  // guard against an entirely neutral/blank raster.
  expect(metrics.colourfulRatio).toBeGreaterThan(0.04);
});

test('downsizes full-resolution uploads before they enter the strip renderer', async ({ page }) => {
  await page.goto('/');
  const cameraSizedSvg = (colour: string, label: string) => Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="4032" height="3024">
      <rect width="4032" height="3024" fill="${colour}" />
      <text x="2016" y="1512" fill="white" font-size="420" text-anchor="middle">${label}</text>
    </svg>
  `);

  await page.locator('input[type="file"]').setInputFiles([
    { name: 'camera-1.svg', mimeType: 'image/svg+xml', buffer: cameraSizedSvg('#b91c1c', 'ONE') },
    { name: 'camera-2.svg', mimeType: 'image/svg+xml', buffer: cameraSizedSvg('#1d4ed8', 'TWO') },
    { name: 'camera-3.svg', mimeType: 'image/svg+xml', buffer: cameraSizedSvg('#15803d', 'THREE') },
    { name: 'camera-4.svg', mimeType: 'image/svg+xml', buffer: cameraSizedSvg('#7e22ce', 'FOUR') }
  ]);

  const images = page.locator('#striply-canvas img');
  await expect(images).toHaveCount(4);
  await expect.poll(async () => images.evaluateAll((nodes: HTMLImageElement[]) =>
    nodes.map((image) => ({ width: image.naturalWidth, height: image.naturalHeight }))
  )).toEqual([
    { width: 1600, height: 1200 },
    { width: 1600, height: 1200 },
    { width: 1600, height: 1200 },
    { width: 1600, height: 1200 }
  ]);

  const slotColours = await page.evaluate(async () => {
    const moduleUrl = '/src/utils/exportUtils.ts';
    const { exportStripToDataUrl } = await import(/* @vite-ignore */ moduleUrl);
    const strip = document.querySelector<HTMLElement>('#striply-canvas');
    if (!strip) throw new Error('strip canvas not found');
    const stripRect = strip.getBoundingClientRect();
    const samplePoints = Array.from(strip.querySelectorAll<HTMLImageElement>('[data-photo-slot] img')).map(
      (image) => {
        const rect = image.getBoundingClientRect();
        return {
          x: Math.round(rect.left - stripRect.left + rect.width * 0.15),
          y: Math.round(rect.top - stripRect.top + rect.height * 0.15)
        };
      }
    );
    const exported = new Image();
    exported.src = await exportStripToDataUrl(strip, { scale: 1 });
    await exported.decode();
    const canvas = document.createElement('canvas');
    canvas.width = exported.naturalWidth;
    canvas.height = exported.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2d context not found');
    context.drawImage(exported, 0, 0);
    return samplePoints.map(({ x, y }) => Array.from(context.getImageData(x, y, 1, 1).data.slice(0, 3)));
  });

  expect(slotColours[0][0]).toBeGreaterThan(slotColours[0][1] * 2);
  expect(slotColours[1][2]).toBeGreaterThan(slotColours[1][0] * 1.5);
  expect(slotColours[2][1]).toBeGreaterThan(slotColours[2][0] * 1.5);
  expect(slotColours[3][0]).toBeGreaterThan(slotColours[3][1] * 1.5);
  expect(slotColours[3][2]).toBeGreaterThan(slotColours[3][1] * 1.5);
});

test('export preserves cover cropping and CSS image filters', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const source = document.createElement('canvas');
    source.width = 600;
    source.height = 100;
    const sourceContext = source.getContext('2d');
    if (!sourceContext) throw new Error('source context unavailable');
    sourceContext.fillStyle = '#ff0000';
    sourceContext.fillRect(0, 0, 200, 100);
    sourceContext.fillStyle = '#00ff00';
    sourceContext.fillRect(200, 0, 200, 100);
    sourceContext.fillStyle = '#0000ff';
    sourceContext.fillRect(400, 0, 200, 100);

    const target = document.createElement('div');
    target.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:200px;overflow:hidden;background:white';
    const photo = document.createElement('img');
    photo.dataset.exportPhoto = '';
    photo.src = source.toDataURL('image/png');
    photo.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:50% 50%;filter:grayscale(1)';
    target.appendChild(photo);
    document.body.appendChild(target);
    await photo.decode();

    const moduleUrl = '/src/utils/exportUtils.ts';
    const { exportStripToDataUrl } = await import(/* @vite-ignore */ moduleUrl);
    const exported = new Image();
    exported.src = await exportStripToDataUrl(target, { scale: 1 });
    await exported.decode();
    const output = document.createElement('canvas');
    output.width = exported.naturalWidth;
    output.height = exported.naturalHeight;
    const outputContext = output.getContext('2d');
    if (!outputContext) throw new Error('output context unavailable');
    outputContext.drawImage(exported, 0, 0);
    const left = Array.from(outputContext.getImageData(5, 100, 1, 1).data.slice(0, 3));
    const centre = Array.from(outputContext.getImageData(100, 100, 1, 1).data.slice(0, 3));
    const right = Array.from(outputContext.getImageData(195, 100, 1, 1).data.slice(0, 3));
    target.remove();
    return { left, centre, right };
  });

  // A 6:1 source covering a square must crop away the red and blue thirds. The remaining green
  // centre is grayscale-filtered, so every sampled channel is approximately equal.
  for (const sample of [result.left, result.centre, result.right]) {
    expect(Math.max(...sample) - Math.min(...sample)).toBeLessThan(8);
    expect(sample[0]).toBeGreaterThan(100);
  }
});
