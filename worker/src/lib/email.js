/**
 * Password reset delivery through EmailJS (https://www.emailjs.com).
 *
 * EmailJS sends the message from a mailbox you connect in their dashboard,
 * so no SMTP credentials or domain verification are needed.
 *
 * Configuration (Worker variables / secrets — see the README):
 *   EMAILJS_SERVICE_ID   service that owns the sending mailbox
 *   EMAILJS_TEMPLATE_ID  template containing the reset link
 *   EMAILJS_PUBLIC_KEY   public key, safe to send from a Worker
 *   EMAILJS_PRIVATE_KEY  optional secret, required when the account has
 *                        "Use Private Key" enabled
 *
 * The template must reference these variables:
 *   {{to_email}}  {{to_name}}  {{reset_link}}  {{expires_hours}}
 */

const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

const SETTING_NAMES = [
    "EMAILJS_SERVICE_ID",
    "EMAILJS_TEMPLATE_ID",
    "EMAILJS_PUBLIC_KEY"
];

/** Returns the settings, or null when the integration is not configured. */
function settings(env) {
    const missing = SETTING_NAMES.filter((name) => !env || !env[name]);

    if (missing.length > 0) {
        return { missing, values: null };
    }

    return {
        missing: [],
        values: {
            serviceId: env.EMAILJS_SERVICE_ID,
            templateId: env.EMAILJS_TEMPLATE_ID,
            publicKey: env.EMAILJS_PUBLIC_KEY,
            privateKey: env.EMAILJS_PRIVATE_KEY || ""
        }
    };
}

/** True when every required EmailJS variable is present. */
export function isEmailConfigured(env) {
    return settings(env).missing.length === 0;
}

/**
 * Throws when EmailJS is unconfigured or rejects the send, so the caller can
 * report a real failure instead of silently dropping the email.
 */
export async function sendPasswordResetEmail(env, { to, name, link, expiresHours }) {
    const { missing, values } = settings(env);

    if (!values) {
        throw new Error(`EmailJS is not configured: missing ${missing.join(", ")}`);
    }

    const payload = {
        service_id: values.serviceId,
        template_id: values.templateId,
        user_id: values.publicKey,
        template_params: {
            to_email: to,
            to_name: name,
            reset_link: link,
            expires_hours: String(expiresHours)
        }
    };

    if (values.privateKey) {
        payload.accessToken = values.privateKey;
    }

    const response = await fetch(EMAILJS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const detail = await response.text();

        throw new Error(
            `EmailJS rejected the send (${response.status}): ${detail.slice(0, 300)}`
        );
    }
}
