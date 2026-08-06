# Layouts and Visual Template Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add selectable `1×4` and `2×2` photo layouts and replace text-only template cards with generated previews from the real Striply renderer.

**Architecture:** Add an explicit photo-layout domain model and keep geometry calculations in pure utilities consumed by `StripCanvas`. Generate static template preview PNGs from a dedicated Vite page using Playwright, then display those lightweight assets in a responsive, accessible template browser.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Vitest 4, Testing Library, Playwright Chromium.

## Global Constraints

- `vertical-1x4` and `grid-2x2` each present exactly four slots in the guided layout picker.
- The existing two-to-six photo count remains available for `vertical-1x4` outside the guided four-shot flow.
- Selecting `grid-2x2` sets `photoCount` to `4` and disables the photo-count control until vertical layout is selected.
- Existing templates, solo webcam capture, PNG/PDF export, and system sharing must keep working.
- Specialized templates may explicitly support vertical layout only; the UI must explain a disabled grid choice.
- Template preview PNGs must be rendered from `StripCanvas`, generated ahead of time, and checked into `public/template-previews/`.
- Template cards must show the preview, the template name below it, a visible selected state, and `aria-pressed`.
- Missing preview assets must fall back to the existing color/category treatment.
- No room, Socket.IO, WebRTC, or background-removal code belongs in this plan.

## File map

- `src/types.ts`: `PhotoLayout` and `StripConfiguration.photoLayout` contracts.
- `src/data/templates.ts`: template defaults and supported-layout metadata.
- `src/utils/photoLayout.ts`: normalization, slot count, compatibility, and config transition helpers.
- `src/utils/photoLayout.test.ts`: layout-domain regression tests.
- `src/utils/stripLayout.ts`: vertical/grid geometry calculations.
- `src/utils/stripLayout.test.ts`: exact geometry tests.
- `src/components/LayoutPicker.tsx`: accessible `1×4`/`2×2` selector.
- `src/components/LayoutPicker.test.tsx`: interaction and disabled-state tests.
- `src/components/StripCanvas.tsx`: grid/flex rendering based on calculated geometry.
- `src/components/TemplatePreviewCard.tsx`: preview image, label, fallback, and selected state.
- `src/components/TemplatePreviewCard.test.tsx`: preview-card behavior tests.
- `src/components/ControlsPanel.tsx`: integrates layout and template selectors.
- `src/data/previewPhotos.ts`: deterministic local SVG photo fixtures for preview generation.
- `src/template-previews-main.tsx`: isolated preview-generation page entry.
- `template-previews.html`: Vite HTML entry used only by the generator.
- `scripts/generate-template-previews.mjs`: starts Vite, screenshots real template canvases, and validates output.
- `public/template-previews/*.png`: generated assets.
- `vite.config.ts`: Vitest browser-like test setup and multi-page development entry compatibility.
- `vitest.setup.ts`: Testing Library DOM matchers.
- `playwright.config.ts`: local browser-test server and Chromium configuration.
- `tests/layouts-and-previews.spec.ts`: end-to-end layout, preview, and export smoke coverage.
- `package.json`, `package-lock.json`: test/generation dependencies and scripts.

---

### Task 1: Add the photo-layout domain model

**Files:**
- Create: `src/utils/photoLayout.ts`
- Create: `src/utils/photoLayout.test.ts`
- Modify: `src/types.ts`
- Modify: `src/data/templates.ts`

**Interfaces:**
- Produces: `PhotoLayout = 'vertical-1x4' | 'grid-2x2'`.
- Produces: `normalizePhotoLayout(value): PhotoLayout`.
- Produces: `getGuidedSlotCount(layout): 4`.
- Produces: `isLayoutSupported(layout, supportedLayouts): boolean`.
- Produces: `applyPhotoLayout(config, layout): StripConfiguration`.
- Produces: `TemplateDefinition.supportedLayouts: readonly PhotoLayout[]`.

- [x] **Step 1: Write the failing domain tests**

Create `src/utils/photoLayout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TEMPLATE_DEFINITIONS } from '../data/templates';
import {
  applyPhotoLayout,
  getGuidedSlotCount,
  isLayoutSupported,
  normalizePhotoLayout
} from './photoLayout';

describe('photo layout domain', () => {
  it('falls back to the vertical layout for unknown stored values', () => {
    expect(normalizePhotoLayout('diagonal')).toBe('vertical-1x4');
  });

  it('uses four slots for both guided layouts', () => {
    expect(getGuidedSlotCount('vertical-1x4')).toBe(4);
    expect(getGuidedSlotCount('grid-2x2')).toBe(4);
  });

  it('sets grid layout, four photos, and the 4×6 export format together', () => {
    const next = applyPhotoLayout(TEMPLATE_DEFINITIONS[0].config, 'grid-2x2');
    expect(next.photoLayout).toBe('grid-2x2');
    expect(next.photoCount).toBe(4);
    expect(next.exportFormat).toBe('strip4x6');
  });

  it('reports unsupported grid layouts', () => {
    expect(isLayoutSupported('grid-2x2', ['vertical-1x4'])).toBe(false);
  });

  it('declares layout support for every template', () => {
    expect(TEMPLATE_DEFINITIONS.every((template) => template.supportedLayouts.length > 0)).toBe(true);
  });
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `npm test -- src/utils/photoLayout.test.ts`

Expected: FAIL because `./photoLayout` and the new configuration fields do not exist.

- [x] **Step 3: Add the types and pure transitions**

In `src/types.ts` add:

```ts
export type PhotoLayout = 'vertical-1x4' | 'grid-2x2';

export interface StripConfiguration {
  // existing fields...
  photoLayout: PhotoLayout;
}
```

In `src/data/templates.ts`, add `supportedLayouts` to `TemplateDefinition` and `photoLayout: 'vertical-1x4'` to every configuration. Use both layouts by default. Limit these specialized templates to vertical layout: `boardingpass`, `ticketstub`, `film`, `selene`, `musicplayer`, `ioslockscreen`, `spotifydark`, `imessage`, and `boothycall`.

Create `src/utils/photoLayout.ts`:

```ts
import type { PhotoLayout, StripConfiguration } from '../types';

export const GUIDED_LAYOUTS: readonly PhotoLayout[] = ['vertical-1x4', 'grid-2x2'];

export function normalizePhotoLayout(value: unknown): PhotoLayout {
  return value === 'grid-2x2' ? 'grid-2x2' : 'vertical-1x4';
}

export function getGuidedSlotCount(_layout: PhotoLayout): 4 {
  return 4;
}

export function isLayoutSupported(
  layout: PhotoLayout,
  supportedLayouts: readonly PhotoLayout[]
): boolean {
  return supportedLayouts.includes(layout);
}

export function applyPhotoLayout(
  config: StripConfiguration,
  layout: PhotoLayout
): StripConfiguration {
  return {
    ...config,
    photoLayout: layout,
    photoCount: 4,
    exportFormat: layout === 'grid-2x2' ? 'strip4x6' : 'strip2x6'
  };
}
```

- [x] **Step 4: Run domain and full tests**

Run: `npm test -- src/utils/photoLayout.test.ts`

Expected: PASS, 5 tests.

Run: `npm test`

Expected: all existing and new tests PASS.

- [x] **Step 5: Commit the domain model**

```bash
git add src/types.ts src/data/templates.ts src/utils/photoLayout.ts src/utils/photoLayout.test.ts
git commit -m "feat: add photo layout domain model"
```

---

### Task 2: Calculate and render `1×4` and `2×2` geometry

**Files:**
- Modify: `src/utils/stripLayout.ts`
- Modify: `src/utils/stripLayout.test.ts`
- Modify: `src/components/StripCanvas.tsx`

**Interfaces:**
- Consumes: `PhotoLayout` from Task 1.
- Produces: `computePhotoAreaLayout(layout, metrics): PhotoAreaLayout`.
- `PhotoAreaLayout` contains `columns`, `rows`, `gap`, and `height`.

- [x] **Step 1: Write failing geometry tests**

Append to `src/utils/stripLayout.test.ts`:

```ts
import { computePhotoAreaLayout } from './stripLayout';

describe('computePhotoAreaLayout', () => {
  const metrics = { columnWidth: 236, framePadding: 12, photoGap: 14 };

  it('keeps the existing 774px vertical photo area', () => {
    expect(computePhotoAreaLayout('vertical-1x4', metrics)).toEqual({
      columns: 1,
      rows: 4,
      gap: 14,
      height: 774
    });
  });

  it('calculates two equal columns and rows without changing 4:3 photo proportions', () => {
    const layout = computePhotoAreaLayout('grid-2x2', metrics);
    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(2);
    expect(layout.gap).toBe(14);
    expect(layout.height).toBeCloseTo(192.5);
  });
});
```

- [x] **Step 2: Run the geometry test and verify RED**

Run: `npm test -- src/utils/stripLayout.test.ts`

Expected: FAIL because `computePhotoAreaLayout` is not exported.

- [x] **Step 3: Implement the pure geometry calculation**

Add to `src/utils/stripLayout.ts`:

```ts
import type { PhotoLayout } from '../types';

export interface PhotoAreaLayout {
  columns: 1 | 2;
  rows: 2 | 4;
  gap: number;
  height: number;
}

export function computePhotoAreaLayout(
  layout: PhotoLayout,
  metrics: ColumnMetrics
): PhotoAreaLayout {
  if (layout === 'vertical-1x4') {
    return {
      columns: 1,
      rows: 4,
      gap: metrics.photoGap,
      height: computeColumnHeight(metrics)
    };
  }

  const cellWidth = (metrics.columnWidth - metrics.photoGap) / 2;
  const photoWidth = cellWidth - 2 * metrics.framePadding;
  const slotHeight = 2 * metrics.framePadding + photoWidth / (metrics.baseAspect ?? BASELINE_ASPECT);
  return {
    columns: 2,
    rows: 2,
    gap: metrics.photoGap,
    height: 2 * slotHeight + metrics.photoGap
  };
}
```

- [x] **Step 4: Update `StripCanvas` to consume geometry**

In `src/components/StripCanvas.tsx`:

1. Normalize `config.photoLayout` once.
2. Replace the fixed flex-column photo-area style with a branch based on `PhotoAreaLayout`.
3. Keep the existing flex behavior for vertical layout.
4. Use CSS Grid for grid layout:

```ts
const photoArea = computePhotoAreaLayout(photoLayout, {
  columnWidth,
  framePadding: config.framePadding,
  photoGap: slotLayout.gap
});

const photoAreaStyle: React.CSSProperties = photoLayout === 'grid-2x2'
  ? {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
      gap: `${photoArea.gap}px`,
      height: `${photoArea.height}px`
    }
  : {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: `${photoArea.gap}px`,
      height: columnSizesToContent || photos.length === 0 ? undefined : `${photoArea.height}px`
    };
```

For grid slots, apply `{ minWidth: 0, minHeight: 0, height: '100%' }`; keep the existing `slotFlexStyle` only for vertical slots. Render placeholders through the same slot-style branch.

- [x] **Step 5: Run tests and type-check**

Run: `npm test -- src/utils/stripLayout.test.ts`

Expected: PASS, including the exact vertical and grid geometry cases.

Run: `npm run lint`

Expected: TypeScript exits 0.

- [x] **Step 6: Commit geometry and rendering**

```bash
git add src/utils/stripLayout.ts src/utils/stripLayout.test.ts src/components/StripCanvas.tsx
git commit -m "feat: render vertical and grid photo layouts"
```

---

### Task 3: Add the accessible layout selector

**Files:**
- Create: `src/components/LayoutPicker.tsx`
- Create: `src/components/LayoutPicker.test.tsx`
- Create: `vitest.setup.ts`
- Modify: `src/components/ControlsPanel.tsx`
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `PhotoLayout`, `GUIDED_LAYOUTS`, `isLayoutSupported`, and `applyPhotoLayout`.
- Produces: `LayoutPicker({ value, supportedLayouts, onChange })`.

- [x] **Step 1: Install DOM test dependencies**

Run:

```bash
npm install --save-dev @testing-library/jest-dom @testing-library/react jsdom
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Change the `defineConfig` import in `vite.config.ts` from `vite` to `vitest/config`, then add:

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['./vitest.setup.ts']
}
```

- [x] **Step 2: Write the failing component tests**

Create `src/components/LayoutPicker.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LayoutPicker } from './LayoutPicker';

describe('LayoutPicker', () => {
  it('selects the 2×2 layout', () => {
    const onChange = vi.fn();
    render(
      <LayoutPicker
        value="vertical-1x4"
        supportedLayouts={['vertical-1x4', 'grid-2x2']}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '2 by 2 grid' }));
    expect(onChange).toHaveBeenCalledWith('grid-2x2');
  });

  it('explains when the selected template cannot use a grid', () => {
    render(
      <LayoutPicker
        value="vertical-1x4"
        supportedLayouts={['vertical-1x4']}
        onChange={() => undefined}
      />
    );
    expect(screen.getByRole('button', { name: '2 by 2 grid' })).toBeDisabled();
    expect(screen.getByText('This template supports the vertical strip only.')).toBeVisible();
  });
});
```

- [x] **Step 3: Run the component test and verify RED**

Run: `npm test -- src/components/LayoutPicker.test.tsx`

Expected: FAIL because `LayoutPicker` does not exist.

- [x] **Step 4: Implement `LayoutPicker`**

Create two large tap targets with schematic slot graphics. Use `aria-pressed`, `disabled`, and the exact accessible names `1 by 4 vertical strip` and `2 by 2 grid`. The visual slot markup is:

```tsx
const cells = layout === 'vertical-1x4'
  ? 'grid grid-cols-1 grid-rows-4'
  : 'grid grid-cols-2 grid-rows-2';

<span aria-hidden className={`${cells} h-16 w-12 gap-1 rounded-md bg-[#2D2D2D] p-1`}>
  {Array.from({ length: 4 }, (_, index) => (
    <span key={index} className="rounded-[2px] bg-white" />
  ))}
</span>
```

- [x] **Step 5: Integrate it into `ControlsPanel`**

Place the selector before category filters. Find the active template definition and pass its `supportedLayouts`. On selection call:

```ts
onChangeConfig(applyPhotoLayout(config, nextLayout));
```

When `config.photoLayout === 'grid-2x2'`, disable the existing photo-count slider and display `2×2 uses exactly four photos. Switch to 1×4 for 2–6 photos.`

- [x] **Step 6: Run tests and commit**

Run: `npm test -- src/components/LayoutPicker.test.tsx`

Expected: PASS, 2 tests.

Run: `npm test && npm run lint`

Expected: all tests PASS and TypeScript exits 0.

```bash
git add package.json package-lock.json vite.config.ts vitest.setup.ts src/components/LayoutPicker.tsx src/components/LayoutPicker.test.tsx src/components/ControlsPanel.tsx
git commit -m "feat: add photo layout selector"
```

---

### Task 4: Generate real template preview assets

**Files:**
- Create: `src/data/previewPhotos.ts`
- Create: `src/template-previews-main.tsx`
- Create: `template-previews.html`
- Create: `scripts/generate-template-previews.mjs`
- Create: `public/template-previews/*.png`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `TEMPLATE_DEFINITIONS`, `StripCanvas`, and deterministic preview photos.
- Produces: one `public/template-previews/<template-id>.png` per template.
- Produces: `npm run previews:generate`.

- [x] **Step 1: Install Playwright and Chromium**

Run:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

Add scripts:

```json
{
  "previews:generate": "node scripts/generate-template-previews.mjs",
  "test:e2e": "playwright test"
}
```

- [x] **Step 2: Create deterministic local photo fixtures**

Create `src/data/previewPhotos.ts` with four SVG data URLs. Each SVG must use a different gradient and centered portrait silhouette so preview generation never depends on Unsplash or CORS:

```ts
import type { PhotoItem } from '../types';

function portraitSvg(from: string, to: string, shirt: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <rect width="600" height="450" fill="url(#g)"/><circle cx="300" cy="185" r="82" fill="#f2c6a5"/>
    <path d="M205 450c8-105 52-155 95-155s87 50 95 155" fill="${shirt}"/><path d="M224 172c8-88 146-109 161 7-35-42-112-55-161-7" fill="#302822"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const PREVIEW_PHOTOS: PhotoItem[] = [
  ['#ffd6e7', '#fef3c7', '#be185d'],
  ['#dbeafe', '#ede9fe', '#3730a3'],
  ['#dcfce7', '#cffafe', '#0f766e'],
  ['#ffedd5', '#fee2e2', '#c2410c']
].map(([from, to, shirt], index) => ({
  id: `preview-${index + 1}`,
  url: portraitSvg(from, to, shirt),
  cropX: 50,
  cropY: 50,
  zoom: 1
}));
```

- [x] **Step 3: Build the isolated generation page**

`template-previews.html` loads `/src/template-previews-main.tsx`. The React entry renders every template in a wrapper with `data-template-preview="<id>"`, using `StripCanvas`, `PREVIEW_PHOTOS`, no-op sticker callbacks, and `zoomLevel={1}`. Keep wrappers separated so identical canvas IDs do not affect screenshot selection.

- [x] **Step 4: Write the generator**

Create `scripts/generate-template-previews.mjs` that:

1. Creates `public/template-previews`.
2. Spawns `npm exec vite -- --host 127.0.0.1 --port 4175`.
3. Opens `http://127.0.0.1:4175/template-previews.html` with Playwright Chromium.
4. Waits for `[data-template-preview-ready="true"]`.
5. Reads all `data-template-preview` IDs.
6. Screenshots each wrapper's `#striply-canvas` to `<id>.png` at device scale factor `2`.
7. Fails if any file is missing or zero bytes.
8. Closes Chromium and terminates Vite in a `finally` block.

Use this exact readiness check in the page:

```ts
await Promise.all(
  Array.from(document.images).map((image) => image.decode().catch(() => undefined))
);
document.body.dataset.templatePreviewReady = 'true';
```

- [x] **Step 5: Generate and verify all assets**

Run: `npm run previews:generate`

Expected: exit 0 and a final generator message in the exact form `Generated <N>/<N> template previews`, where both values come from the page-derived template ID list. The generator itself must throw when the number of non-empty PNG files differs from that ID count.

- [x] **Step 6: Commit generator and assets**

```bash
git add package.json package-lock.json template-previews.html scripts/generate-template-previews.mjs src/data/previewPhotos.ts src/template-previews-main.tsx public/template-previews
git commit -m "feat: generate real template preview assets"
```

---

### Task 5: Replace template buttons with visual preview cards

**Files:**
- Create: `src/components/TemplatePreviewCard.tsx`
- Create: `src/components/TemplatePreviewCard.test.tsx`
- Modify: `src/components/ControlsPanel.tsx`

**Interfaces:**
- Consumes: `TemplateDefinition` and `/template-previews/<id>.png`.
- Produces: `TemplatePreviewCard({ template, selected, onSelect })`.

- [x] **Step 1: Write failing card tests**

Create `src/components/TemplatePreviewCard.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TEMPLATE_DEFINITIONS } from '../data/templates';
import { TemplatePreviewCard } from './TemplatePreviewCard';

describe('TemplatePreviewCard', () => {
  const template = TEMPLATE_DEFINITIONS[0];

  it('shows the generated preview, name, and selected state', () => {
    render(<TemplatePreviewCard template={template} selected onSelect={() => undefined} />);
    expect(screen.getByRole('img', { name: `${template.name} preview` })).toHaveAttribute(
      'src',
      `/template-previews/${template.id}.png`
    );
    expect(screen.getByRole('button', { name: template.name })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the color fallback when the preview cannot load', () => {
    render(<TemplatePreviewCard template={template} selected={false} onSelect={vi.fn()} />);
    fireEvent.error(screen.getByRole('img', { name: `${template.name} preview` }));
    expect(screen.getByTestId(`template-fallback-${template.id}`)).toBeVisible();
  });
});
```

- [x] **Step 2: Run the card test and verify RED**

Run: `npm test -- src/components/TemplatePreviewCard.test.tsx`

Expected: FAIL because `TemplatePreviewCard` does not exist.

- [x] **Step 3: Implement the preview card**

Use local `imageFailed` state. The button contains a portrait preview area, then the template name below it. Keep `title` for the tagline and `aria-pressed` for selection. The selected border is `#FF6B6B`; fallback uses `template.previewColor` plus the category icon treatment.

- [x] **Step 4: Integrate responsive browsing**

Remove the local `TemplateCard` from `ControlsPanel.tsx`. Render `TemplatePreviewCard` in:

- `grid grid-cols-2 xl:grid-cols-3 gap-3` on wide panels.
- `flex overflow-x-auto snap-x snap-mandatory gap-3` inside each category on narrow screens, with cards using `min-w-[132px] snap-center`.

Preserve category filtering and the existing rule that keeps user caption text and photo count when switching templates. Also preserve the current `photoLayout` when the next template supports it; otherwise switch to the template's first supported layout via `applyPhotoLayout`.

- [x] **Step 5: Run tests and commit**

Run: `npm test -- src/components/TemplatePreviewCard.test.tsx`

Expected: PASS, 2 tests.

Run: `npm test && npm run lint`

Expected: all tests PASS and TypeScript exits 0.

```bash
git add src/components/TemplatePreviewCard.tsx src/components/TemplatePreviewCard.test.tsx src/components/ControlsPanel.tsx
git commit -m "feat: show visual template preview cards"
```

---

### Task 6: Add browser coverage for layout, previews, and export rendering

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/layouts-and-previews.spec.ts`
- Modify: `src/components/LayoutPicker.tsx`
- Modify: `src/components/TemplatePreviewCard.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: user-visible layout buttons, template cards, `#striply-canvas`, and share preview.
- Produces: `npm run test:e2e` regression suite.

- [x] **Step 1: Add stable test attributes**

Add:

- `data-testid="layout-vertical-1x4"` and `data-testid="layout-grid-2x2"` to layout buttons.
- `data-testid="template-card-<id>"` to template cards.
- `data-photo-layout={photoLayout}` to `#striply-canvas`.
- `data-photo-slot` to every rendered photo slot and placeholder slot.

- [x] **Step 2: Configure Playwright**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4176', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: 'env PORT=4176 node --import tsx server.ts',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: true
  }
});
```

- [x] **Step 3: Write the browser tests**

Create `tests/layouts-and-previews.spec.ts`:

```ts
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
```

- [x] **Step 4: Run desktop and mobile browser tests**

Run: `npm run test:e2e`

Expected: both tests PASS in both projects, 4 passed total.

- [x] **Step 5: Commit browser coverage**

```bash
git add playwright.config.ts tests/layouts-and-previews.spec.ts package.json src/components/LayoutPicker.tsx src/components/TemplatePreviewCard.tsx src/components/StripCanvas.tsx
git commit -m "test: cover layouts and template previews"
```

---

### Task 7: Final regression verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-08-07-layouts-and-template-previews.md`

**Interfaces:**
- Consumes: all deliverables from Tasks 1–6.
- Produces: documented preview regeneration and verified release state.

- [x] **Step 1: Document the user-facing features**

Add a concise README section covering:

- Where to select `1×4` or `2×2`.
- Why some specialized templates disable `2×2`.
- How to regenerate previews with `npm run previews:generate`.
- The requirement to review regenerated PNG changes before committing.

- [x] **Step 2: Mark completed plan checkboxes**

As each task finishes, change its steps from `- [ ]` to `- [x]`. Do not mark a step complete before its command has exited successfully.

- [x] **Step 3: Run the complete verification suite**

Run:

```bash
npm test
npm run lint
npm run build
npm run test:e2e
git diff --check
```

Expected:

- Vitest reports zero failed tests.
- TypeScript exits 0.
- Vite and server builds exit 0.
- Playwright reports 4 passed tests.
- `git diff --check` prints no errors.

- [x] **Step 4: Verify generated asset completeness**

Run `npm run previews:generate` a second time, then `git status --short public/template-previews`.

Expected: no preview asset changes. A clean second generation proves the assets are deterministic.

- [x] **Step 5: Commit documentation and plan completion**

```bash
git add README.md docs/superpowers/plans/2026-08-07-layouts-and-template-previews.md
git commit -m "docs: document layouts and template previews"
```

## Release boundary

Completion of this plan produces a shippable editor release with both layouts and visual template browsing. The next implementation plan starts the temporary two-person Socket.IO room service and WebRTC signaling; the third plan adds synchronized composite capture and MediaPipe shared-background replacement.
