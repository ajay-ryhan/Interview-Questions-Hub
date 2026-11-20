/**
 * Usage limits for Mock Interview Mode.
 *
 * Every limit is a plain number in wrangler.toml [vars], so spending can be
 * turned down without a code change. They bound three things at once:
 * model cost, abuse, and (on the free Workers AI tier) the daily Neuron pool.
 *
 *   INTERVIEW_MAX_SESSIONS_PER_DAY     interviews one user may start per day
 *   INTERVIEW_MAX_TURNS_PER_SESSION    hard ceiling on answers per interview
 *   INTERVIEW_MAX_TURNS_PER_DAY        total answers one user may send per day
 *   INTERVIEW_MAX_SESSIONS_PER_DAY_ALL interviews everyone may start per day
 */

import { error } from "./http.js";

function limitValue(env, name, fallback) {
    const parsed = Number.parseInt(env[name], 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
}

/** ISO-8601 start of the current UTC day — matches how timestamps are stored. */
function startOfUtcDay() {
    const now = new Date();

    return new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    ).toISOString();
}

async function count(env, sql, bindings) {
    const row = await env.DB.prepare(sql).bind(...bindings).first();

    return row && Number(row.n) ? Number(row.n) : 0;
}

/** Sessions the user has started today. */
export async function sessionsStartedToday(env, userId) {
    return count(
        env,
        "SELECT COUNT(*) AS n FROM interview_sessions WHERE user_id = ? AND created_at >= ?",
        [userId, startOfUtcDay()]
    );
}

/**
 * Checks the start-of-interview budget.
 * Returns an error Response when the user is over a limit, otherwise null.
 */
export async function guardNewSession(env, userId) {
    const perUser = limitValue(env, "INTERVIEW_MAX_SESSIONS_PER_DAY", 5);
    const allUsers = limitValue(env, "INTERVIEW_MAX_SESSIONS_PER_DAY_ALL", 50);

    const [mine, everyone] = await Promise.all([
        sessionsStartedToday(env, userId),
        count(
            env,
            "SELECT COUNT(*) AS n FROM interview_sessions WHERE created_at >= ?",
            [startOfUtcDay()]
        )
    ]);

    if (mine >= perUser) {
        return error(
            `You have reached today's limit of ${perUser} mock interviews. ` +
                "Please continue tomorrow.",
            429
        );
    }

    if (everyone >= allUsers) {
        return error(
            "The mock interview room is at capacity for today. Please try again tomorrow.",
            429
        );
    }

    return null;
}

/**
 * Checks the per-answer budget before a model call is made.
 * `session.turn_count` is the authoritative per-interview counter.
 */
export async function guardTurn(env, userId, session) {
    const perSession = limitValue(env, "INTERVIEW_MAX_TURNS_PER_SESSION", 100);
    const perDay = limitValue(env, "INTERVIEW_MAX_TURNS_PER_DAY", 200);

    if (session.turn_count >= perSession) {
        return error(
            `This interview has reached its ${perSession}-answer ceiling. ` +
                "Finish the interview to get your report.",
            429
        );
    }

    const today = await count(
        env,
        `SELECT COUNT(*) AS n
           FROM interview_turns t
           JOIN interview_sessions s ON s.id = t.session_id
          WHERE s.user_id = ? AND t.kind = 'answer' AND t.created_at >= ?`,
        [userId, startOfUtcDay()]
    );

    if (today >= perDay) {
        return error(
            `You have reached today's limit of ${perDay} answers across all interviews. ` +
                "Please continue tomorrow.",
            429
        );
    }

    return null;
}
