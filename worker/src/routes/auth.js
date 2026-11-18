/**
 * Authentication routes.
 *
 *   POST /api/auth/register   create an account and start a session
 *   POST /api/auth/login      verify credentials and start a session
 *   POST /api/auth/logout     end the current session
 *   GET  /api/auth/me         return the signed-in user (or null)
 *
 * Passwords are only ever stored as PBKDF2-HMAC-SHA256 hashes. Session
 * tokens are random values; only their SHA-256 hash is stored.
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

import { hashPassword, verifyPassword } from "../lib/auth.js";

import {
    createSession,
    getSession,
    refreshSession,
    destroySession
} from "../lib/sessions.js";

import { rateLimit } from "../lib/ratelimit.js";

const COOKIE_MAX_AGE = Math.floor(SESSION_TTL_MS / 1000);

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
