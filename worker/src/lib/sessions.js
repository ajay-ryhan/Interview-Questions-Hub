/**
 * Session lifecycle. The raw token lives only in the cookie; the database
 * stores a SHA-256 hash of it, so a database leak cannot be replayed.
 */

import {
    SESSION_TTL_MS,
    SESSION_REFRESH_AFTER_MS,
    SESSION_COOKIE,
    readCookie,
    buildSessionCookie
} from "./http.js";
import { randomToken, sha256Hex } from "./auth.js";

export async function createSession(env, userId) {
    const token = randomToken(32);
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    await env.DB.prepare(
        "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
    )
        .bind(crypto.randomUUID(), userId, tokenHash, expiresAt)
        .run();

    return { token, expiresAt };
}

export async function getSession(request, env) {
    const token = readCookie(request, SESSION_COOKIE);

    if (!token) {
        return null;
    }

    const tokenHash = await sha256Hex(token);

    const row = await env.DB.prepare(
        `SELECT s.id AS session_id, s.user_id, s.expires_at,
                u.name, u.email, u.is_active
           FROM sessions s
           JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ?`
    )
        .bind(tokenHash)
        .first();

    if (!row) {
        return null;
    }

    if (Date.parse(row.expires_at) <= Date.now()) {
        await env.DB.prepare("DELETE FROM sessions WHERE id = ?")
            .bind(row.session_id)
            .run();
        return null;
    }

    if (!row.is_active) {
        return null;
    }

    return {
        token,
        id: row.session_id,
        userId: row.user_id,
        expiresAt: row.expires_at,
        user: { id: row.user_id, name: row.name, email: row.email }
    };
}

/**
 * Sliding expiry: extends the session when it is older than one hour,
 * so long-lived sessions stay valid without a write on every request.
 */
export async function refreshSession(env, session) {
    const remaining = Date.parse(session.expiresAt) - Date.now();

    if (remaining > SESSION_TTL_MS - SESSION_REFRESH_AFTER_MS) {
        return null;
    }

    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    await env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?")
        .bind(expiresAt, session.id)
        .run();

    return expiresAt;
}

export async function destroySession(env, token) {
    const tokenHash = await sha256Hex(token);

    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
        .bind(tokenHash)
        .run();
}

export async function destroyAllSessionsForUser(env, userId) {
    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?")
        .bind(userId)
        .run();
}

export async function purgeExpiredSessions(env) {
    await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?")
        .bind(new Date().toISOString())
        .run();
}

/**
 * Convenience wrapper for protected routes:
 *   const { session, headers } = await authenticate(request, env);
 *   if (!session) return error("unauthorized", 401);
 * `headers` carries a refreshed Set-Cookie when the sliding window moved.
 */
export async function authenticate(request, env) {
    const session = await getSession(request, env);

    if (!session) {
        return { session: null, headers: {} };
    }

    const refreshed = await refreshSession(env, session);

    if (!refreshed) {
        return { session, headers: {} };
    }

    return {
        session,
        headers: {
            "set-cookie": buildSessionCookie(
                request,
                session.token,
                Math.floor(SESSION_TTL_MS / 1000)
            )
        }
    };
}
