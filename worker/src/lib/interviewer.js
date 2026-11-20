/**
 * Mock Interview — the interviewer itself.
 *
 * This module owns the conversation: it turns stored turns into model
 * messages, runs one turn, and produces the final report. It never touches
 * HTTP or the database; routes/interview.js does that.
 */

import { chat, parseJsonObject } from "./ai.js";
import {
    buildSystemPrompt,
    buildReportSystemPrompt,
    HINT_INSTRUCTION
} from "../prompts/interview-prompt.js";

/** Rough character budget for the transcript handed to the model each turn. */
const HISTORY_CHAR_BUDGET = 14000;

/** Upper bound on the transcript shown in the final report prompt. */
const REPORT_CHAR_BUDGET = 24000;

function str(value) {
    return typeof value === "string" ? value.trim() : "";
}

/**
 * Maps stored turns onto chat messages.
 * The resume and job description live in the system prompt, so they are not
 * repeated here — only the running conversation is.
 */
function toMessages(turns) {
    const messages = [];

    for (const turn of turns) {
        const content = str(turn.content);

        if (!content) {
            continue;
        }

        switch (turn.kind) {
            case "question":
                messages.push({ role: "assistant", content });
                break;
            case "answer":
                messages.push({ role: "user", content: `CANDIDATE ANSWER:\n${content}` });
                break;
            case "feedback":
                messages.push({ role: "assistant", content: `[coaching feedback] ${content}` });
                break;
            case "hint":
                messages.push({ role: "assistant", content: `[hint] ${content}` });
                break;
            case "note":
                messages.push({ role: "assistant", content });
                break;
            case "skip":
                messages.push({ role: "user", content: "[the candidate skipped this question]" });
                break;
            case "clarify":
                messages.push({ role: "user", content: `[clarification requested] ${content}` });
                break;
            default:
                break;
        }
    }

    return messages;
}

/** Drops the oldest messages until the transcript fits the budget. */
function trimToBudget(messages, budget) {
    let total = 0;
    const kept = [];

    for (let i = messages.length - 1; i >= 0; i--) {
        const size = messages[i].content.length + 16;

        if (total + size > budget && kept.length > 0) {
            break;
        }

        total += size;
        kept.unshift(messages[i]);
    }

    return kept;
}

function directiveFor(action, text) {
    switch (action) {
        case "start":
            return "Open the interview. Greet the candidate in one short line, then ask your first primary question. Give no feedback yet.";
        case "hint":
            return `${HINT_INSTRUCTION}\n\nAsk nothing new: keep the current question open, reply with the hint in "message", leave "question" empty.`;
        case "clarify":
            return `The candidate asked for clarification: "${text}"\n\nAnswer the clarification in "message", then keep the current question open by repeating it in "question".`;
        case "skip":
            return "The candidate wants to skip the current question. Move on to the next topic in \"question\". Do not comment on the skip.";
        default:
            return `CANDIDATE ANSWER:\n${text}`;
    }
}

function normalizeFeedback(value) {
    if (!value || typeof value !== "object") {
        return null;
    }

    const feedback = {
        verdict: str(value.verdict),
        strength: str(value.strength),
        gap: str(value.gap),
        improve: str(value.improve)
    };

    if (!feedback.strength && !feedback.gap && !feedback.improve) {
        return null;
    }

    return feedback;
}

/**
 * Coerces a model reply into the shape the frontend expects, so a model that
 * ignores the JSON contract still produces a usable question.
 *
 * `expectsQuestion` is false for hints, where the current question must stay
 * open and the reply belongs in "message".
 */
function normalizeTurn(parsed, raw, coaching, expectsQuestion) {
    if (!parsed || typeof parsed !== "object") {
        const text = str(raw);

        return expectsQuestion
            ? { message: "", feedback: null, question: text, done: false }
            : { message: text, feedback: null, question: "", done: false };
    }

    let message = str(parsed.message);
    let question = str(parsed.question);
    const done = Boolean(parsed.done);

    // Some models put the question in "message". Promote it rather than
    // ending up with a turn that asks nothing.
    if (expectsQuestion && !done && !question && message) {
        question = message;
        message = "";
    }

    if (done) {
        question = "";
    }

    return {
        message,
        feedback: coaching ? normalizeFeedback(parsed.feedback) : null,
        question,
        done
    };
}

/**
 * Runs one interview turn.
 *
 *   action:   "start" | "answer" | "hint" | "clarify" | "skip"
 *   text:     the candidate's words (answer, or clarification question)
 *   provider: the candidate's own model key, when they supplied one
 *
 * Returns { message, feedback, question, done }.
 */
export async function runTurn(env, { session, turns, action, text, provider }) {
    const history = trimToBudget(toMessages(turns), HISTORY_CHAR_BUDGET);
    const coaching = Boolean(session.coaching);
    const expectsQuestion = action !== "hint" && action !== "clarify";

    const messages = history.concat([
        { role: "user", content: directiveFor(action, str(text)) }
    ]);

    const raw = await chat(env, {
        system: buildSystemPrompt(session),
        messages,
        maxTokens: action === "answer" || action === "start" ? 1100 : 600,
        provider
    });

    return normalizeTurn(parseJsonObject(raw), raw, coaching, expectsQuestion);
}

/* =========================================================
   Final report
   ========================================================= */

function renderTranscript(turns) {
    const lines = [];

    for (const turn of turns) {
        const content = str(turn.content);

        if (!content) {
            continue;
        }

        if (turn.kind === "question") {
            lines.push(`Interviewer: ${content}`);
        } else if (turn.kind === "answer") {
            lines.push(`Candidate: ${content}`);
        } else if (turn.kind === "hint") {
            lines.push(`(hint given: ${content})`);
        } else if (turn.kind === "feedback") {
            lines.push(`(coaching noted: ${content})`);
        } else if (turn.kind === "skip") {
            lines.push("(candidate skipped a question)");
        }
    }

    const text = lines.join("\n\n");

    return text.length > REPORT_CHAR_BUDGET
        ? text.slice(text.length - REPORT_CHAR_BUDGET)
        : text;
}

function stringArray(value, limit) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
        .slice(0, limit);
}

function evidenceArray(value, limit) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => {
            if (!entry || typeof entry !== "object") {
                return null;
            }

            const point = str(entry.point);

            if (!point) {
                return null;
            }

            return { point, evidence: str(entry.evidence) };
        })
        .filter(Boolean)
        .slice(0, limit);
}

function scoreOf(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0) {
        return null;
    }

    return Math.max(1, Math.min(10, Math.round(number)));
}

function normalizeReport(parsed, raw) {
    if (!parsed || typeof parsed !== "object") {
        return {
            summary: str(raw) || "The interview finished before a full assessment could be written.",
            verdict: "",
            scores: {},
            strengths: [],
            gaps: [],
            improvement_plan: [],
            top_priorities: [],
            closing_note: ""
        };
    }

    const scores = parsed.scores && typeof parsed.scores === "object"
        ? {
            technical_knowledge: scoreOf(parsed.scores.technical_knowledge),
            problem_solving: scoreOf(parsed.scores.problem_solving),
            communication: scoreOf(parsed.scores.communication),
            role_fit: scoreOf(parsed.scores.role_fit)
        }
        : {};

    const plan = Array.isArray(parsed.improvement_plan)
        ? parsed.improvement_plan
            .map((entry) => {
                if (!entry || typeof entry !== "object") {
                    return null;
                }

                const focus = str(entry.focus);

                if (!focus) {
                    return null;
                }

                return {
                    focus,
                    actions: stringArray(entry.actions, 6),
                    practice: str(entry.practice)
                };
            })
            .filter(Boolean)
            .slice(0, 6)
        : [];

    return {
        summary: str(parsed.summary),
        verdict: str(parsed.verdict),
        scores,
        strengths: evidenceArray(parsed.strengths, 6),
        gaps: evidenceArray(parsed.gaps, 6),
        improvement_plan: plan,
        top_priorities: stringArray(parsed.top_priorities, 3),
        closing_note: str(parsed.closing_note)
    };
}

/** Produces the evidence-based final assessment. */
export async function buildReport(env, { session, turns, provider }) {
    const transcript = renderTranscript(turns);

    const messages = [
        {
            role: "user",
            content:
                "--- Full transcript ---\n" +
                (transcript || "(no answers were recorded)") +
                "\n\n--- Now write the final assessment as specified. ---"
        }
    ];

    const raw = await chat(env, {
        system: buildReportSystemPrompt(session),
        messages,
        maxTokens: 1800,
        provider
    });

    return normalizeReport(parseJsonObject(raw), raw);
}
