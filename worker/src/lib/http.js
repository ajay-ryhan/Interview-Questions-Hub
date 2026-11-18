/**
 * HTTP helpers: JSON responses, cookies, and request-origin checks.
 */

export const SESSION_COOKIE = "qa_session";

/** Session lifetime: 7 days (sliding). */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Only refresh the stored expiry when the session is older than this. */
export const SESSION_REFRESH_AFTER_MS = 60 * 60 * 1000;

export function json(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            ...headers
        }
    });
}

export function error(message, status = 400, extra = {}) {
    return json({ error: message, ...extra }, status);
}

export function noContent(headers = {}) {
    return new Response(null, { status: 204, headers });
}

export function readCookie(request, name) {
    const header = request.headers.get("Cookie") || "";
    const parts = header.split(";");

    for (const part of parts) {
        const index = part.indexOf("=");

        if (index === -1) {
            continue;
        }

        if (part.slice(0, index).trim() === name) {
            return decodeURIComponent(part.slice(index + 1).trim());
        }
    }

    return null;
}

function cookieAttributes(url, maxAgeSeconds) {
    const attributes = [
        `Path=/`,
        "HttpOnly",
        `Max-Age=${maxAgeSeconds}`,
        "SameSite=Lax"
    ];

    // Secure in production; omitted for plain-HTTP local development.
    if (new URL(url).protocol === "https:") {
        attributes.push("Secure");
    }

    return attributes;
}

export function buildSessionCookie(request, token, maxAgeSeconds) {
    return [
        `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
        ...cookieAttributes(request.url, maxAgeSeconds)
    ].join("; ");
}

export function clearSessionCookie(request) {
    return [
        `${SESSION_COOKIE}=`,
        ...cookieAttributes(request.url, 0)
    ].join("; ");
}

/**
 * CSRF defence for state-changing requests:
 * the Origin (or Referer) must match this Worker's own origin.
 * Combined with a SameSite=Lax cookie and a JSON content-type requirement.
 */
export function isSameOrigin(request) {
    const ownOrigin = new URL(request.url).origin;
    const origin = request.headers.get("Origin");

    if (origin) {
        return origin === ownOrigin;
    }

    const referer = request.headers.get("Referer");

    if (referer) {
        try {
            return new URL(referer).origin === ownOrigin;
        } catch {
            return false;
        }
    }

    // No browser context (e.g. curl): allow, since a cookie cannot be sent
    // cross-site without an Origin/Referer in a real browser.
    return true;
}

export function isJsonRequest(request) {
    const type = request.headers.get("Content-Type") || "";
    return type.toLowerCase().includes("application/json");
}

export function clientIp(request) {
    return (
        request.headers.get("CF-Connecting-IP") ||
        request.headers.get("X-Forwarded-For") ||
        "unknown"
    );
}

/** Parses a JSON request body, returning null when it is missing or invalid. */
export async function readJsonBody(request) {
    try {
        const text = await request.text();

        if (!text) {
            return null;
        }

        return JSON.parse(text);
    } catch {
        return null;
    }
}
