# QA Interview Hub

A personal QA / test-automation interview preparation site: browse, search and read interview
questions, download study material, run code snippets, and — once signed in — track what you have
studied and bookmark questions for revision.

**Live site:** https://qa-interview-hub.ajay-ryhan.workers.dev/

---

## Contents

- [What the site does](#what-the-site-does)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Topics covered](#topics-covered)
- [Local development](#local-development)
- [Deployment](#deployment)
- [Database (Cloudflare D1)](#database-cloudflare-d1)
- [SQL queries](#sql-queries)
- [API reference](#api-reference)
- [Adding content](#adding-content)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)

---

## What the site does

**Public (no account needed)** — guests get the complete site:

- Home page with topic cards and a hero entry point.
- Topic pages with search, difficulty filter, subtopic filter and expand/collapse all.
- Dark / light theme toggle (remembered in `localStorage` under `qa-hub-theme`).
- **Downloadable Docs** viewer: lists everything in `docs/`, opens PDFs/images/text inline in
  `viewer.html`, and offers a direct download link.
- **Qubiqode** — an embedded online code editor (`qubiqode/index.html`).

**Signed in only** — progress and bookmarks are stored per account in D1:

- "Studied" marking per question, batched to the server to avoid one request per click.
- Per-topic progress bars and a stats line in the study view.
- Bookmarks, deliberately separate from completion.
- A personalised **dashboard** (studied totals, per-topic counts, last 12 completed questions,
  7-day activity series and the bookmark list).

Routing is a hash-based virtual router (`#home`, `#topics`, `#study`, `#login`, `#register`,
`#dashboard`) handled by `showView()` in [js/app.js](js/app.js). There are no DOM elements with
those IDs, so HTML validators report `Cannot resolve anchor #login` — those warnings are false
positives.

---

## Architecture

One Cloudflare Worker serves **both** the static website and the JSON API. There is no build step:
the browser loads `index.html` plus plain `<script>` files (IIFE style, no framework, no bundler).

```
Browser ──▶ Cloudflare Worker (qa-interview-hub)
              ├── /api/*        ──▶ Worker code (auth, progress, bookmarks, dashboard) ──▶ D1
              └── everything else ──▶ static assets from the repository root (ASSETS binding)
```

- [wrangler.toml](wrangler.toml) — Worker name, entry point, assets binding, D1 binding.
- [.assetsignore](.assetsignore) — files kept in Git but **excluded** from the published site
  (`worker/`, `migrations/`, `package.json`, `wrangler.toml`, `*.md`, `.git`, …).

---

## Repository layout

```
index.html                    SPA shell: all views + auth forms
css/style.css                 All styling (CSS custom properties, dark/light themes)
js/api.js                     fetch() wrapper for the /api routes
js/app.js                     Topics, hash router, search/filter, docs & Qubiqode, integration hooks
js/auth.js                    Login / register forms, header account area, password show/hide
js/progress.js                Studied marking, bookmark buttons, stats, dashboard rendering
js/viewer.js                  Standalone document viewer (viewer.html?file=...)
viewer.html                   Document viewer page
qubiqode/                     Embedded online code editor (own HTML/CSS/JS)
data/*.json                   Question banks, one file per topic (qa, selenium, testng, cucumber,
                              java, playwright, api)
docs/                         Downloadable study material (PDF, TXT, …)
docs.json                     Auto-generated index of docs/ (see .github/workflows/generate-docs.yml)
migrations/0001_init.sql      D1 schema
worker/src/index.js           Worker entry: API router, CSRF guard, asset fallback
worker/src/routes/            auth.js, progress.js, dashboard.js
worker/src/lib/               http.js, auth.js (PBKDF2), sessions.js, ratelimit.js, validators.js
worker/run-java.js            Legacy Judge0 prototype — unused, nothing imports it
wrangler.toml / package.json  Cloudflare config and npm scripts
```

---

## Topics covered

| id | Name | Content |
| --- | --- | --- |
| `qa` | QA Basics | Manual testing fundamentals |
| `selenium` | Selenium | Web browser automation |
| `testng` | TestNG | Test execution framework for Java |
| `cucumber` | Cucumber | BDD with Gherkin scenarios |
| `java` | Java | Core Java programming |
| `playwright` | Playwright | Modern browser automation |
| `api` | API Testing | REST, HTTP methods, auth, test strategy, REST Assured, mocking, Postman & SoapUI |
| `qubiqode` | Qubiqode | Embedded code editor tool |
| `docs` | Downloadable Docs | Study material viewer |

Progress is keyed by a globally unique `question_key` of the form `<topicId>:<id>` — for example
`qa:1`, `selenium:12`. Question IDs restart at `1` in each data file, so the topic prefix is what
makes the key unique.

---

## Local development

Requires Node.js LTS (for `npx wrangler`) and a Cloudflare account with access to the D1 database.

```bash
npm install                 # installs wrangler
npx wrangler login          # one-time browser authentication
npm run db:migrate:local    # create the tables in the local D1 emulation
npm run dev                 # http://localhost:8787
```

`npm run dev` runs `wrangler dev`: the Worker, the static assets and a local D1 instance together.

---

## Deployment

Hosting is Cloudflare-only (Workers + Static Assets + D1). GitHub stores the repository and
regenerates `docs.json`; it does not host the site.

**Production branch: `master`.** Deploy by merging into `master`; Cloudflare Workers Builds then
runs:

```bash
npm run deploy            # wrangler deploy
```

Or deploy manually from the CLI with `npm run deploy` / `npx wrangler deploy`.

> **Non-production branches** are forced by Workers Builds to run `npx wrangler preview`, which
> requires a `[[previews.*]]` block in `wrangler.toml`. Without it the build fails with
> *"Your Wrangler configuration is missing a `previews` block"*. Either work on `master`, or turn
> off **Settings → Build → Branch control → Enable Preview Builds** in the dashboard.

---

## Database (Cloudflare D1)

| Setting | Value |
| --- | --- |
| Database name | `qa-interview-hub-db` |
| Binding | `DB` (used as `env.DB` in the Worker) |
| Database ID | `164b9201-b8bd-4f53-9750-99a84e1a7344` |

The `database_id` is an **identifier, not a secret** — it grants nothing without Cloudflare account
authentication, so it is safe to keep in `wrangler.toml`. Real secrets are the Cloudflare API token,
`.dev.vars`, and the learner data itself.

**Tables** (see [migrations/0001_init.sql](migrations/0001_init.sql)):

- `users` — id, name, unique case-insensitive email, `password_hash`, `is_active`, timestamps.
- `sessions` — only the **SHA-256 hash** of the session token is stored, plus `expires_at`.
- `question_progress` — one row per user + question (`UNIQUE (user_id, question_key)`).
- `bookmarks` — revision list, also unique per user + question.

Deleting a user cascades to their sessions, progress and bookmarks (foreign keys with
`ON DELETE CASCADE`).

```bash
npm run db:create            # create the database (once)
npm run db:migrate:remote    # apply migrations to production
npm run db:migrate:list      # list applied migrations
npm run db:tables            # list tables in the remote database
```

To apply the schema without a local Node toolchain, paste the statements from
[migrations/0001_init.sql](migrations/0001_init.sql) into the D1 **console** in the Cloudflare
dashboard — but strip the `--` comment lines first, because the console collapses pasted newlines
and a line comment will swallow the code that follows it. For the same reason, run each
`CREATE TABLE` separately if a paste fails with `incomplete input: SQLITE_ERROR`.

---

## SQL queries

### Schema inspection

```sql
-- All tables
SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;

-- Structure of one table
PRAGMA table_info(users);

-- Indexes
SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' ORDER BY tbl_name;

-- Applied migrations
SELECT * FROM d1_migrations;
```

### Health and counts

```sql
-- Connectivity check (same query /api/health runs)
SELECT 1 AS ok;

-- Registered users / active users
SELECT COUNT(*) AS users FROM users;
SELECT COUNT(*) AS active_users FROM users WHERE is_active = 1;

-- Totals across the app
SELECT
    (SELECT COUNT(*) FROM users)              AS users,
    (SELECT COUNT(*) FROM sessions)           AS sessions,
    (SELECT COUNT(*) FROM question_progress)  AS completions,
    (SELECT COUNT(*) FROM bookmarks)          AS bookmarks;
```

### Users

```sql
-- Recent sign-ups with their activity
SELECT u.name,
       u.email,
       u.is_active,
       u.created_at,
       COUNT(p.id) AS completed,
       COUNT(b.id) AS bookmarks
  FROM users u
  LEFT JOIN question_progress p ON p.user_id = u.id
  LEFT JOIN bookmarks b         ON b.user_id = u.id
 GROUP BY u.id
 ORDER BY u.created_at DESC;

-- Find a user by email
SELECT id, name, email, is_active, created_at
  FROM users
 WHERE email = 'someone@example.com';

-- Disable / re-enable an account (keeps history, blocks sign-in)
UPDATE users SET is_active = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
 WHERE email = 'someone@example.com';

-- Duplicate-email check (should return no rows; the unique index enforces this)
SELECT email, COUNT(*) AS n FROM users GROUP BY email HAVING n > 1;
```

### Progress

```sql
-- Completed total for one user
SELECT COUNT(*) AS completed
  FROM question_progress
 WHERE user_id = (SELECT id FROM users WHERE email = 'someone@example.com');

-- Per-topic completion counts
SELECT substr(question_key, 1, instr(question_key, ':') - 1) AS topic,
       COUNT(*) AS completed
  FROM question_progress
 WHERE user_id = (SELECT id FROM users WHERE email = 'someone@example.com')
 GROUP BY topic
 ORDER BY completed DESC;

-- Most recently completed questions
SELECT question_key, completed_at
  FROM question_progress
 WHERE user_id = (SELECT id FROM users WHERE email = 'someone@example.com')
 ORDER BY completed_at DESC
 LIMIT 12;

-- Daily activity for the last 7 days
SELECT substr(completed_at, 1, 10) AS day, COUNT(*) AS completed
  FROM question_progress
 WHERE user_id = (SELECT id FROM users WHERE email = 'someone@example.com')
   AND completed_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-6 days')
 GROUP BY day
 ORDER BY day;

-- Hardest-working questions across all users
SELECT question_key, COUNT(*) AS times_completed
  FROM question_progress
 GROUP BY question_key
 ORDER BY times_completed DESC
 LIMIT 10;
```

### Bookmarks

```sql
-- One user's bookmark list
SELECT question_key, created_at
  FROM bookmarks
 WHERE user_id = (SELECT id FROM users WHERE email = 'someone@example.com')
 ORDER BY created_at DESC;

-- Most-bookmarked questions
SELECT question_key, COUNT(*) AS saves
  FROM bookmarks
 GROUP BY question_key
 ORDER BY saves DESC
 LIMIT 10;
```

### Maintenance

```sql
-- Expired sessions (the Worker deletes them lazily; this clears the backlog)
SELECT COUNT(*) AS expired
  FROM sessions
 WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

DELETE FROM sessions
 WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

-- Sign a user out everywhere
DELETE FROM sessions
 WHERE user_id = (SELECT id FROM users WHERE email = 'someone@example.com');

-- Delete a user and all their data (cascades through the foreign keys)
DELETE FROM users WHERE email = 'someone@example.com';

-- Remove a single completion / bookmark
DELETE FROM question_progress WHERE user_id = ? AND question_key = 'qa:1';
DELETE FROM bookmarks         WHERE user_id = ? AND question_key = 'qa:1';
```

Timestamps are stored as ISO-8601 UTC strings (`2026-11-18T12:00:00.000Z`) so they sort correctly
as TEXT and can be compared with `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`.

---

## API reference

All endpoints are same-origin JSON under `/api`. Write methods require a same-origin request
(403 otherwise) and a JSON body (415 otherwise). Requests are authenticated by the HttpOnly
`qa_session` cookie.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | – | Database connectivity check: `{ ok: true }` |
| `POST` | `/api/auth/register` | – | Create an account, start a session, return `{ user }` |
| `POST` | `/api/auth/login` | – | Sign in, return `{ user }` |
| `POST` | `/api/auth/logout` | – | End the session and clear the cookie |
| `GET` | `/api/auth/me` | session | Current user, or 401 |
| `GET` | `/api/progress` | session | All completed `question_key`s |
| `POST` | `/api/progress/complete` | session | Mark one (`{ questionKey }`) or many (`{ questionKeys: [] }`) |
| `DELETE` | `/api/progress/:questionKey` | session | Unmark a question |
| `GET` | `/api/bookmarks` | session | Bookmark list |
| `POST` | `/api/bookmarks` | session | Add a bookmark (`{ questionKey }`) |
| `DELETE` | `/api/bookmarks/:questionKey` | session | Remove a bookmark |
| `GET` | `/api/dashboard` | session | Totals, per-topic counts, recent, 7-day series, bookmarks |

Anything that is not `/api/*` is served as a static asset, so `/api/typo` returns a JSON 404 while
`/missing.html` returns the plain asset-layer 404 (`not_found_handling = "none"`).

Password rule: **at least 6 characters**, at most 200. Validation runs client-side and again in
`worker/src/lib/validators.js`.

---

## Adding content

**Questions** — add an object to the relevant `data/<topic>.json` file and give it the next `id`.
The topic must already exist in the `categories` array in [js/app.js](js/app.js); the study view
derives search, difficulty and subtopic filters from the file contents, so no other change is
needed. Progress keys are built as `<topicId>:<id>`, so reusing an `id` inside a topic would collide
with an existing progress record.

**Documents** — drop the file into `docs/`, then push. The
[generate-docs.yml](.github/workflows/generate-docs.yml) workflow rebuilds
[docs.json](docs.json) automatically (supported: `.pdf .txt .doc .docx .xls .xlsx .ppt .pptx`). To
refresh the list locally without GitHub, regenerate `docs.json` by hand with the same shape:

```json
{
  "documents": [
    { "name": "Selenium interview questions", "file": "Selenium interview questions.pdf", "type": "PDF", "description": "Download Selenium interview questions" }
  ]
}
```

---

## Security notes

- Passwords are hashed with **PBKDF2-HMAC-SHA256, 100,000 iterations**, 16-byte random salt,
  256-bit key, stored as `pbkdf2$sha256$<iters>$<salt-b64>$<hash-b64>`. Plaintext is never stored.
  100,000 is Cloudflare Workers' ceiling — requesting more throws `NotSupportedError` at runtime,
  so do not raise it without checking the platform limit.
- Session tokens are 32 random bytes; only their **SHA-256 hash** is persisted, and the cookie is
  `HttpOnly; Secure; SameSite=Lax` with a sliding expiry.
- Login is rate limited to 30 attempts per IP and 8 per email per 10 minutes; registration is
  limited to 10 per IP per 10 minutes.
- The Worker rejects cross-origin state-changing requests and non-JSON bodies.
- `code: 10021 ... binding DB of type d1 must have a valid database_id` means the `database_id` in
  `wrangler.toml` is missing, still a placeholder, or not a UUID.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Cannot resolve anchor #home / #login / #topics / #register` | Hash-router routes, not element IDs | Harmless — ignore |
| `Your Wrangler configuration is missing a previews block` | Building a non-production branch (Workers Builds forces `wrangler preview`) | Merge to `master`, or disable Preview Builds in the dashboard |
| `code: 10021 ... d1 must have a valid database_id` | Placeholder / wrong `database_id` | Paste the UUID returned by `npx wrangler d1 create` |
| `incomplete input: SQLITE_ERROR` in the D1 console | Pasted SQL contained `--` comments; the console strips newlines | Remove comment lines, or run each statement separately |
| `npx : The term 'npx' is not recognized` | Node.js not installed | Install Node LTS (`winget install OpenJS.NodeJS.LTS`), open a new terminal, or create/read the database in the Cloudflare dashboard instead |
| Sign-up returns 500 | PBKDF2 iteration count above Cloudflare's 100,000 limit (`NotSupportedError`) | Keep `PBKDF2_ITERATIONS` at `100000` in `worker/src/lib/auth.js` |
| Sign-up returns 500 after a green deploy | Migrations not applied to remote D1 | `npm run db:migrate:remote` (or run the schema in the dashboard) |
| `warning: ... LF will be replaced by CRLF` | Windows line endings — cosmetic | Ignore |
