/**
 * Learning-progress routes.
 *
 *   GET    /api/progress                      completion + bookmark keys
 *   POST   /api/progress/complete             mark one or many questions studied
 *   DELETE /api/progress/:questionKey         clear a completion
 *   GET    /api/bookmarks                     list bookmarked questions
 *   POST   /api/bookmarks                     add a bookmark
 *   DELETE /api/bookmarks/:questionKey        remove a bookmark
 *
 * Every route is per-user: rows are always scoped by the session's user_id,
 * so one learner can never read or mutate another learner's data.
 * Duplicate prevention comes from the UNIQUE (user_id, question_key)
 * constraints in the schema.
 */

import { json, error, readJsonBody } from "../lib/http.js";
import { validateQuestionKey } from "../lib/validators.js";
import { authenticate } from "../lib/sessions.js";

/** Upper bound for a single "Expand all" style batch write. */
const MAX_KEYS_PER_REQUEST = 1000;

export async function list(request, env) {
    const { session, headers } = await authenticate(request, env);

    if (!session) {
        return error("Please sign in to view your progress.", 401);
    }

    const [progressResult, bookmarkResult] = await env.DB.batch([
        env.DB.prepare(
            "SELECT question_key FROM question_progress WHERE user_id = ? ORDER BY completed_at DESC"
        ).bind(session.userId),
        env.DB.prepare(
            "SELECT question_key FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC"
        ).bind(session.userId)
    ]);

    return json(
        {
            completed: (progressResult.results || []).map((row) => row.question_key),
            bookmarks: (bookmarkResult.results || []).map((row) => row.question_key)
        },
        200,
        headers
    );
}

export async function complete(request, env) {
    const { session, headers } = await authenticate(request, env);

    if (!session) {
        return error("Please sign in to save your progress.", 401);
    }

    const body = await readJsonBody(request);

    // One key (opening a single answer) or many (Expand all).
    const incoming = Array.isArray(body && body.questionKeys)
        ? body.questionKeys
        : [body && body.questionKey];

    const keys = [];
    const seen = Object.create(null);

    for (const value of incoming) {
        const key = validateQuestionKey(value);

        if (!key.ok) {
            return error(key.message, 422);
        }

        // De-duplicate inside the request so a repeated key is one insert.
        if (!seen[key.value]) {
            seen[key.value] = true;
            keys.push(key.value);
        }
    }

    if (keys.length === 0) {
        return error("No questions were provided.", 422);
    }

    if (keys.length > MAX_KEYS_PER_REQUEST) {
        return error("Too many questions in one request.", 413);
    }

    // A single batch: the UNIQUE (user_id, question_key) constraint ignores
    // anything already studied, so re-opening a question creates no new row.
    const results = await env.DB.batch(
        keys.map((value) =>
            env.DB.prepare(
                `INSERT INTO question_progress (id, user_id, question_key)
                 VALUES (?, ?, ?)
                 ON CONFLICT (user_id, question_key) DO NOTHING`
            ).bind(crypto.randomUUID(), session.userId, value)
        )
    );

    const created = results.reduce(
        (total, result) =>
            total + (result.meta && result.meta.changes > 0 ? 1 : 0),
        0
    );

    return json(
        {
            questionKeys: keys,
            completed: true,
            created: created
        },
        200,
        headers
    );
}

export async function reset(request, env, questionKey) {
    const { session, headers } = await authenticate(request, env);

    if (!session) {
        return error("Please sign in to change your progress.", 401);
    }

    const key = validateQuestionKey(questionKey);

    if (!key.ok) {
        return error(key.message, 422);
    }

    await env.DB.prepare(
        "DELETE FROM question_progress WHERE user_id = ? AND question_key = ?"
    )
        .bind(session.userId, key.value)
        .run();

    return json({ questionKey: key.value, completed: false }, 200, headers);
}

export async function listBookmarks(request, env) {
    const { session, headers } = await authenticate(request, env);

    if (!session) {
        return error("Please sign in to view your bookmarks.", 401);
    }

    const result = await env.DB.prepare(
        "SELECT question_key FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC"
    )
        .bind(session.userId)
        .all();

    return json(
        { bookmarks: (result.results || []).map((row) => row.question_key) },
        200,
        headers
    );
}

export async function addBookmark(request, env) {
    const { session, headers } = await authenticate(request, env);

    if (!session) {
        return error("Please sign in to save bookmarks.", 401);
    }

    const body = await readJsonBody(request);
    const key = validateQuestionKey(body && body.questionKey);

    if (!key.ok) {
        return error(key.message, 422);
    }

    const result = await env.DB.prepare(
        `INSERT INTO bookmarks (id, user_id, question_key)
         VALUES (?, ?, ?)
         ON CONFLICT (user_id, question_key) DO NOTHING`
    )
        .bind(crypto.randomUUID(), session.userId, key.value)
        .run();

    return json(
        {
            questionKey: key.value,
            bookmarked: true,
            created: Boolean(result.meta && result.meta.changes > 0)
        },
        200,
        headers
    );
}

export async function removeBookmark(request, env, questionKey) {
    const { session, headers } = await authenticate(request, env);

    if (!session) {
        return error("Please sign in to change your bookmarks.", 401);
    }

    const key = validateQuestionKey(questionKey);

    if (!key.ok) {
        return error(key.message, 422);
    }

    await env.DB.prepare(
        "DELETE FROM bookmarks WHERE user_id = ? AND question_key = ?"
    )
        .bind(session.userId, key.value)
        .run();

    return json({ questionKey: key.value, bookmarked: false }, 200, headers);
}
