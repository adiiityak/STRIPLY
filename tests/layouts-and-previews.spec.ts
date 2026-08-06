import { expect, test } from '@playwright/test';

test('switches between vertical and grid geometry', async ({ page }) => {
  await page.goto('/');
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
