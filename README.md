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
- Create a **Long-Distance Booth** room, share its six-character code, and take
  synchronized side-by-side photos with a partner. Either person can control
  the countdown, retakes, shared background, and final handoff to the editor.
- Apply templates, filters, captions, dates, frames, and stickers.
- Choose **1 × 4** or **2 × 2** in the editor's **Photo Layout** control.
- Browse templates by their visual previews in the template picker.
- Export a high-quality PNG or a proportionally sized PDF, or use the share
  action on supported devices.

Some specialized templates support only the vertical 1 × 4 strip because their
artwork, labels, and decorative elements are designed around that format. The
2 × 2 option is disabled for those templates; choose a template that supports
both layouts to switch between them.

### Long-distance booth deployment

Room state and WebRTC signaling use Socket.IO on the same server as the app.
On Vercel, the project uses the **Services** framework preset. `vercel.json`
deploys the Vite app as the `web` service and a persistent Node/Socket.IO
backend as the `room` service. Requests to `/api/socket-io/socket.io` are routed
to that backend.
Socket connections reconnect when a function reaches its maximum duration.
For reliable calls across mobile networks, create a TURN key in Cloudflare
Realtime and configure these server-side environment variables on the deployed
room service:

```bash
CLOUDFLARE_TURN_KEY_ID=your-turn-key-id
CLOUDFLARE_TURN_API_TOKEN=your-turn-key-api-token
```

Do not prefix either variable with `VITE_`: the permanent values must never be
included in the browser bundle. The room service exchanges them for one-hour
temporary credentials, and the browser falls back to the existing STUN/static
TURN configuration if Cloudflare is temporarily unavailable. An unhealthy call
first attempts an ICE restart; repeated or wedged failures rebuild the peer
connection and ask the creator for a fresh offer automatically. Background
removal runs in the browser only when selected; if the optional model cannot
load, capture safely falls back to the original camera frames.

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
