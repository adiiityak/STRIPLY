# Striply

Striply is a browser-based photobooth editor. Capture or upload photos, arrange
them in a designed strip, add filters and stickers, then download or share the
finished image or PDF.

## Prerequisites

- Node.js 22.22.2 or newer
- npm

## Install and run

```bash
npm install
npx playwright install chromium
npm run dev
```

Open the local URL printed by the server (normally `http://localhost:3000`).

## What you can do

- Capture photos with the live booth or upload existing images.
- Apply templates, filters, captions, dates, frames, and stickers.
- Choose **1 × 4** or **2 × 2** in the editor's **Photo Layout** control.
- Browse templates by their visual previews in the template picker.
- Export a high-quality PNG or a proportionally sized PDF, or use the share
  action on supported devices.

Some specialized templates support only the vertical 1 × 4 strip because their
artwork, labels, and decorative elements are designed around that format. The
2 × 2 option is disabled for those templates; choose a template that supports
both layouts to switch between them.

## Checks

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

## Template preview images

Template cards use generated local PNG previews. Regenerate them after changing
a template, its rendering, or the preview fixtures:

```bash
npm run previews:generate
```

Always inspect the regenerated files in `public/template-previews/` before
committing them. The generator is deterministic, so a second run with no source
changes should leave those PNG files unchanged.

## Production run

```bash
npm run build
npm start
```
