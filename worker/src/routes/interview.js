/**
 * Mock Interview routes.
 *
 *   POST   /api/interview/session              start an interview
 *   GET    /api/interview/sessions             this user's recent interviews
 *   GET    /api/interview/session/:id          one interview + transcript + report
 *   POST   /api/interview/session/:id/answer   submit an answer / hint / skip / clarify
 *   POST   /api/interview/session/:id/finish   final evidence-based report
 *   DELETE /api/interview/session/:id          delete the interview and its data
 *   POST   /api/interview/transcribe           speech-to-text for voice mode
 *   POST   /api/interview/speech               text-to-speech for voice mode
 *   POST   /api/interview/provider/test        check a candidate's own API key
 *
 * Everything is signed-in only and scoped by the session's user_id, so one
 * learner can never read or drive another learner's interview. The resume,
 * job description and transcript are stored only after the candidate ticks
 * the consent box, and DELETE removes all of it.
 *
 * A candidate may bring their own OpenAI-compatible key: it arrives in the
 * request body as `provider`, is used in-flight to call their chosen endpoint,
 * and is never logged or written to the database.
 */

import { json, error, readJsonBody } from "../lib/http.js";
import { authenticate } from "../lib/sessions.js";
import { rateLimit } from "../lib/ratelimit.js";
import { guardNewSession, guardTurn } from "../lib/quota.js";
import { runTurn, buildReport } from "../lib/interviewer.js";
import {
    chat,
    transcribe,
    synthesize,
    decodeBase64,
    encodeBase64,
    normalizeProvider
} from "../lib/ai.js";

const MAX_RESUME_CHARS = 20000;
const MAX_JD_CHARS = 20000;
const MAX_ANSWER_CHARS = 8000;
/** ~4.5 MB of audio once base64 is decoded. */
const MAX_AUDIO_BASE64 = 6000000;
/** Longest line handed to text-to-speech in one request. */
const MAX_TTS_CHARS = 1200;

/** Rough speaking pace used to turn a duration choice into a question count. */
const MINUTES_PER_QUESTION = 3;

const TURN_ACTIONS = ["answer", "hint", "clarify", "skip"];

/* =========================================================
   Small helpers
   ========================================================= */

function text(value, max) {
    if (typeof value !== "string") {
        return "";
    }

    const trimmed = value.trim();

    return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function clampInt(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.max(min, Math.min(max, parsed));
}

function publicSession(row) {
    return {
        id: row.id,
        mode: row.mode,
        coaching: Boolean(row.coaching),
        targetRole: row.target_role || "",
        experience: row.experience || "",
        lengthValue: row.length_value,
        lengthUnit: row.length_unit,
        questionTarget: row.question_target,
        focusAreas: row.focus_areas || "",
        resumeText: row.resume_text || "",
        jdText: row.jd_text || "",
        status: row.status,
        turnCount: row.turn_count,
        createdAt: row.created_at,
        completedAt: row.completed_at || null
    };
}

async function loadSession(env, id) {
    return env.DB.prepare(
        "SELECT * FROM interview_sessions WHERE id = ?"
    ).bind(id).first();
}

async function loadTurns(env, id) {
    const result = await env.DB.prepare(
        "SELECT turn_index, kind, content, created_at FROM interview_turns WHERE session_id = ? ORDER BY turn_index"
    ).bind(id).all();

    return result.results || [];
}

async function nextTurnIndex(env, id) {
    const row = await env.DB.prepare(
        "SELECT MAX(turn_index) AS max_index FROM interview_turns WHERE session_id = ?"
    ).bind(id).first();

    return row && row.max_index !== null && row.max_index !== undefined
        ? Number(row.max_index) + 1
        : 0;
}

async function appendTurns(env, id, startIndex, entries) {
    if (entries.length === 0) {
        return;
    }

    const now = new Date().toISOString();

    await env.DB.batch(
        entries.map((entry, offset) =>
            env.DB.prepare(
                `INSERT INTO interview_turns (id, session_id, turn_index, kind, content, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(
                crypto.randomUUID(),
                id,
                startIndex + offset,
                entry.kind,
                entry.content,
                now
            )
        )
    );
}

function feedbackText(feedback) {
    const lines = [];

    if (feedback.verdict) {
        lines.push(`Verdict: ${feedback.verdict}`);
    }

    if (feedback.strength) {
        lines.push(`What worked: ${feedback.strength}`);
    }

    if (feedback.gap) {
        lines.push(`What was missing: ${feedback.gap}`);
    }

    if (feedback.improve) {
        lines.push(`How to improve: ${feedback.improve}`);
    }

    return lines.join("\n");
}

/** Translates one model turn into the rows that belong in interview_turns. */
function turnEntries(turn, action, submitted) {
    const entries = [];

    if (action === "answer" && submitted) {
        entries.push({ kind: "answer", content: submitted });
    } else if (action === "skip") {
        entries.push({ kind: "skip", content: "skipped" });
    } else if (action === "clarify" && submitted) {
        entries.push({ kind: "clarify", content: submitted });
    }

    if (turn.feedback) {
        entries.push({ kind: "feedback", content: feedbackText(turn.feedback) });
    }

    if (turn.message) {
        entries.push({ kind: "note", content: turn.message });
    }

    if (turn.question) {
        entries.push({ kind: "question", content: turn.question });
    }

    return entries;
}

function modelFailure(err, action) {
    console.error("interview_model_failed", action, (err && err.message) || err);

    return error(
        "The interviewer could not respond just now. Please try again in a moment.",
        502
    );
}

/* =========================================================
   Routes
   ========================================================= */

export async function handle(request, env, url) {
    const path = url.pathname;
    const method = request.method;

    const { session: auth, headers } = await authenticate(request, env);

    if (!auth) {
        return error("Please sign in to use Mock Interview.", 401);
    }

    if (path === "/api/interview/session" && method === "POST") {
        return start(request, env, auth, headers);
    }

    if (path === "/api/interview/sessions" && method === "GET") {
        return list(env, auth, headers);
    }

    if (path === "/api/interview/transcribe" && method === "POST") {
        return speech(request, env, auth, headers);
    }

    if (path === "/api/interview/speech" && method === "POST") {
        return speak(request, env, auth, headers);
    }

    if (path === "/api/interview/provider/test" && method === "POST") {
        return testProvider(request, env, auth, headers);
    }

    const base = "/api/interview/session/";

    if (path.startsWith(base)) {
        const parts = path.slice(base.length).split("/");
        const id = decodeURIComponent(parts[0] || "");
        const action = parts[1] || "";

        if (!id || parts.length > 2) {
            return error("Not found.", 404);
        }

        if (method === "GET" && !action) {
            return detail(env, auth, headers, id);
        }

        if (method === "DELETE" && !action) {
            return remove(env, auth, headers, id);
        }

        if (method === "POST" && action === "answer") {
            return answer(request, env, auth, headers, id);
        }

        if (method === "POST" && action === "finish") {
            return finish(request, env, auth, headers, id);
        }
    }

    return error("Not found.", 404);
}

/** POST /api/interview/session */
async function start(request, env, auth, headers) {
    const gate = rateLimit(`interview:start:${auth.userId}`, 10, 60 * 60 * 1000);

    if (!gate.allowed) {
        return error("That is a lot of interviews in one hour. Please try again later.", 429);
    }

    const body = await readJsonBody(request);

    if (!body || typeof body !== "object") {
        return error("Expected a JSON request body.", 422);
    }

    const mode = body.mode === "voice" ? "voice" : body.mode === "written" ? "written" : null;

    if (!mode) {
        return error("Choose an interview mode: written or voice.", 422);
    }

    if (body.consent !== true) {
        return error(
            "Please confirm you are happy for this session's resume, job description " +
                "and transcript to be stored on this site.",
            422
        );
    }

    const coaching = body.coaching === false ? 0 : 1;
    const lengthValue = clampInt(body.lengthValue, 15, 100, 30);
    const lengthUnit = body.lengthUnit === "minutes" ? "minutes" : "questions";
    const questionTarget =
        lengthUnit === "minutes"
            ? Math.max(1, Math.min(100, Math.round(lengthValue / MINUTES_PER_QUESTION)))
            : lengthValue;

    const targetRole = text(body.targetRole, 120);
    const experience = text(body.experience, 120);
    const focusAreas = text(body.focusAreas, 500);
    const resumeText = text(body.resumeText, MAX_RESUME_CHARS);
    const jdText = text(body.jdText, MAX_JD_CHARS);

    if (!resumeText && !jdText && !targetRole) {
        return error(
            "Add a resume, a job description, or at least a target role so the " +
                "questions can be personalised.",
            422
        );
    }

    const blocked = await guardNewSession(env, auth.userId);

    if (blocked) {
        return blocked;
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
        `INSERT INTO interview_sessions
             (id, user_id, mode, coaching, target_role, experience, length_value,
              length_unit, question_target, focus_areas, resume_text, jd_text,
              status, turn_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)`
    )
        .bind(
            id,
            auth.userId,
            mode,
            coaching,
            targetRole,
            experience,
            lengthValue,
            lengthUnit,
            questionTarget,
            focusAreas,
            resumeText,
            jdText,
            now,
            now
        )
        .run();

    const provider = normalizeProvider(body.provider);
    const row = await loadSession(env, id);

    let turn;

    try {
        turn = await runTurn(env, { session: row, turns: [], action: "start", provider });
    } catch (err) {
        await remove(env, auth, headers, id);

        return modelFailure(err, "start");
    }

    await appendTurns(env, id, 0, turnEntries(turn, "start", ""));

    return json(
        {
            session: publicSession(row),
            turn: {
                message: turn.message,
                feedback: null,
                question: turn.question,
                done: false,
                turnCount: 0,
                questionTarget
            }
        },
        201,
        headers
    );
}

/** GET /api/interview/sessions */
async function list(env, auth, headers) {
    const result = await env.DB.prepare(
        `SELECT id, mode, coaching, target_role, question_target, status,
                turn_count, created_at, completed_at
           FROM interview_sessions
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 30`
    )
        .bind(auth.userId)
        .all();

    const sessions = (result.results || []).map((row) => ({
        id: row.id,
        mode: row.mode,
        coaching: Boolean(row.coaching),
        targetRole: row.target_role || "",
        questionTarget: row.question_target,
        status: row.status,
        turnCount: row.turn_count,
        createdAt: row.created_at,
        completedAt: row.completed_at || null
    }));

    return json({ sessions }, 200, headers);
}

/** GET /api/interview/session/:id */
async function detail(env, auth, headers, id) {
    const row = await loadSession(env, id);

    if (!row || row.user_id !== auth.userId) {
        return error("That interview was not found.", 404);
    }

    const turns = await loadTurns(env, id);
    const reportRow = await env.DB.prepare(
        "SELECT report_json FROM interview_reports WHERE session_id = ?"
    )
        .bind(id)
        .first();

    let report = null;

    if (reportRow) {
        try {
            report = JSON.parse(reportRow.report_json);
        } catch {
            report = null;
        }
    }

    return json(
        {
            session: publicSession(row),
            turns: turns.map((turn) => ({
                index: turn.turn_index,
                kind: turn.kind,
                content: turn.content,
                createdAt: turn.created_at
            })),
            report
        },
        200,
        headers
    );
}

/** DELETE /api/interview/session/:id */
async function remove(env, auth, headers, id) {
    const row = await loadSession(env, id);

    if (!row || row.user_id !== auth.userId) {
        return error("That interview was not found.", 404);
    }

    await env.DB.batch([
        env.DB.prepare("DELETE FROM interview_turns WHERE session_id = ?").bind(id),
        env.DB.prepare("DELETE FROM interview_reports WHERE session_id = ?").bind(id),
        env.DB.prepare("DELETE FROM interview_sessions WHERE id = ? AND user_id = ?").bind(
            id,
            auth.userId
        )
    ]);

    return json({ id, deleted: true }, 200, headers);
}

/** POST /api/interview/session/:id/answer */
async function answer(request, env, auth, headers, id) {
    const row = await loadSession(env, id);

    if (!row || row.user_id !== auth.userId) {
        return error("That interview was not found.", 404);
    }

    if (row.status === "completed") {
        return error("This interview has already finished. Open it to read your report.", 409);
    }

    const body = await readJsonBody(request);
    const action =
        body && TURN_ACTIONS.indexOf(body.action) !== -1 ? body.action : "answer";
    const submitted = text(body && body.text, MAX_ANSWER_CHARS);

    if (action === "answer" && !submitted) {
        return error("Type or dictate an answer first.", 422);
    }

    if (action === "clarify" && !submitted) {
        return error("What would you like clarified?", 422);
    }

    if (action !== "skip") {
        const blocked = await guardTurn(env, auth.userId, row);

        if (blocked) {
            return blocked;
        }
    }

    const gate = rateLimit(`interview:turn:${auth.userId}`, 60, 5 * 60 * 1000);

    if (!gate.allowed) {
        return error("You are answering very quickly. Please wait a moment.", 429);
    }

    const turns = await loadTurns(env, id);
    const provider = normalizeProvider(body && body.provider);

    let turn;

    try {
        turn = await runTurn(env, { session: row, turns, action, text: submitted, provider });
    } catch (err) {
        return modelFailure(err, action);
    }

    await appendTurns(env, id, await nextTurnIndex(env, id), turnEntries(turn, action, submitted));

    const answered = action === "answer";
    const turnCount = Number(row.turn_count) + (answered ? 1 : 0);
    const reachedTarget = turnCount >= Number(row.question_target);
    const done = Boolean(turn.done) || reachedTarget;
    const now = new Date().toISOString();

    await env.DB.prepare(
        "UPDATE interview_sessions SET turn_count = ?, updated_at = ? WHERE id = ?"
    )
        .bind(turnCount, now, id)
        .run();

    return json(
        {
            message: turn.message,
            feedback: turn.feedback,
            question: turn.question,
            done,
            turnCount,
            questionTarget: Number(row.question_target)
        },
        200,
        headers
    );
}

/** POST /api/interview/session/:id/finish */
async function finish(request, env, auth, headers, id) {
    const row = await loadSession(env, id);

    if (!row || row.user_id !== auth.userId) {
        return error("That interview was not found.", 404);
    }

    const turns = await loadTurns(env, id);

    if (!turns.some((turn) => turn.kind === "answer")) {
        return error("Answer at least one question before finishing.", 422);
    }

    const body = await readJsonBody(request);
    const regenerate = Boolean(body && body.regenerate === true);
    const provider = normalizeProvider(body && body.provider);

    const existing = await env.DB.prepare(
        "SELECT report_json FROM interview_reports WHERE session_id = ?"
    )
        .bind(id)
        .first();

    if (existing && !regenerate) {
        try {
            return json({ report: JSON.parse(existing.report_json), cached: true }, 200, headers);
        } catch {
            /* a corrupt row is simply rebuilt below */
        }
    }

    const gate = rateLimit(`interview:report:${auth.userId}`, 20, 60 * 60 * 1000);

    if (!gate.allowed) {
        return error("Too many reports in one hour. Please try again later.", 429);
    }

    let report;

    try {
        report = await buildReport(env, { session: row, turns, provider });
    } catch (err) {
        return modelFailure(err, "finish");
    }

    const now = new Date().toISOString();

    await env.DB.batch([
        env.DB.prepare(
            `INSERT INTO interview_reports (session_id, report_json, created_at)
             VALUES (?, ?, ?)
             ON CONFLICT (session_id)
             DO UPDATE SET report_json = excluded.report_json, created_at = excluded.created_at`
        ).bind(id, JSON.stringify(report), now),
        env.DB.prepare(
            `UPDATE interview_sessions
                SET status = 'completed',
                    completed_at = COALESCE(completed_at, ?),
                    updated_at = ?
              WHERE id = ? AND user_id = ?`
        ).bind(now, now, id, auth.userId)
    ]);

    return json({ report, cached: false }, 200, headers);
}

/** POST /api/interview/transcribe */
async function speech(request, env, auth, headers) {
    const gate = rateLimit(`interview:stt:${auth.userId}`, 40, 5 * 60 * 1000);

    if (!gate.allowed) {
        return error("Too many recordings in a short time. Please wait a moment.", 429);
    }

    const body = await readJsonBody(request);
    const audio = body && typeof body.audio === "string" ? body.audio : "";

    if (!audio) {
        return error("No audio was received.", 422);
    }

    if (audio.length > MAX_AUDIO_BASE64) {
        return error("That recording is too long. Please keep answers under two minutes.", 413);
    }

    let bytes;

    try {
        bytes = decodeBase64(audio);
    } catch {
        return error("The audio could not be read. Please record again.", 422);
    }

    try {
        const transcript = await transcribe(env, {
            bytes,
            mime: typeof body.mime === "string" && body.mime ? body.mime : "audio/webm",
            language: typeof body.language === "string" ? body.language : "",
            provider: normalizeProvider(body.provider)
        });

        return json({ text: transcript }, 200, headers);
    } catch (err) {
        console.error("interview_stt_failed", (err && err.message) || err);

        return error(
            "Speech recognition failed. You can type your answer instead.",
            502
        );
    }
}

/** POST /api/interview/speech */
async function speak(request, env, auth, headers) {
    const gate = rateLimit(`interview:tts:${auth.userId}`, 60, 5 * 60 * 1000);

    if (!gate.allowed) {
        return error("That is a lot of speech in a short time. Please wait a moment.", 429);
    }

    const body = await readJsonBody(request);
    const line = text(body && body.text, MAX_TTS_CHARS);

    if (!line) {
        return error("There is nothing to speak.", 422);
    }

    try {
        const audio = await synthesize(env, {
            text: line,
            provider: normalizeProvider(body && body.provider)
        });

        return json({ audio: encodeBase64(audio.bytes), mime: audio.mime }, 200, headers);
    } catch (err) {
        // Never fatal: the browser voice is the fallback.
        console.error("interview_tts_failed", (err && err.message) || err);

        return error(
            "The studio voice is unavailable. Your browser voice will be used instead.",
            502
        );
    }
}

/** POST /api/interview/provider/test */
async function testProvider(request, env, auth, headers) {
    const gate = rateLimit(`interview:test:${auth.userId}`, 20, 5 * 60 * 1000);

    if (!gate.allowed) {
        return error("Please wait a moment before testing again.", 429);
    }

    const body = await readJsonBody(request);
    const provider = normalizeProvider(body && body.provider);

    if (!provider) {
        return error("Add an API key (and an https:// base URL) to test.", 422);
    }

    try {
        const reply = await chat(env, {
            system: "You are a connection check. Reply with the single word: ok.",
            messages: [{ role: "user", content: "ping" }],
            maxTokens: 16,
            provider
        });

        return json(
            {
                ok: true,
                model: provider.textModel,
                reply: String(reply).trim().slice(0, 60)
            },
            200,
            headers
        );
    } catch (err) {
        // ok:false keeps the transport a success so the browser can show the
        // provider's own message. The key itself is never included.
        return json(
            { ok: false, message: String((err && err.message) || err).slice(0, 300) },
            200,
            headers
        );
    }
}
