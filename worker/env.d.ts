/**
 * Bindings and secrets the Worker expects. Configured in wrangler.toml.
 *
 * Note there is deliberately no `/// <reference types="@cloudflare/workers-types" />`
 * here. Referencing it from a .d.ts inside the app's programme replaces the DOM
 * globals project-wide -- Cloudflare's `Response.json()` returns `unknown` where
 * the DOM's returns `any` -- which breaks frontend code that never asked for
 * Worker types. The Worker gets those types from worker/tsconfig.json instead.
 */
export interface Env {
  DB: D1Database;
  STRIPS: R2Bucket;
  /** Google OAuth client ID. Public by nature, but must match the frontend's. */
  GOOGLE_CLIENT_ID: string;
  /** Secret used to sign Striply session tokens. `wrangler secret put SESSION_SECRET`. */
  SESSION_SECRET: string;
  /** Comma-separated list of origins allowed to call this API. */
  ALLOWED_ORIGINS: string;
}
