-- Striply accounts and saved strips.
--
-- Apply with:
--   wrangler d1 execute striply --local  --file worker/schema.sql
--   wrangler d1 execute striply --remote --file worker/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  -- Google's stable subject claim. Email is not a key: people change theirs,
  -- and Google explicitly documents `sub` as the only durable identifier.
  google_sub  TEXT NOT NULL UNIQUE,
  email       TEXT,
  name        TEXT,
  picture     TEXT,
  created_at  INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS strips (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Object key in R2. The bucket stays private; images are streamed through the
  -- Worker so ownership is checked on every read.
  r2_key      TEXT NOT NULL,
  template_id TEXT,
  layout      TEXT,
  width       INTEGER,
  height      INTEGER,
  bytes       INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);

-- The gallery query: a user's strips, newest first.
CREATE INDEX IF NOT EXISTS strips_by_user ON strips (user_id, created_at DESC);
