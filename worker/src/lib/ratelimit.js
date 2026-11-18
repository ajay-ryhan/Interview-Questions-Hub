/**
 * Best-effort, in-memory rate limiting for authentication endpoints.
 *
 * Workers isolates are ephemeral and per-location, so this is a lightweight
 * application-level safeguard only. For real protection, also configure
 * Cloudflare Rate Limiting rules on /api/auth/* in the dashboard.
 */

const buckets = new Map();
const MAX_TRACKED_KEYS = 5000;

export function rateLimit(key, limit, windowMs) {
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || now > entry.resetAt) {
        if (buckets.size > MAX_TRACKED_KEYS) {
            buckets.clear();
        }

        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfter: 0 };
    }

    if (entry.count >= limit) {
        return {
            allowed: false,
            retryAfter: Math.ceil((entry.resetAt - now) / 1000)
        };
    }

    entry.count += 1;
    return { allowed: true, retryAfter: 0 };
}
