/**
 * Password hashing and token helpers.
 *
 * Passwords use PBKDF2-HMAC-SHA256 (Web Crypto) with a unique random salt,
 * 600,000 iterations and a 256-bit derived key. Stored format:
 *   pbkdf2$sha256$<iterations>$<salt-base64>$<hash-base64>
 *
 * No custom cryptography is implemented — only established Web Crypto
 * primitives. Session tokens are random values; only their SHA-256 hash is
 * ever persisted.
 */

const PBKDF2_ITERATIONS = 600000;
const SALT_BYTES = 16;
const KEY_BITS = 256;
const TOKEN_BYTES = 32;

export function toBase64(bytes) {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let binary = "";

    for (let i = 0; i < view.length; i++) {
        binary += String.fromCharCode(view[i]);
    }

    return btoa(binary);
}

export function fromBase64(text) {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

async function deriveBits(password, salt, iterations) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
        key,
        KEY_BITS
    );

    return new Uint8Array(bits);
}

export async function hashPassword(password) {
    const salt = new Uint8Array(SALT_BYTES);
    crypto.getRandomValues(salt);

    const hash = await deriveBits(password, salt, PBKDF2_ITERATIONS);

    return [
        "pbkdf2",
        "sha256",
        String(PBKDF2_ITERATIONS),
        toBase64(salt),
        toBase64(hash)
    ].join("$");
}

export async function verifyPassword(password, stored) {
    try {
        const parts = String(stored || "").split("$");

        if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") {
            return false;
        }

        const iterations = parseInt(parts[2], 10);

        if (!Number.isFinite(iterations) || iterations < 1) {
            return false;
        }

        const salt = fromBase64(parts[3]);
        const expected = fromBase64(parts[4]);
        const actual = await deriveBits(password, salt, iterations);

        return timingSafeEqual(actual, expected);
    } catch {
        return false;
    }
}

function timingSafeEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }

    let difference = 0;

    for (let i = 0; i < a.length; i++) {
        difference |= a[i] ^ b[i];
    }

    return difference === 0;
}

/** URL-safe random token used as the raw session value. */
export function randomToken(bytes = TOKEN_BYTES) {
    const data = new Uint8Array(bytes);
    crypto.getRandomValues(data);

    return toBase64(data)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

export async function sha256Hex(value) {
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(value)
    );

    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}
