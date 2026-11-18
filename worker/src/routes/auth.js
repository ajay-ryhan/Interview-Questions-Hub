/**
 * Authentication routes.
 *
 *   POST /api/auth/register         create an account and start a session
 *   POST /api/auth/login            verify credentials and start a session
 *   POST /api/auth/logout           end the current session
 *   GET  /api/auth/me               return the signed-in user (or null)
 *   POST /api/auth/forgot-password  email a 24-hour password reset link
 *   POST /api/auth/reset-password   set a new password from that link
 *
 * Passwords are only ever stored as PBKDF2-HMAC-SHA256 hashes. Session and
 * reset tokens are random values; only their SHA-256 hash is stored.
 */

import {
    json,
    error,
    noContent,
    readCookie,
    readJsonBody,
    buildSessionCookie,
    clearSessionCookie,
    clientIp,
    SESSION_COOKIE,
    SESSION_TTL_MS
} from "../lib/http.js";

import {
    validateName,
    validateEmail,
    validatePassword
} from "../lib/validators.js";

import { hashPassword, verifyPassword, randomToken, sha256Hex } from "../lib/auth.js";

import { sendPasswordResetEmail } from "../lib/email.js";

import {
    createSession,
    getSession,
    refreshSession,
    destroySession
} from "../lib/sessions.js";

import { rateLimit } from "../lib/ratelimit.js";

const COOKIE_MAX_AGE = Math.floor(SESSION_TTL_MS / 1000);

/** Reset links stay valid for 24 hours. */
const RESET_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_HOURS = 24;

/** Base64url tokens produced by randomToken(). */
const RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,200}$/;

/** Returned for every forgot-password request, so accounts cannot be probed. */
const RESET_SENT_MESSAGE =
    "If an account exists for that email, a reset link is on its way.";

const RESET_INVALID_MESSAGE =
    "This reset link is invalid or has expired. Please request a new one.";

/** Deliberately avoids leaking the password hash or internal flags. */
function publicUser(user) {
    return { id: user.id, name: user.name, email: user.email };
}

function sessionHeaders(request, token) {
    return { "set-cookie": buildSessionCookie(request, token, COOKIE_MAX_AGE) };
}

export async function register(request, env) {
    const limit = rateLimit("register:" + clientIp(request), 10, 10 * 60 * 1000);

    if (!limit.allowed) {
        return error(
            "Too many sign-up attempts. Please try again later.",
            429,
            { retryAfter: limit.retryAfter }
        );
    }

    const body = await readJsonBody(request);

    if (!body) {
        return error("Invalid request.", 400);
    }

    const name = validateName(body.name);

    if (!name.ok) {
        return error(name.message, 422);
    }

    const email = validateEmail(body.email);

    if (!email.ok) {
        return error(email.message, 422);
    }

    const password = validatePassword(body.password);

    if (!password.ok) {
        return error(password.message, 422);
    }

    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
        .bind(email.value)
        .first();

    if (existing) {
        return error("An account with this email already exists.", 409);
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password.value);

    try {
        await env.DB.prepare(
            "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)"
        )
            .bind(userId, name.value, email.value, passwordHash)
            .run();
    } catch {
        // A concurrent request may have created the same email first.
        return error("An account with this email already exists.", 409);
    }

    const session = await createSession(env, userId);

    return json(
        { user: { id: userId, name: name.value, email: email.value } },
        201,
        sessionHeaders(request, session.token)
    );
}

export async function login(request, env) {
    const ipLimit = rateLimit("login:ip:" + clientIp(request), 30, 10 * 60 * 1000);

    if (!ipLimit.allowed) {
        return error(
            "Too many attempts. Please try again later.",
            429,
            { retryAfter: ipLimit.retryAfter }
        );
    }

    const body = await readJsonBody(request);

    if (!body) {
        return error("Invalid request.", 400);
    }

    const email = validateEmail(body.email);
    const password = String(body.password ?? "");

    if (!email.ok || password.length === 0) {
        return error("Incorrect email or password.", 401);
    }

    const emailLimit = rateLimit("login:email:" + email.value, 8, 10 * 60 * 1000);

    if (!emailLimit.allowed) {
        return error(
            "Too many attempts. Please try again later.",
            429,
            { retryAfter: emailLimit.retryAfter }
        );
    }

    const user = await env.DB.prepare(
        "SELECT id, name, email, password_hash, is_active FROM users WHERE email = ?"
    )
        .bind(email.value)
        .first();

    const valid = user ? await verifyPassword(password, user.password_hash) : false;

    if (!user || !valid) {
        return error("Incorrect email or password.", 401);
    }

    if (!user.is_active) {
        return error("This account has been disabled.", 403);
    }

    const session = await createSession(env, user.id);

    return json({ user: publicUser(user) }, 200, sessionHeaders(request, session.token));
}

export async function logout(request, env) {
    const token = readCookie(request, SESSION_COOKIE);

    if (token) {
        await destroySession(env, token);
    }

    return noContent({ "set-cookie": clearSessionCookie(request) });
}

export async function me(request, env) {
    const session = await getSession(request, env);

    if (!session) {
        return json(
            { user: null },
            200,
            { "set-cookie": clearSessionCookie(request) }
        );
    }

    const refreshed = await refreshSession(env, session);
    const headers = refreshed ? sessionHeaders(request, session.token) : {};

    return json({ user: publicUser(session.user) }, 200, headers);
}

/**
 * Starts a password reset. Always answers with the same message so the
 * endpoint cannot be used to discover which emails have accounts.
 */
export async function forgotPassword(request, env) {
    const ipLimit = rateLimit("forgot:ip:" + clientIp(request), 10, 10 * 60 * 1000);

    if (!ipLimit.allowed) {
        return error(
            "Too many requests. Please try again later.",
            429,
            { retryAfter: ipLimit.retryAfter }
        );
    }

    const body = await readJsonBody(request);

    if (!body) {
        return error("Invalid request.", 400);
    }

    const email = validateEmail(body.email);

    if (!email.ok) {
        return error(email.message, 422);
    }

    const emailLimit = rateLimit("forgot:email:" + email.value, 3, 10 * 60 * 1000);

    if (!emailLimit.allowed) {
        return error(
            "Too many requests. Please try again later.",
            429,
            { retryAfter: emailLimit.retryAfter }
        );
    }

    const user = await env.DB.prepare(
        "SELECT id, name, email FROM users WHERE email = ? AND is_active = 1"
    )
        .bind(email.value)
        .first();

    if (!user) {
        return json({ message: RESET_SENT_MESSAGE });
    }

    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();

    // Requesting a new link retires any earlier unused one.
    await env.DB.batch([
        env.DB.prepare("DELETE FROM password_resets WHERE user_id = ?").bind(user.id),
        env.DB.prepare(
            "INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
        ).bind(crypto.randomUUID(), user.id, tokenHash, expiresAt)
    ]);

    const link = `${new URL(request.url).origin}/#reset?token=${token}`;

    try {
        await sendPasswordResetEmail(env, {
            to: user.email,
            name: user.name,
            link,
            expiresHours: RESET_TTL_HOURS
        });
    } catch (err) {
        console.error("password_reset_email_failed", (err && err.stack) || err);

        return error(
            "We could not send the reset email. Please try again later.",
            502
        );
    }

    return json({ message: RESET_SENT_MESSAGE });
}

/**
 * Completes a reset. Every existing session for the account is destroyed, so
 * a stolen session cannot survive the password change.
 */
export async function resetPassword(request, env) {
    const limit = rateLimit("reset:ip:" + clientIp(request), 20, 10 * 60 * 1000);

    if (!limit.allowed) {
        return error(
            "Too many attempts. Please try again later.",
            429,
            { retryAfter: limit.retryAfter }
        );
    }

    const body = await readJsonBody(request);

    if (!body) {
        return error("Invalid request.", 400);
    }

    const token = String(body.token ?? "").trim();

    if (!RESET_TOKEN_PATTERN.test(token)) {
        return error(RESET_INVALID_MESSAGE, 400);
    }

    const password = validatePassword(body.password);

    if (!password.ok) {
        return error(password.message, 422);
    }

    const tokenHash = await sha256Hex(token);

    const reset = await env.DB.prepare(
        `SELECT r.id, r.user_id, r.expires_at
           FROM password_resets r
           JOIN users u ON u.id = r.user_id
          WHERE r.token_hash = ?
            AND r.used_at IS NULL
            AND u.is_active = 1`
    )
        .bind(tokenHash)
        .first();

    if (!reset) {
        return error(RESET_INVALID_MESSAGE, 400);
    }

    if (Date.parse(reset.expires_at) <= Date.now()) {
        return error(
            "This reset link has expired. Please request a new one.",
            400
        );
    }

    const passwordHash = await hashPassword(password.value);
    const now = new Date().toISOString();

    await env.DB.batch([
        env.DB.prepare(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?"
        ).bind(passwordHash, now, reset.user_id),
        env.DB.prepare("UPDATE password_resets SET used_at = ? WHERE id = ?")
            .bind(now, reset.id),
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(reset.user_id)
    ]);

    return json(
        { message: "Your password has been updated." },
        200,
        { "set-cookie": clearSessionCookie(request) }
    );
}
