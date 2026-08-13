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
  expect(metrics.colourfulRatio).toBeGreaterThan(0.08);
});
