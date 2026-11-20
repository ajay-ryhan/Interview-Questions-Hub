/**
 * Model access for Mock Interview Mode.
 *
 * Three providers, chosen at runtime:
 *
 *   bring-your-own (optional)  the candidate's own OpenAI-compatible key,
 *                              passed in with each request and used in-flight
 *                              only — never logged, never written to D1
 *   openai         (optional)  OPENAI_API_KEY secret — no free tier
 *   workers-ai     (default)   env.AI binding — 10,000 Neurons/day free
 *
 * Nothing here ever runs in the browser, so keys and prompts stay server-side.
 * The caller only sees plain strings (or audio bytes) back.
 */

const OPENAI_BASE = "https://api.openai.com/v1";

const MAX_KEY_CHARS = 400;
const MAX_BASE_CHARS = 300;
const MAX_MODEL_CHARS = 120;
const MAX_VOICE_CHARS = 60;

/** Default models for candidate-supplied OpenAI-compatible keys. */
const DEFAULT_TEXT_MODEL = "gpt-4o-mini";
const DEFAULT_STT_MODEL = "whisper-1";
const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const DEFAULT_TTS_VOICE = "alloy";

function str(value, max) {
    if (typeof value !== "string") {
        return "";
    }

    const trimmed = value.trim();

    return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/* =========================================================
   Provider selection
   ========================================================= */

/** Which server-side provider to use when the caller brings no key. */
export function providerOf(env) {
    const configured = String(env.INTERVIEW_PROVIDER || "workers-ai").toLowerCase();

    if (configured === "openai" && env.OPENAI_API_KEY) {
        return "openai";
    }

    return "workers-ai";
}

/** The server's own OpenAI key, used only when INTERVIEW_PROVIDER = "openai". */
function envKeyProvider(env) {
    return {
        key: env.OPENAI_API_KEY,
        baseUrl: OPENAI_BASE,
        textModel: env.OPENAI_TEXT_MODEL || DEFAULT_TEXT_MODEL,
        sttModel: env.OPENAI_STT_MODEL || DEFAULT_STT_MODEL,
        ttsModel: env.OPENAI_TTS_MODEL || DEFAULT_TTS_MODEL,
        voice: env.OPENAI_TTS_VOICE || DEFAULT_TTS_VOICE
    };
}

/**
 * Validates a candidate-supplied provider block.
 *
 * Returns null when there is no usable key, so the caller simply falls back to
 * the server default. Only https base URLs are accepted, so a key can never be
 * sent over a plain-text connection.
 */
export function normalizeProvider(input) {
    if (!input || typeof input !== "object") {
        return null;
    }

    const key = str(input.key, MAX_KEY_CHARS);

    if (!key) {
        return null;
    }

    let baseUrl = str(input.baseUrl, MAX_BASE_CHARS).replace(/\/+$/, "");

    if (baseUrl) {
        if (!/^https:\/\/[^\s/]+/i.test(baseUrl)) {
            return null;
        }
    } else {
        baseUrl = OPENAI_BASE;
    }

    return {
        key,
        baseUrl,
        textModel: str(input.textModel, MAX_MODEL_CHARS) || DEFAULT_TEXT_MODEL,
        sttModel: str(input.sttModel, MAX_MODEL_CHARS) || DEFAULT_STT_MODEL,
        ttsModel: str(input.ttsModel, MAX_MODEL_CHARS) || DEFAULT_TTS_MODEL,
        voice: str(input.voice, MAX_VOICE_CHARS) || DEFAULT_TTS_VOICE
    };
}

function workersAiTextModel(env) {
    return env.INTERVIEW_TEXT_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
}

function workersAiSttModel(env) {
    return env.INTERVIEW_STT_MODEL || "@cf/openai/whisper";
}

/* =========================================================
   Text generation
   ========================================================= */

/**
 * One completion. `messages` are { role: "user" | "assistant", content }.
 * `system` is passed separately so the caller never has to build it by hand.
 * When `provider` carries a key it wins; otherwise the server default is used.
 */
export async function chat(env, { system, messages, maxTokens = 1024, provider }) {
    const framed = [{ role: "system", content: system }, ...messages];

    if (provider) {
        return compatibleChat(provider, framed, maxTokens);
    }

    if (providerOf(env) === "openai") {
        return compatibleChat(envKeyProvider(env), framed, maxTokens);
    }

    return workersAiChat(env, { system, messages, maxTokens });
}

/**
 * One chat completion against any OpenAI-compatible endpoint.
 *
 * Newer OpenAI models reject `max_tokens`, while most compatible servers reject
 * `max_completion_tokens`. We send the common field first and retry once with
 * the other, so a single code path covers both.
 */
async function compatibleChat(provider, messages, maxTokens) {
    let response = await postChat(provider, messages, "max_tokens", maxTokens);

    if (!response.ok) {
        let detail = await response.text();

        if (/max_completion_tokens|max_tokens/i.test(detail)) {
            response = await postChat(provider, messages, "max_completion_tokens", maxTokens);

            if (response.ok) {
                return readChatCompletion(response);
            }

            detail = await response.text();
        }

        throw new Error(`AI provider error ${response.status}: ${detail.slice(0, 300)}`);
    }

    return readChatCompletion(response);
}

function postChat(provider, messages, tokenField, maxTokens) {
    const payload = { model: provider.textModel, messages };
    payload[tokenField] = maxTokens;

    return fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${provider.key}`
        },
        body: JSON.stringify(payload)
    });
}

async function readChatCompletion(response) {
    const data = await response.json();
    const choice = data && data.choices && data.choices[0];
    const text = choice && choice.message && choice.message.content;

    if (typeof text !== "string" || !text) {
        throw new Error("The model returned an empty response.");
    }

    return text;
}

async function workersAiChat(env, { system, messages, maxTokens }) {
    if (!env.AI) {
        throw new Error(
            "Workers AI binding \"AI\" is missing. Add the [ai] block to wrangler.toml."
        );
    }

    const result = await env.AI.run(workersAiTextModel(env), {
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: maxTokens
    });

    const text =
        (result && (result.response || result.result)) ||
        (typeof result === "string" ? result : "");

    if (!text) {
        throw new Error("The model returned an empty response.");
    }

    return text;
}

/* =========================================================
   Speech to text
   ========================================================= */

/**
 * Transcribes one recorded clip.
 * `bytes` is a Uint8Array of the recording; `mime` identifies the container.
 */
export async function transcribe(env, { bytes, mime, language, provider }) {
    if (!bytes || bytes.length === 0) {
        throw new Error("No audio was received.");
    }

    if (provider) {
        return compatibleTranscribe(provider, { bytes, mime, language });
    }

    if (providerOf(env) === "openai") {
        return compatibleTranscribe(envKeyProvider(env), { bytes, mime, language });
    }

    return workersAiTranscribe(env, { bytes, language });
}

async function compatibleTranscribe(provider, { bytes, mime, language }) {
    const form = new FormData();
    const type = mime || "audio/webm";

    form.append(
        "file",
        new Blob([bytes], { type }),
        "answer." + extensionFor(type)
    );
    form.append("model", provider.sttModel);

    if (language) {
        form.append("language", language);
    }

    const response = await fetch(`${provider.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { authorization: `Bearer ${provider.key}` },
        body: form
    });

    if (!response.ok) {
        const detail = await response.text();

        throw new Error(`Transcription error ${response.status}: ${detail.slice(0, 300)}`);
    }

    const data = await response.json();

    return String((data && data.text) || "").trim();
}

async function workersAiTranscribe(env, { bytes, language }) {
    if (!env.AI) {
        throw new Error(
            "Workers AI binding \"AI\" is missing. Add the [ai] block to wrangler.toml."
        );
    }

    const result = await env.AI.run(workersAiSttModel(env), {
        // The binding expects a plain array of byte values.
        audio: Array.from(bytes),
        language: language || undefined
    });

    const text = result && result.text;

    if (typeof text !== "string") {
        throw new Error("Transcription failed.");
    }

    return text.trim();
}

/* =========================================================
   Text to speech
   ========================================================= */

/**
 * Generates speech for the interviewer's line.
 *
 * Only used when a key is configured: the browser already has a free fallback
 * voice, so there is no reason to fail a turn when no provider is available.
 * Returns { bytes, mime }.
 */
export async function synthesize(env, { text, provider }) {
    const body = typeof text === "string" ? text.trim() : "";

    if (!body) {
        throw new Error("There is nothing to speak.");
    }

    if (provider) {
        return compatibleSpeech(provider, body);
    }

    if (providerOf(env) === "openai") {
        return compatibleSpeech(envKeyProvider(env), body);
    }

    throw new Error("No speech provider is configured.");
}

async function compatibleSpeech(provider, text) {
    const response = await fetch(`${provider.baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${provider.key}`
        },
        body: JSON.stringify({
            model: provider.ttsModel,
            voice: provider.voice,
            input: text
        })
    });

    if (!response.ok) {
        const detail = await response.text();

        throw new Error(`Speech error ${response.status}: ${detail.slice(0, 300)}`);
    }

    const buffer = await response.arrayBuffer();

    return { bytes: new Uint8Array(buffer), mime: "audio/mpeg" };
}

function extensionFor(mime) {
    if (mime.includes("mp4")) return "mp4";
    if (mime.includes("ogg")) return "ogg";
    if (mime.includes("wav")) return "wav";
    if (mime.includes("mpeg")) return "mp3";

    return "webm";
}

/* =========================================================
   Helpers shared with the interview logic
   ========================================================= */

/**
 * Reads the first JSON object out of a model reply.
 * Small models sometimes wrap it in prose or fences, so this is deliberately
 * forgiving; on failure the caller falls back to using the raw text.
 */
export function parseJsonObject(text) {
    if (!text) {
        return null;
    }

    const cleaned = String(text)
        .replace(/^\s*```(?:json)?/i, "")
        .replace(/```\s*$/, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        /* fall through to the brace scan */
    }

    const start = cleaned.indexOf("{");

    if (start === -1) {
        return null;
    }

    let depth = 0;

    for (let i = start; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (char === "{") {
            depth++;
        } else if (char === "}") {
            depth--;

            if (depth === 0) {
                try {
                    return JSON.parse(cleaned.slice(start, i + 1));
                } catch {
                    return null;
                }
            }
        }
    }

    return null;
}

/** Decodes a base64 string into bytes without Buffer. */
export function decodeBase64(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

/** Encodes bytes as base64 so generated speech can travel as JSON. */
export function encodeBase64(bytes) {
    const chunk = 0x8000;
    let binary = "";

    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }

    return btoa(binary);
}
