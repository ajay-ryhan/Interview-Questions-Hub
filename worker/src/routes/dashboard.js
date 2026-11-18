/**
 * Dashboard summary route.
 *
 *   GET /api/dashboard
 *
 * Returns everything the personalised dashboard needs from the database:
 * completed totals, per-topic counts, recently completed questions, a
 * seven-day activity series and the bookmark list.
 *
 * Total question counts per topic are intentionally NOT returned here —
 * they are derived on the client from the static JSON files, so the
 * database never has to duplicate the question bank.
 */

import { json, error } from "../lib/http.js";
import { authenticate } from "../lib/sessions.js";

const WEEK_DAYS = 7;

export async function dashboard(request, env) {
    const { session, headers } = await authenticate(request, env);

    if (!session) {
        return error("Please sign in to view your dashboard.", 401);
    }

    const userId = session.userId;

    const [totals, byTopic, recent, bookmarks] = await env.DB.batch([
        env.DB.prepare(
            "SELECT COUNT(*) AS total FROM question_progress WHERE user_id = ?"
        ).bind(userId),
        env.DB.prepare(
            `SELECT substr(question_key, 1, instr(question_key, ':') - 1) AS topic,
                    COUNT(*) AS total
               FROM question_progress
              WHERE user_id = ?
              GROUP BY topic`
        ).bind(userId),
        env.DB.prepare(
            `SELECT question_key, completed_at
               FROM question_progress
              WHERE user_id = ?
              ORDER BY completed_at DESC
              LIMIT 12`
        ).bind(userId),
        env.DB.prepare(
            `SELECT question_key, created_at
               FROM bookmarks
              WHERE user_id = ?
              ORDER BY created_at DESC`
        ).bind(userId)
    ]);

    const startOfWindow = new Date(
        Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate()
        ) - (WEEK_DAYS - 1) * 24 * 60 * 60 * 1000
    );

    const weeklyRows = await env.DB.prepare(
        `SELECT substr(completed_at, 1, 10) AS day, COUNT(*) AS total
           FROM question_progress
          WHERE user_id = ? AND completed_at >= ?
          GROUP BY day`
    )
        .bind(userId, startOfWindow.toISOString())
        .all();

    const countsByDay = {};

    (weeklyRows.results || []).forEach((row) => {
        countsByDay[row.day] = row.total;
    });

    const weekly = [];

    for (let index = 0; index < WEEK_DAYS; index++) {
        const day = new Date(startOfWindow.getTime() + index * 24 * 60 * 60 * 1000);
        const key = day.toISOString().slice(0, 10);

        weekly.push({ date: key, count: countsByDay[key] || 0 });
    }

    const completedByTopic = {};

    (byTopic.results || []).forEach((row) => {
        completedByTopic[row.topic] = row.total;
    });

    return json(
        {
            user: session.user,
            completedTotal: totals.results && totals.results[0]
                ? totals.results[0].total
                : 0,
            completedByTopic,
            recent: (recent.results || []).map((row) => ({
                questionKey: row.question_key,
                completedAt: row.completed_at
            })),
            weekly,
            bookmarks: (bookmarks.results || []).map((row) => ({
                questionKey: row.question_key,
                createdAt: row.created_at
            }))
        },
        200,
        headers
    );
}
