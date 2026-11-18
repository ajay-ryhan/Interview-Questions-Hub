/**
 * Input validation. Every validator returns { ok, value } or { ok:false, message }.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(input) {
    const value = String(input ?? "").trim();

    if (value.length < 2) {
        return { ok: false, message: "Please enter your name (at least 2 characters)." };
    }

    if (value.length > 60) {
        return { ok: false, message: "Name must be 60 characters or fewer." };
    }

    return { ok: true, value };
}

export function validateEmail(input) {
    const value = String(input ?? "").trim().toLowerCase();

    if (value.length > 254 || !EMAIL_PATTERN.test(value)) {
        return { ok: false, message: "Please enter a valid email address." };
    }

    return { ok: true, value };
}

export function validatePassword(input) {
    const value = String(input ?? "");

    if (value.length < 6) {
        return { ok: false, message: "Password must be at least 6 characters." };
    }

    if (value.length > 200) {
        return { ok: false, message: "Password must be 200 characters or fewer." };
    }

    return { ok: true, value };
}

/** Globally unique question key, e.g. "qa:1", "selenium:12". */
export function validateQuestionKey(input) {
    const value = String(input ?? "").trim();

    if (!/^[a-z0-9][a-z0-9-]*:\d{1,7}$/i.test(value)) {
        return { ok: false, message: "Invalid question key." };
    }

    return { ok: true, value };
}
