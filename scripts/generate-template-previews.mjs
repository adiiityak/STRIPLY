import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const host = '127.0.0.1';
const port = 4175;
const baseUrl = `http://${host}:${port}`;
const outputDirectory = path.resolve('public/template-previews');
// StripCanvas includes production-only typewriter captions and decorative CSS motion. The
// preview assets are committed, so capture them only once every canvas has reached a stable
// visual state rather than at an arbitrary animation frame.
const previewSettleTimeMs = 4_000;
const freezePreviewMotionCss = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
`;

function waitForVite(child) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for Vite to start')), 30_000);
    const onOutput = (chunk) => {
      const output = chunk.toString();
      if (output.includes(baseUrl) || output.includes(`:${port}/`)) {
        clearTimeout(timeout);
        child.stdout?.off('data', onOutput);
        child.stderr?.off('data', onOutput);
        resolve();
      }
    };
    child.stdout?.on('data', onOutput);
    child.stderr?.on('data', onOutput);
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Vite stopped before starting (exit ${code ?? 'unknown'})`));
    });
  });
}

async function main() {
  mkdirSync(outputDirectory, { recursive: true });
  const vite = spawn('npm', ['exec', 'vite', '--', '--host', host, '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let browser;

  try {
    await waitForVite(vite);
    browser = await chromium.launch();
    const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/template-previews.html`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-template-preview-ready="true"]');
    await page.addStyleTag({ content: freezePreviewMotionCss });
    await page.waitForTimeout(previewSettleTimeMs);

    const templateIds = await page.locator('[data-template-preview]').evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-template-preview')).filter(Boolean)
    );
    if (templateIds.length === 0) {
      throw new Error('The preview page did not expose any template IDs');
    }

    for (const templateId of templateIds) {
      const canvas = page
        .locator(`[data-template-preview="${templateId}"]`)
        .locator('#striply-canvas');
      await canvas.screenshot({ path: path.join(outputDirectory, `${templateId}.png`) });
    }

    const expectedAssetNames = templateIds.map((templateId) => `${templateId}.png`);
    const previewAssetNames = readdirSync(outputDirectory).filter((fileName) => fileName.endsWith('.png'));
    const unexpectedAssetNames = previewAssetNames.filter(
      (fileName) => !expectedAssetNames.includes(fileName)
    );
    if (unexpectedAssetNames.length > 0) {
      throw new Error(`Unexpected template preview assets: ${unexpectedAssetNames.join(', ')}`);
    }

    const nonEmptyAssets = previewAssetNames.filter(
      (fileName) => statSync(path.join(outputDirectory, fileName)).size > 0
    );
    const missingOrEmptyAssets = expectedAssetNames.filter((fileName) => {
      const assetPath = path.join(outputDirectory, fileName);
      return !existsSync(assetPath) || statSync(assetPath).size === 0;
    });
    if (
      previewAssetNames.length !== templateIds.length ||
      nonEmptyAssets.length !== templateIds.length ||
      missingOrEmptyAssets.length > 0
    ) {
      throw new Error(
        `Expected ${templateIds.length} non-empty preview PNGs but found ${nonEmptyAssets.length}`
      );
    }

    console.log(`Generated ${nonEmptyAssets.length}/${templateIds.length} template previews`);
    await context.close();
  } finally {
    await browser?.close();
    vite.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
