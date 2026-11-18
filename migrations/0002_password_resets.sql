-- Self-service password reset.
--
-- A reset link carries a random token; only its SHA-256 hash is stored, so a
-- database leak cannot be used to reset anyone's password. Each token is
-- single use and expires 24 hours after it is issued.

CREATE TABLE IF NOT EXISTS password_resets (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at    TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_resets_token_hash
    ON password_resets (token_hash);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id
    ON password_resets (user_id);
