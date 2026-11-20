/**
 * QA Interview Hub — Cloudflare Worker entry point.
 *
 * The Worker serves the static website through the ASSETS binding and
 * handles every /api/* request itself.
 *
 *   POST   /api/auth/register
 *   POST   /api/auth/login
 *   POST   /api/auth/logout
 *   GET    /api/auth/me
 *   POST   /api/auth/forgot-password
 *   POST   /api/auth/reset-password
 *   GET    /api/progress
 *   POST   /api/progress/complete
 *   DELETE /api/progress/:questionKey
 *   GET    /api/bookmarks
 *   POST   /api/bookmarks
 *   DELETE /api/bookmarks/:questionKey
 *   GET    /api/dashboard
 *   POST   /api/interview/session              (Mock Interview)
 *   GET    /api/interview/sessions
 *   GET    /api/interview/session/:id
 *   POST   /api/interview/session/:id/answer
 *   POST   /api/interview/session/:id/finish
 *   DELETE /api/interview/session/:id
 *   POST   /api/interview/transcribe
 *   POST   /api/interview/speech
 *   POST   /api/interview/provider/test
 *   GET    /api/health          (database connectivity check)
 *
 * Section 8 of the spec is preserved: the public site needs no account —
 * guests browse, search, filter and read everything. Only progress and
 * bookmarks require a session.
 */

import { json, error, isSameOrigin, isJsonRequest } from "./lib/http.js";

import * as authRoutes from "./routes/auth.js";
import * as progressRoutes from "./routes/progress.js";
import * as dashboardRoutes from "./routes/dashboard.js";
import * as interviewRoutes from "./routes/interview.js";

/** Methods that must be protected against cross-site requests. */
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Methods whose body must be JSON (CSRF hardening). */
const JSON_BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

function apiGuard(request) {
    if (WRITE_METHODS.has(request.method) && !isSameOrigin(request)) {
        return error("Request blocked.", 403);
    }

    if (JSON_BODY_METHODS.has(request.method) && !isJsonRequest(request)) {
        return error("Expected a JSON request body.", 415);
    }

    return null;
}

async function dispatch(request, env, url) {
    const path = url.pathname;
    const method = request.method;

    /* ---------------- auth ---------------- */

    if (path === "/api/auth/register" && method === "POST") {
        return authRoutes.register(request, env);
    }

    if (path === "/api/auth/login" && method === "POST") {
        return authRoutes.login(request, env);
    }

    if (path === "/api/auth/logout" && method === "POST") {
        return authRoutes.logout(request, env);
    }

    if (path === "/api/auth/me" && method === "GET") {
        return authRoutes.me(request, env);
    }

    if (path === "/api/auth/forgot-password" && method === "POST") {
        return authRoutes.forgotPassword(request, env);
    }

    if (path === "/api/auth/reset-password" && method === "POST") {
        return authRoutes.resetPassword(request, env);
    }

    /* ---------------- progress ---------------- */

    if (path === "/api/progress" && method === "GET") {
        return progressRoutes.list(request, env);
    }

    if (path === "/api/progress/complete" && method === "POST") {
        return progressRoutes.complete(request, env);
    }

    if (path.startsWith("/api/progress/") && method === "DELETE") {
        return progressRoutes.reset(
            request,
            env,
            decodeURIComponent(path.slice("/api/progress/".length))
        );
    }

    /* ---------------- bookmarks ---------------- */

    if (path === "/api/bookmarks" && method === "GET") {
        return progressRoutes.listBookmarks(request, env);
    }

    if (path === "/api/bookmarks" && method === "POST") {
        return progressRoutes.addBookmark(request, env);
    }

    if (path.startsWith("/api/bookmarks/") && method === "DELETE") {
        return progressRoutes.removeBookmark(
            request,
            env,
            decodeURIComponent(path.slice("/api/bookmarks/".length))
        );
    }

    /* ---------------- dashboard ---------------- */

    if (path === "/api/dashboard" && method === "GET") {
        return dashboardRoutes.dashboard(request, env);
    }

    /* ---------------- mock interview ---------------- */

    if (path === "/api/interview" || path.startsWith("/api/interview/")) {
        return interviewRoutes.handle(request, env, url);
    }

    return null;
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (!url.pathname.startsWith("/api/")) {
            // Everything that is not an API call is a static asset.
            return env.ASSETS.fetch(request);
        }

        if (url.pathname === "/api/health") {
            try {
                const row = await env.DB.prepare("SELECT 1 AS ok").first();

                return json({ ok: Boolean(row && row.ok === 1) });
            } catch (err) {
                return json({ ok: false, error: String(err) }, 500);
            }
        }

        const blocked = apiGuard(request);

        if (blocked) {
            return blocked;
        }

        try {
            const response = await dispatch(request, env, url);

            return response || error("Not found.", 404);
        } catch (err) {
            console.error("api_error", (err && err.stack) || err);

            return error("Something went wrong. Please try again.", 500);
        }
    }
};
