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

### Accounts and saved strips

Sign-in and saved strips are served by a Cloudflare Worker in `worker/`, with D1
for metadata and R2 for the images. The Vite app talks to it over HTTP; nothing
about accounts renders unless both `VITE_API_BASE_URL` and
`VITE_GOOGLE_CLIENT_ID` are set, so a deployment without them is the app exactly
as it was before.

Deployed API: `https://striply-api.striply.workers.dev`

Frontend environment variables:

```bash
VITE_API_BASE_URL=https://striply-api.striply.workers.dev
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Worker configuration lives in `wrangler.toml`, except the signing secret:

```bash
# never echo the value; piping keeps it out of scrollback
openssl rand -base64 32 | wrangler secret put SESSION_SECRET
```

Local development needs two processes and two gitignored files — `.dev.vars`
for the Worker and `.env.local` for the app:

```bash
npm run dev:api   # Worker on :8787, local D1 and R2
npm run dev       # app on :3000
npm run api:schema  # apply schema.sql to the LOCAL database
```

Local and remote D1 are separate databases, and the local one is keyed by
`database_id` — changing that value in `wrangler.toml` orphans the schema you
already applied, and the app then fails with a 500 on sign-in. Apply the schema
to each explicitly:

```bash
wrangler d1 execute striply --local  --file worker/schema.sql
wrangler d1 execute striply --remote --file worker/schema.sql
```

Google sign-in needs the page's origin registered under **Authorised JavaScript
origins** on the OAuth client — the API's origin is irrelevant to Google. Each
Vercel preview deployment gets a fresh hostname and Google has no wildcard for
origins, so previews cannot sign in; test on `http://localhost:3000` or on a
stable domain.

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
