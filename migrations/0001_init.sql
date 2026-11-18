-- QA Interview Hub — initial schema
-- Tables: users, sessions, question_progress, bookmarks
--
-- Apply with:
--   npx wrangler d1 migrations apply qa-interview-hub-db --local     (local dev)
--   npx wrangler d1 migrations apply qa-interview-hub-db --remote    (production)
--
-- Timing note: timestamps are stored as ISO-8601 UTC strings
-- (e.g. 2026-11-18T12:00:00.000Z) so they sort correctly as TEXT.

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    -- Supports the "disabling a user" requirement: a disabled user keeps their
    -- row (and history) but cannot authenticate.
    is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Case-insensitive unique email — prevents duplicate registrations.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    -- Only the SHA-256 hash of the session token is stored, never the token itself.
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Session lookups go through token_hash; deleting a user cascades to sessions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- ---------------------------------------------------------------------------
-- question_progress
-- question_key is globally unique, e.g. "qa:1", "selenium:1", "java:1".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_progress (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    question_key TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    -- One completion record per user + question (duplicate prevention).
    UNIQUE (user_id, question_key)
);

CREATE INDEX IF NOT EXISTS idx_progress_user_id ON question_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_completed
    ON question_progress (user_id, completed_at DESC);

-- ---------------------------------------------------------------------------
-- bookmarks
-- Revision list — deliberately separate from completion progress.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookmarks (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    question_key TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    -- One bookmark per user + question.
    UNIQUE (user_id, question_key)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks (user_id);
