-- QA Interview Hub — Mock Interview Mode
-- Tables: interview_sessions, interview_turns, interview_reports
--
-- Apply with:
--   npx wrangler d1 migrations apply qa-interview-hub-db --local     (local dev)
--   npx wrangler d1 migrations apply qa-interview-hub-db --remote    (production)
--
-- Privacy note: nothing is written here until the signed-in user ticks the
-- consent box on the setup screen. The resume text, job description and the
-- transcript are only ever read back by their owner, and "delete session"
-- removes all three tables' rows for that session in one go.

-- ---------------------------------------------------------------------------
-- interview_sessions — one mock interview
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interview_sessions (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL,
    -- 'written' (typed answers) or 'voice' (spoken answers)
    mode             TEXT NOT NULL CHECK (mode IN ('written', 'voice')),
    -- 1 = coaching (feedback after every answer), 0 = interview (feedback at the end)
    coaching         INTEGER NOT NULL DEFAULT 1 CHECK (coaching IN (0, 1)),
    target_role      TEXT,
    experience       TEXT,
    -- Chosen length: 15–100 (minutes when length_unit = 'minutes')
    length_value     INTEGER NOT NULL,
    length_unit      TEXT NOT NULL DEFAULT 'questions'
                     CHECK (length_unit IN ('questions', 'minutes')),
    question_target  INTEGER NOT NULL,
    focus_areas      TEXT,
    resume_text      TEXT,
    jd_text          TEXT,
    -- 'active' until the candidate finishes or the question target is reached
    status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'completed')),
    turn_count       INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    completed_at     TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user
    ON interview_sessions (user_id, created_at DESC);

-- Daily usage counting for the per-user session limit.
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_created
    ON interview_sessions (user_id, created_at);

-- ---------------------------------------------------------------------------
-- interview_turns — the conversation, in order
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interview_turns (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL,
    turn_index  INTEGER NOT NULL,
    -- 'question' | 'answer' | 'feedback' | 'hint' | 'skip' | 'clarify'
    kind        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (session_id) REFERENCES interview_sessions (id) ON DELETE CASCADE,
    UNIQUE (session_id, turn_index)
);

CREATE INDEX IF NOT EXISTS idx_interview_turns_session
    ON interview_turns (session_id, turn_index);

-- ---------------------------------------------------------------------------
-- interview_reports — the final evidence-based assessment (one per session)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interview_reports (
    session_id  TEXT PRIMARY KEY,
    report_json TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (session_id) REFERENCES interview_sessions (id) ON DELETE CASCADE
);
