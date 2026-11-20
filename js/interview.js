/* =========================================================
   QA INTERVIEW HUB — MOCK INTERVIEW

   A separate practice section. Nothing here touches the study
   views: the router hands over the #mock-interview hash and this
   module owns everything after that.

   Two modes:
     written  — type each answer
     voice    — the interviewer speaks, the microphone records
                your answer, and speech-to-text turns it into text

   Coaching mode gives feedback after every answer; Interview
   mode stays in character and saves everything for the report.
   Signed-in only: the API refuses anonymous callers.
========================================================= */

(function () {
    "use strict";

    var api = window.QAAPI;

    var HASH = "mock-interview";
    var MIN_LENGTH = 15;
    var MAX_LENGTH = 100;

    /** ~3 minutes of interview per question, used for the time estimate. */
    var MINUTES_PER_QUESTION = 3;

    /** Longest single recording accepted, in milliseconds. */
    var MAX_RECORDING_MS = 120000;

    /** sessionStorage key for the candidate's own AI provider details. */
    var STORAGE_KEY = "qa_interview_provider";

    var root = document.getElementById("interview-root");
    var backButton = document.getElementById("interview-back-button");

    var state = null;
    var busy = false;

    var timerHandle = null;
    var elapsed = 0;

    var recorder = null;
    var recordedChunks = [];
    var micStream = null;
    var recordingStopTimer = null;
    var autoSubmit = false;

    var setupDraft = null;

    /* The candidate's own key lives here (and in sessionStorage) only. */
    var providerSettings = loadProviderSettings();

    /* Currently playing text-to-speech clip, so it can be stopped. */
    var speechAudio = null;

    /* ==========================
       Small helpers
    ========================== */

    function el(tag, className, text) {
        var node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== undefined && text !== null) {
            node.textContent = text;
        }

        return node;
    }

    function clear(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    function signedIn() {
        return Boolean(window.QAAuth && window.QAAuth.user);
    }

    function errorText(result, fallback) {
        return api && api.messageOf ? api.messageOf(result, fallback) : fallback;
    }

    function formatClock(seconds) {
        var total = Math.max(0, Math.floor(seconds));
        var minutes = Math.floor(total / 60);
        var rest = total % 60;

        return (
            (minutes < 10 ? "0" : "") + minutes + ":" + (rest < 10 ? "0" : "") + rest
        );
    }

    /* ==========================
       Bring-your-own AI key
    ========================== */

    function defaultProviderSettings() {
        return {
            useKey: false,
            key: "",
            baseUrl: "",
            textModel: "gpt-4o-mini",
            sttModel: "whisper-1",
            ttsModel: "gpt-4o-mini-tts",
            voice: "alloy"
        };
    }

    /** Restores the draft from sessionStorage; the key never leaves this device. */
    function loadProviderSettings() {
        var fallback = defaultProviderSettings();

        try {
            var raw = window.sessionStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return fallback;
            }

            var saved = JSON.parse(raw);

            return {
                useKey: Boolean(saved.useKey),
                key: typeof saved.key === "string" ? saved.key : "",
                baseUrl: typeof saved.baseUrl === "string" ? saved.baseUrl : "",
                textModel: saved.textModel || fallback.textModel,
                sttModel: saved.sttModel || fallback.sttModel,
                ttsModel: saved.ttsModel || fallback.ttsModel,
                voice: saved.voice || fallback.voice
            };
        } catch (error) {
            return fallback;
        }
    }

    function saveProviderSettings() {
        try {
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(providerSettings));
        } catch (error) {
            /* Private mode: the key simply stays in memory for this page. */
        }
    }

    /** The provider block sent with each request, or null for the site default. */
    function activeProvider() {
        if (!providerSettings || !providerSettings.useKey) {
            return null;
        }

        var key = (providerSettings.key || "").trim();

        if (!key) {
            return null;
        }

        return {
            key: key,
            baseUrl: (providerSettings.baseUrl || "").trim(),
            textModel: providerSettings.textModel,
            sttModel: providerSettings.sttModel,
            ttsModel: providerSettings.ttsModel,
            voice: providerSettings.voice
        };
    }

    function providerField(label, type, placeholder, field, hint) {
        var wrap = el("label", "interview-field");
        wrap.appendChild(el("span", "interview-label", label));

        var input = el("input", "interview-input");
        input.type = type;
        input.placeholder = placeholder || "";
        input.value = providerSettings[field] || "";

        if (type === "password") {
            input.autocomplete = "off";
            input.spellcheck = false;
        }

        input.addEventListener("input", function () {
            providerSettings[field] = input.value;
            saveProviderSettings();
        });

        wrap.appendChild(input);

        if (hint) {
            wrap.appendChild(el("span", "interview-hint", hint));
        }

        return wrap;
    }

    function buildProviderPanel() {
        var wrap = el("div", "interview-provider");

        var toggle = el("label", "interview-provider-toggle");

        var check = el("input");
        check.type = "checkbox";
        check.checked = Boolean(providerSettings.useKey);
        check.addEventListener("change", function () {
            providerSettings.useKey = check.checked;
            saveProviderSettings();
            renderSetup();
        });

        toggle.appendChild(check);
        toggle.appendChild(el("span", "interview-provider-title", "🔑 Use my own AI key"));
        toggle.appendChild(
            el(
                "span",
                "interview-provider-hint",
                "Optional. Use your own OpenAI-compatible account instead of the site's " +
                    "default model. The key is kept in this browser tab only and sent with " +
                    "each request — it is never stored on the server."
            )
        );
        wrap.appendChild(toggle);

        if (!providerSettings.useKey) {
            return wrap;
        }

        var body = el("div", "interview-provider-body");

        body.appendChild(
            providerField(
                "Base URL",
                "text",
                "https://api.openai.com/v1",
                "baseUrl",
                "Leave blank for OpenAI. Set it for Groq, OpenRouter, Together, Ollama, LM Studio…"
            )
        );
        body.appendChild(
            providerField(
                "API key",
                "password",
                "sk-…",
                "key",
                "Stored in sessionStorage and cleared when this tab closes."
            )
        );
        body.appendChild(providerField("Text model", "text", "gpt-4o-mini", "textModel", ""));
        body.appendChild(
            providerField("Speech-to-text model", "text", "whisper-1", "sttModel", "")
        );
        body.appendChild(
            providerField("Text-to-speech model", "text", "gpt-4o-mini-tts", "ttsModel", "")
        );
        body.appendChild(
            providerField("Voice", "text", "alloy", "voice", "e.g. alloy, verse, shimmer")
        );

        var actions = el("div", "interview-provider-actions");

        var test = el("button", "btn btn-ghost btn-small", "Test connection");
        test.type = "button";
        test.addEventListener("click", function () {
            testProvider(test);
        });
        actions.appendChild(test);

        var reset = el("button", "btn btn-ghost btn-small is-danger", "Clear key");
        reset.type = "button";
        reset.addEventListener("click", function () {
            providerSettings = defaultProviderSettings();

            try {
                window.sessionStorage.removeItem(STORAGE_KEY);
            } catch (error) {
                /* nothing to remove */
            }

            renderSetup();
        });
        actions.appendChild(reset);
        body.appendChild(actions);

        var status = el("p", "interview-provider-status");
        status.id = "interview-provider-status";
        status.hidden = true;
        body.appendChild(status);

        wrap.appendChild(body);

        return wrap;
    }

    function setProviderStatus(message, tone) {
        var node = document.getElementById("interview-provider-status");

        if (!node) {
            return;
        }

        node.textContent = message;
        node.className = "interview-provider-status" + (tone ? " is-" + tone : "");
        node.hidden = !message;
    }

    function testProvider(button) {
        var provider = activeProvider();

        if (!provider) {
            setProviderStatus("Enter an API key first.", "error");
            return;
        }

        button.disabled = true;
        setProviderStatus("Testing the connection...");

        api.testInterviewProvider({ provider: provider })
            .then(function (result) {
                button.disabled = false;

                if (!result.ok || !result.data) {
                    setProviderStatus(
                        errorText(result, "The connection test failed."),
                        "error"
                    );
                    return;
                }

                if (result.data.ok) {
                    setProviderStatus(
                        "Connected. Model: " + (result.data.model || "unknown") + ".",
                        "ok"
                    );
                } else {
                    setProviderStatus(
                        result.data.message || "The provider rejected that key.",
                        "error"
                    );
                }
            })
            .catch(function () {
                button.disabled = false;
                setProviderStatus("Could not reach the server. Check your network.", "error");
            });
    }

    /* ==========================
       Setup screen
    ========================== */

    function defaultDraft() {
        return {
            resumeText: "",
            jdText: "",
            targetRole: "",
            experience: "3-5 years",
            mode: "written",
            coaching: true,
            lengthUnit: "questions",
            lengthValue: 30,
            focusAreas: ""
        };
    }

    function renderSetup() {
        clear(root);
        state = null;
        stopEverything();

        if (!signedIn()) {
            root.appendChild(buildSignInPanel());
            return;
        }

        var draft = setupDraft || defaultDraft();
        setupDraft = draft;

        var panel = el("div", "interview-setup");

        panel.appendChild(el("span", "eyebrow", "AI PRACTICE"));
        panel.appendChild(el("h2", null, "Set up your mock interview"));
        panel.appendChild(
            el(
                "p",
                "interview-lead",
                "Add your resume and the job description so the questions are about " +
                    "your background and this role — not a generic list."
            )
        );

        var form = el("form", "interview-form");

        /* --- resume --- */
        var resumeField = el("label", "interview-field");
        resumeField.appendChild(el("span", "interview-label", "Your resume"));
        var resumeArea = el("textarea", "interview-textarea");
        resumeArea.rows = 7;
        resumeArea.placeholder =
            "Paste your resume here, or use the button below to load a .txt / .md file.";
        resumeArea.value = draft.resumeText;
        resumeArea.addEventListener("input", function () {
            draft.resumeText = resumeArea.value;
        });
        resumeField.appendChild(resumeArea);

        var resumeActions = el("div", "interview-file-row");
        resumeActions.appendChild(
            buildFileButton("📄 Upload resume file", function (text) {
                draft.resumeText = text;
                resumeArea.value = text;
            })
        );
        resumeActions.appendChild(
            el(
                "span",
                "interview-hint",
                "PDF or Word? Open it and paste the text — browsers cannot read those directly."
            )
        );
        resumeField.appendChild(resumeActions);
        form.appendChild(resumeField);

        /* --- job description --- */
        var jdField = el("label", "interview-field");
        jdField.appendChild(el("span", "interview-label", "Job description"));
        var jdArea = el("textarea", "interview-textarea");
        jdArea.rows = 7;
        jdArea.placeholder =
            "Paste the job description, or at least the responsibilities and requirements.";
        jdArea.value = draft.jdText;
        jdArea.addEventListener("input", function () {
            draft.jdText = jdArea.value;
        });
        jdField.appendChild(jdArea);

        var jdActions = el("div", "interview-file-row");
        jdActions.appendChild(
            buildFileButton("📋 Upload job description", function (text) {
                draft.jdText = text;
                jdArea.value = text;
            })
        );
        jdField.appendChild(jdActions);
        form.appendChild(jdField);

        /* --- role + experience --- */
        var pair = el("div", "interview-grid-2");

        var roleField = el("label", "interview-field");
        roleField.appendChild(el("span", "interview-label", "Target role"));
        var roleInput = el("input", "interview-input");
        roleInput.type = "text";
        roleInput.placeholder = "e.g. Senior QA Automation Engineer";
        roleInput.value = draft.targetRole;
        roleInput.addEventListener("input", function () {
            draft.targetRole = roleInput.value;
        });
        roleField.appendChild(roleInput);
        pair.appendChild(roleField);

        var expField = el("label", "interview-field");
        expField.appendChild(el("span", "interview-label", "Experience"));
        var expSelect = el("select", "interview-input");
        ["Fresher", "0-1 years", "1-2 years", "3-5 years", "5-8 years", "8+ years"].forEach(
            function (option) {
                var node = el("option", null, option);
                node.value = option;
                expSelect.appendChild(node);
            }
        );
        expSelect.value = draft.experience;
        expSelect.addEventListener("change", function () {
            draft.experience = expSelect.value;
        });
        expField.appendChild(expSelect);
        pair.appendChild(expField);

        form.appendChild(pair);

        /* --- focus areas --- */
        var focusField = el("label", "interview-field");
        focusField.appendChild(el("span", "interview-label", "Focus areas (optional)"));
        var focusInput = el("input", "interview-input");
        focusInput.type = "text";
        focusInput.placeholder = "e.g. Playwright, API testing, debugging, leadership";
        focusInput.value = draft.focusAreas;
        focusInput.addEventListener("input", function () {
            draft.focusAreas = focusInput.value;
        });
        focusField.appendChild(focusInput);
        form.appendChild(focusField);

        /* --- mode --- */
        form.appendChild(
            choiceRow("Interview mode", [
                {
                    value: "written",
                    label: "⌨️ Written",
                    hint: "Type your answers",
                    get: function () {
                        return draft.mode;
                    },
                    set: function () {
                        draft.mode = "written";
                    }
                },
                {
                    value: "voice",
                    label: "🎙️ Voice",
                    hint: "Speak, and the interviewer replies out loud",
                    get: function () {
                        return draft.mode;
                    },
                    set: function () {
                        draft.mode = "voice";
                    }
                }
            ], renderSetup)
        );

        /* --- style --- */
        form.appendChild(
            choiceRow("Feedback style", [
                {
                    value: "coaching",
                    label: "🧭 Coaching",
                    hint: "Feedback after every answer",
                    get: function () {
                        return draft.coaching ? "coaching" : "interview";
                    },
                    set: function () {
                        draft.coaching = true;
                    }
                },
                {
                    value: "interview",
                    label: "🎯 Interview",
                    hint: "Feedback only in the final report",
                    get: function () {
                        return draft.coaching ? "coaching" : "interview";
                    },
                    set: function () {
                        draft.coaching = false;
                    }
                }
            ], renderSetup)
        );

        /* --- length --- */
        form.appendChild(buildLengthField(draft, renderSetup));

        /* --- own AI key (optional) --- */
        form.appendChild(buildProviderPanel());

        /* --- consent --- */
        var consentLabel = el("label", "interview-consent");
        var consent = el("input");
        consent.type = "checkbox";
        consent.checked = Boolean(draft.consent);
        consent.addEventListener("change", function () {
            draft.consent = consent.checked;
        });
        consentLabel.appendChild(consent);
        consentLabel.appendChild(
            el(
                "span",
                null,
                "I'm happy for this session's resume, job description and transcript to be " +
                    "stored on this site so I can re-read my report. I can delete it any time."
            )
        );
        form.appendChild(consentLabel);

        var error = el("p", "form-error");
        error.hidden = true;
        form.appendChild(error);

        var submit = el("button", "btn btn-primary btn-block btn-large", "Start interview");
        submit.type = "submit";
        form.appendChild(submit);

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!draft.consent) {
                showFormError(error, "Please tick the consent box to continue.");
                return;
            }

            if (!draft.resumeText.trim() && !draft.jdText.trim() && !draft.targetRole.trim()) {
                showFormError(
                    error,
                    "Add a resume, a job description, or at least a target role."
                );
                return;
            }

            showFormError(error, "");
            startInterview(draft, submit, error);
        });

        panel.appendChild(form);

        var recent = el("div", "interview-recent");
        recent.id = "interview-recent";
        panel.appendChild(recent);

        root.appendChild(panel);

        loadRecent(recent);
    }

    function showFormError(node, message) {
        if (message) {
            node.textContent = message;
            node.hidden = false;
        } else {
            node.textContent = "";
            node.hidden = true;
        }
    }

    /** A row of mutually exclusive buttons backed by plain state. */
    function choiceRow(title, options, rerender) {
        var wrap = el("div", "interview-field");
        wrap.appendChild(el("span", "interview-label", title));

        var row = el("div", "interview-choice-row");
        var current = options[0].get();

        options.forEach(function (option) {
            var button = el("button", "interview-choice");
            button.type = "button";

            if (option.get() === option.value) {
                button.classList.add("is-active");
                current = option.value;
            }

            button.appendChild(el("span", "interview-choice-title", option.label));
            button.appendChild(el("span", "interview-choice-hint", option.hint));

            button.addEventListener("click", function () {
                option.set();
                rerender();
            });

            row.appendChild(button);
        });

        wrap.appendChild(row);

        return wrap;
    }

    function buildLengthField(draft, rerender) {
        var wrap = el("div", "interview-field");
        var head = el("div", "interview-length-head");

        head.appendChild(el("span", "interview-label", "Length"));

        var unitRow = el("div", "interview-unit-row");
        [
            { value: "questions", label: "Questions" },
            { value: "minutes", label: "Minutes" }
        ].forEach(function (unit) {
            var button = el("button", "interview-unit");
            button.type = "button";
            button.textContent = unit.label;

            if (draft.lengthUnit === unit.value) {
                button.classList.add("is-active");
            }

            button.addEventListener("click", function () {
                draft.lengthUnit = unit.value;
                rerender();
            });

            unitRow.appendChild(button);
        });

        head.appendChild(unitRow);
        wrap.appendChild(head);

        var slider = el("input", "interview-slider");
        slider.type = "range";
        slider.min = String(MIN_LENGTH);
        slider.max = String(MAX_LENGTH);
        slider.step = "1";
        slider.value = String(draft.lengthValue);

        var output = el("div", "interview-length-output");

        function describe() {
            if (draft.lengthUnit === "minutes") {
                var questions = Math.max(
                    1,
                    Math.round(draft.lengthValue / MINUTES_PER_QUESTION)
                );

                output.textContent =
                    draft.lengthValue + " minutes · about " + questions + " questions";
            } else {
                output.textContent =
                    draft.lengthValue +
                    " questions · about " +
                    draft.lengthValue * MINUTES_PER_QUESTION +
                    " minutes";
            }
        }

        slider.addEventListener("input", function () {
            draft.lengthValue = Number(slider.value);
            describe();
        });

        slider.addEventListener("change", function () {
            draft.lengthValue = Number(slider.value);
            rerender();
        });

        describe();

        wrap.appendChild(slider);
        wrap.appendChild(output);

        return wrap;
    }

    /** Hidden file input behind a normal button; text files only. */
    function buildFileButton(label, onText) {
        var input = el("input");
        input.type = "file";
        input.accept = ".txt,.md,.markdown,.json,.csv,text/plain";
        input.hidden = true;

        var button = el("button", "btn btn-ghost btn-small", label);
        button.type = "button";
        button.addEventListener("click", function () {
            input.click();
        });

        input.addEventListener("change", function () {
            var file = input.files && input.files[0];

            if (!file) {
                return;
            }

            var reader = new FileReader();

            reader.onload = function () {
                onText(String(reader.result || "").slice(0, 20000));
            };

            reader.onerror = function () {
                onText("");
            };

            reader.readAsText(file);
            input.value = "";
        });

        var holder = el("span", "interview-file-button");
        holder.appendChild(button);
        holder.appendChild(input);

        return holder;
    }

    function buildSignInPanel() {
        var panel = el("div", "interview-signin");

        panel.appendChild(el("div", "interview-signin-icon", "🔒"));
        panel.appendChild(el("h2", null, "Sign in to use Mock Interview"));
        panel.appendChild(
            el(
                "p",
                null,
                "Interviews are saved to your account so you can re-read your report. " +
                    "Everything else on the site stays open to guests."
            )
        );

        var actions = el("div", "interview-signin-actions");
        var login = el("a", "btn btn-primary", "Log in");
        login.href = "#login";
        var register = el("a", "btn btn-ghost", "Create an account");
        register.href = "#register";

        actions.appendChild(login);
        actions.appendChild(register);
        panel.appendChild(actions);

        return panel;
    }

    function loadRecent(container) {
        api.listInterviews().then(function (result) {
            if (!result.ok || !result.data || !result.data.sessions) {
                return;
            }

            var sessions = result.data.sessions;

            if (sessions.length === 0) {
                return;
            }

            clear(container);
            container.appendChild(el("h3", null, "Recent interviews"));

            var list = el("div", "interview-recent-list");

            sessions.slice(0, 6).forEach(function (item) {
                var card = el("div", "interview-recent-item");

                var main = el("div", "interview-recent-main");
                main.appendChild(
                    el("strong", null, item.targetRole || "Mock interview")
                );
                main.appendChild(
                    el(
                        "span",
                        "interview-recent-meta",
                        (item.mode === "voice" ? "🎙️ Voice" : "⌨️ Written") +
                            " · " +
                            item.turnCount +
                            "/" +
                            item.questionTarget +
                            " answered" +
                            (item.status === "completed" ? " · completed" : " · in progress")
                    )
                );
                card.appendChild(main);

                var actions = el("div", "interview-recent-actions");

                var open = el("button", "btn btn-ghost btn-small", "Open");
                open.type = "button";
                open.addEventListener("click", function () {
                    resumeSession(item.id);
                });
                actions.appendChild(open);

                var remove = el("button", "btn btn-ghost btn-small is-danger", "Delete");
                remove.type = "button";
                remove.addEventListener("click", function () {
                    deleteSession(item.id, function () {
                        loadRecent(container);
                    });
                });
                actions.appendChild(remove);

                card.appendChild(actions);
                list.appendChild(card);
            });

            container.appendChild(list);
        });
    }

    function deleteSession(id, done) {
        api.deleteInterview(id).then(function (result) {
            if (!result.ok) {
                window.alert(errorText(result, "That interview could not be deleted."));
                return;
            }

            if (state && state.session && state.session.id === id) {
                state = null;
            }

            if (done) {
                done();
            }
        });
    }

    /* ==========================
       Starting and resuming
    ========================== */

    function startInterview(draft, submitButton, errorNode) {
        if (busy) {
            return;
        }

        busy = true;
        submitButton.disabled = true;
        submitButton.classList.add("is-busy");
        submitButton.textContent = "Preparing your interviewer...";

        api
            .startInterview({
                mode: draft.mode,
                coaching: draft.coaching,
                targetRole: draft.targetRole.trim(),
                experience: draft.experience,
                lengthUnit: draft.lengthUnit,
                lengthValue: draft.lengthValue,
                focusAreas: draft.focusAreas.trim(),
                resumeText: draft.resumeText.trim(),
                jdText: draft.jdText.trim(),
                consent: true,
                provider: activeProvider()
            })
            .then(function (result) {
                busy = false;

                if (!result.ok || !result.data || !result.data.session) {
                    showFormError(errorNode, errorText(result, "The interview could not start."));
                    submitButton.disabled = false;
                    submitButton.classList.remove("is-busy");
                    submitButton.textContent = "Start interview";
                    return;
                }

                openSession(result.data.session, result.data.turn);

                if (result.data.turn && result.data.turn.question) {
                    pushTurn("question", result.data.turn.question);
                }

                if (result.data.turn && result.data.turn.message) {
                    pushTurn("note", result.data.turn.message);
                }

                renderRoom();
                announce(result.data.turn);
            });
    }

    /** Re-opens an interview that was left part-finished. */
    function resumeSession(id) {
        clear(root);
        root.appendChild(el("p", "interview-loading", "Loading your interview..."));

        api.getInterview(id).then(function (result) {
            if (!result.ok || !result.data) {
                root.appendChild(
                    el("p", "form-error", errorText(result, "That interview could not be loaded."))
                );
                return;
            }

            var data = result.data;

            openSession(data.session, null);
            state.turns = (data.turns || []).map(function (turn) {
                return { kind: turn.kind, content: turn.content };
            });
            state.report = data.report || null;

            var lastQuestion = "";
            var lastNote = "";

            state.turns.forEach(function (turn) {
                if (turn.kind === "question") {
                    lastQuestion = turn.content;
                }

                if (turn.kind === "note") {
                    lastNote = turn.content;
                }
            });

            state.question = lastQuestion;
            state.turnCount = data.session.turnCount;
            state.questionTarget = data.session.questionTarget;

            if (state.report) {
                state.status = "done";
                renderReport();
                return;
            }

            state.status = "idle";
            renderRoom();

            if (lastQuestion) {
                speak(lastQuestion);
            } else if (lastNote) {
                speak(lastNote);
            }
        });
    }

    function openSession(session, turn) {
        state = {
            session: session,
            turns: [],
            question: "",
            turnCount: 0,
            questionTarget: session.questionTarget,
            report: null,
            status: "idle",
            paused: false,
            elapsed: 0,
            speaking: false
        };

        if (turn) {
            state.question = turn.question || "";
            state.turnCount = turn.turnCount || 0;
            state.questionTarget = turn.questionTarget || session.questionTarget;
        }

        startTimer();
    }

    /* ==========================
       Room
    ========================== */

    function renderRoom() {
        clear(root);
        stopSpeech();

        var room = el("div", "interview-room");

        /* --- header --- */
        var head = el("div", "interview-room-head");

        var headMain = el("div", "interview-room-main");
        headMain.appendChild(
            el("span", "interview-room-eyebrow", state.session.targetRole || "Mock interview")
        );
        headMain.appendChild(el("h2", null, "Interview in progress"));

        var badges = el("div", "interview-badges");
        badges.appendChild(
            el(
                "span",
                "interview-badge",
                state.session.mode === "voice" ? "🎙️ Voice" : "⌨️ Written"
            )
        );
        badges.appendChild(
            el(
                "span",
                "interview-badge",
                state.session.coaching ? "🧭 Coaching" : "🎯 Interview"
            )
        );
        badges.appendChild(el("span", "interview-badge", state.session.experience || ""));

        if (activeProvider()) {
            badges.appendChild(el("span", "interview-badge is-key", "🔑 Your key"));
        }

        headMain.appendChild(badges);
        head.appendChild(headMain);

        var meter = el("div", "interview-meter");
        meter.appendChild(el("span", "interview-timer", formatClock(elapsed)));
        meter.appendChild(el("span", "interview-counter", counterText()));
        head.appendChild(meter);

        room.appendChild(head);

        /* --- status + progress --- */
        var statusRow = el("div", "interview-status-row");
        var status = el("span", "interview-status");
        status.id = "interview-status";
        statusRow.appendChild(status);
        room.appendChild(statusRow);

        var progress = el("div", "interview-progress");
        var bar = el("span");
        bar.id = "interview-progress-bar";
        progress.appendChild(bar);
        room.appendChild(progress);

        /* --- transcript --- */
        var transcript = el("div", "interview-transcript");
        transcript.id = "interview-transcript";
        room.appendChild(transcript);

        renderTranscript();

        /* --- feedback slot --- */
        var feedback = el("div", "interview-feedback");
        feedback.id = "interview-feedback";
        feedback.hidden = true;
        room.appendChild(feedback);

        /* --- answer area --- */
        var answerWrap = el("div", "interview-answer");

        var answerArea = el("textarea", "interview-answer-input");
        answerArea.id = "interview-answer-input";
        answerArea.rows = 4;
        answerArea.placeholder =
            state.session.mode === "voice"
                ? "Press the microphone and speak, or type your answer here."
                : "Type your answer here. Ctrl+Enter sends.";
        answerArea.addEventListener("keydown", function (event) {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                submitAnswer();
            }
        });
        answerWrap.appendChild(answerArea);

        var controls = el("div", "interview-controls");

        if (state.session.mode === "voice") {
            controls.appendChild(buildMicButton());
        }

        var send = el("button", "btn btn-primary", "Send answer");
        send.type = "button";
        send.id = "interview-send";
        send.addEventListener("click", submitAnswer);
        controls.appendChild(send);

        answerWrap.appendChild(controls);

        var utilities = el("div", "interview-utilities");
        utilities.appendChild(utilityButton("💡 Hint", function () {
            sendCommand("hint", "");
        }));
        utilities.appendChild(utilityButton("❓ Clarify", function () {
            var question = window.prompt("What would you like the interviewer to clarify?");

            if (question && question.trim()) {
                sendCommand("clarify", question.trim());
            }
        }));
        utilities.appendChild(utilityButton("⏭ Skip", function () {
            sendCommand("skip", "");
        }));
        utilities.appendChild(utilityButton("⏸ Pause", togglePause));
        utilities.appendChild(utilityButton("🏁 Finish & get report", finishInterview));

        answerWrap.appendChild(utilities);
        room.appendChild(answerWrap);

        /* --- notices --- */
        var notice = el("p", "interview-notice");
        notice.id = "interview-notice";
        notice.hidden = true;
        room.appendChild(notice);

        root.appendChild(room);

        updateMeter();
        setStatus(state.session.mode === "voice" ? "Ready when you are" : "Waiting for your answer");
    }

    function counterText() {
        return "Question " + Math.min(state.turnCount + 1, state.questionTarget) +
            " of " + state.questionTarget;
    }

    function utilityButton(label, handler) {
        var button = el("button", "btn btn-ghost btn-small", label);
        button.type = "button";
        button.addEventListener("click", handler);

        return button;
    }

    function renderTranscript() {
        var container = document.getElementById("interview-transcript");

        if (!container) {
            return;
        }

        clear(container);

        if (state.turns.length === 0) {
            container.appendChild(
                el("p", "interview-transcript-empty", "Your transcript will appear here.")
            );
            return;
        }

        state.turns.forEach(function (turn) {
            container.appendChild(turnNode(turn));
        });

        container.scrollTop = container.scrollHeight;
    }

    function turnNode(turn) {
        var node = el("div", "turn turn-" + turn.kind);
        var label = {
            question: "Interviewer",
            answer: "You",
            note: "Interviewer",
            hint: "Hint",
            feedback: "Coach",
            skip: "You",
            system: "Room"
        }[turn.kind] || "Room";

        node.appendChild(el("span", "turn-label", label));
        node.appendChild(el("p", "turn-text", turn.content));

        return node;
    }

    function pushTurn(kind, content) {
        if (!content) {
            return;
        }

        state.turns.push({ kind: kind, content: content });
        renderTranscript();
    }

    function setStatus(text) {
        var node = document.getElementById("interview-status");

        if (node) {
            node.textContent = text;
        }
    }

    function setBusy(on, label) {
        busy = on;
        root.classList.toggle("is-busy", on);

        var send = document.getElementById("interview-send");

        if (send) {
            send.disabled = on;
        }

        var mic = document.getElementById("interview-mic");

        if (mic) {
            mic.disabled = on;
        }

        if (on) {
            setStatus(label || "The interviewer is thinking...");
        }
    }

    function updateMeter() {
        var timer = root.querySelector(".interview-timer");
        var counter = root.querySelector(".interview-counter");
        var bar = document.getElementById("interview-progress-bar");

        if (timer) {
            timer.textContent = formatClock(elapsed);
        }

        if (counter) {
            counter.textContent = state ? counterText() : "";
        }

        if (bar && state && state.questionTarget > 0) {
            var percent = Math.min(
                100,
                Math.round((state.turnCount / state.questionTarget) * 100)
            );

            bar.style.width = percent + "%";
        }
    }

    function showNotice(message, tone) {
        var node = document.getElementById("interview-notice");

        if (!node) {
            return;
        }

        if (!message) {
            node.hidden = true;
            node.textContent = "";
            return;
        }

        node.textContent = message;
        node.className = "interview-notice" + (tone ? " is-" + tone : "");
        node.hidden = false;
    }

    /* ==========================
       Timer
    ========================== */

    function startTimer() {
        stopTimer();
        elapsed = 0;

        timerHandle = window.setInterval(function () {
            if (!state || state.paused || state.status === "done") {
                return;
            }

            elapsed += 1;
            updateMeter();
        }, 1000);
    }

    function stopTimer() {
        if (timerHandle) {
            window.clearInterval(timerHandle);
            timerHandle = null;
        }
    }

    function togglePause() {
        if (!state) {
            return;
        }

        state.paused = !state.paused;

        if (state.paused) {
            stopSpeech();
            setStatus("Paused — take your time");
        } else {
            setStatus("Waiting for your answer");
        }

        updateMeter();
    }

    /* ==========================
       Answering
    ========================== */

    function submitAnswer() {
        var area = document.getElementById("interview-answer-input");

        if (!area) {
            return;
        }

        var text = area.value.trim();

        if (!text) {
            showNotice("Type or dictate an answer before sending.", "warn");
            return;
        }

        area.value = "";
        showNotice("");
        sendCommand("answer", text);
    }

    function sendCommand(action, text) {
        if (!state || busy) {
            return;
        }

        if (state.session.status === "completed") {
            return;
        }

        if (action === "answer") {
            pushTurn("answer", text);
        }

        if (action === "skip") {
            pushTurn("skip", "Skipped this question.");
        }

        setBusy(true);

        api
            .answerInterview(state.session.id, {
                action: action,
                text: text,
                provider: activeProvider()
            })
            .then(function (result) {
                setBusy(false);

                if (!result.ok || !result.data) {
                    showNotice(errorText(result, "The interviewer did not respond."), "error");
                    setStatus("Something went wrong — try again");
                    return;
                }

                applyTurn(result.data, action);
            })
            .catch(function () {
                setBusy(false);
                showNotice("Connection problem. Check your network and try again.", "error");
                setStatus("Offline");
            });
    }

    function applyTurn(turn, action) {
        if (turn.feedback) {
            pushTurn("feedback", feedbackToText(turn.feedback));
            renderFeedback(turn.feedback);
        } else {
            renderFeedback(null);
        }

        if (turn.message) {
            pushTurn("note", turn.message);
        }

        if (action === "hint" && turn.message) {
            /* the hint is the message; nothing else to do */
        }

        if (turn.question) {
            state.question = turn.question;
            pushTurn("question", turn.question);
        }

        state.turnCount = turn.turnCount;
        state.questionTarget = turn.questionTarget;
        state.status = "idle";

        updateMeter();

        if (turn.done) {
            setStatus("That is the last question");
            finishInterview();
            return;
        }

        setStatus("Waiting for your answer");
        announce(turn);
    }

    function feedbackToText(feedback) {
        var parts = [];

        if (feedback.strength) {
            parts.push("What worked: " + feedback.strength);
        }

        if (feedback.gap) {
            parts.push("What was missing: " + feedback.gap);
        }

        if (feedback.improve) {
            parts.push("How to improve: " + feedback.improve);
        }

        return parts.join("\n\n");
    }

    function renderFeedback(feedback) {
        var container = document.getElementById("interview-feedback");

        if (!container) {
            return;
        }

        clear(container);

        if (!feedback) {
            container.hidden = true;
            return;
        }

        container.hidden = false;
        container.className =
            "interview-feedback" + (feedback.verdict ? " is-" + feedback.verdict : "");

        container.appendChild(el("span", "interview-feedback-title", "Coach feedback"));

        [
            ["What worked", feedback.strength],
            ["What was missing", feedback.gap],
            ["How to improve", feedback.improve]
        ].forEach(function (entry) {
            if (!entry[1]) {
                return;
            }

            var block = el("div", "interview-feedback-block");
            block.appendChild(el("strong", null, entry[0]));
            block.appendChild(el("p", null, entry[1]));
            container.appendChild(block);
        });
    }

    /** Speaks the interviewer's line in voice mode. */
    function announce(turn) {
        if (!state || state.session.mode !== "voice" || state.paused) {
            return;
        }

        var spoken = [turn.message, turn.question].filter(Boolean).join(" ");

        speak(spoken);
    }

    /** Speaks the interviewer's line, preferring the studio voice when a key exists. */
    function speak(text) {
        if (!text) {
            return;
        }

        if (activeProvider()) {
            speakWithProvider(text);
            return;
        }

        speakWithBrowser(text);
    }

    /** The candidate's own text-to-speech voice, falling back to the browser voice. */
    function speakWithProvider(text) {
        var provider = activeProvider();

        if (!provider) {
            speakWithBrowser(text);
            return;
        }

        if (state) {
            state.speaking = true;
        }

        setStatus("Interviewer is speaking...");

        api
            .interviewSpeech({ text: text.slice(0, 1200), provider: provider })
            .then(function (result) {
                if (!result.ok || !result.data || !result.data.audio) {
                    speakWithBrowser(text);
                    return;
                }

                playSpeechAudio(result.data.audio, result.data.mime);
            })
            .catch(function () {
                speakWithBrowser(text);
            });
    }

    function playSpeechAudio(base64, mime) {
        stopSpeech();

        var audio;

        try {
            audio = new Audio("data:" + (mime || "audio/mpeg") + ";base64," + base64);
        } catch (error) {
            return;
        }

        speechAudio = audio;

        if (state) {
            state.speaking = true;
        }

        audio.onended = function () {
            speechAudio = null;

            if (state) {
                state.speaking = false;
            }

            setStatus("Your turn — press the microphone");
        };

        var played = audio.play();

        // Autoplay can be blocked; the browser voice is the safe fallback.
        if (played && typeof played.catch === "function") {
            played.catch(function () {
                speechAudio = null;

                if (state) {
                    state.speaking = false;
                }
            });
        }
    }

    /** The free, always-available browser voice. */
    function speakWithBrowser(text) {
        if (!text || !window.speechSynthesis) {
            return;
        }

        try {
            window.speechSynthesis.cancel();

            var utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.onstart = function () {
                if (state) {
                    state.speaking = true;
                }
                setStatus("Interviewer is speaking...");
            };
            utterance.onend = function () {
                if (state) {
                    state.speaking = false;
                }
                setStatus("Your turn — press the microphone");
            };

            window.speechSynthesis.speak(utterance);
        } catch (error) {
            /* speech is a bonus; the transcript is the source of truth */
        }
    }

    function stopSpeech() {
        if (speechAudio) {
            try {
                speechAudio.pause();
            } catch (error) {
                /* already stopped */
            }

            speechAudio = null;
        }

        if (window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
            } catch (error) {
                /* nothing to cancel */
            }
        }

        if (state) {
            state.speaking = false;
        }
    }

    /* ==========================
       Microphone
    ========================== */

    function buildMicButton() {
        var button = el("button", "interview-mic");
        button.type = "button";
        button.id = "interview-mic";
        button.appendChild(el("span", "interview-mic-icon", "🎤"));
        button.appendChild(el("span", "interview-mic-label", "Record answer"));
        button.addEventListener("click", toggleRecording);

        return button;
    }

    function toggleRecording() {
        if (recorder && recorder.state === "recording") {
            stopRecording();
            return;
        }

        startRecording();
    }

    function startRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showNotice(
                "This browser cannot record audio here. A secure (https) page and a modern " +
                    "browser are required. Please type your answer instead.",
                "warn"
            );
            return;
        }

        stopSpeech();
        showNotice("Requesting microphone access...");

        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(function (stream) {
                micStream = stream;
                recordFrom(stream);
            })
            .catch(function (error) {
                var name = error && error.name;

                if (name === "NotAllowedError" || name === "SecurityError") {
                    showNotice(
                        "Microphone access was blocked. Allow it in your browser's site " +
                            "settings, or type your answer instead.",
                        "error"
                    );
                } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
                    showNotice(
                        "No microphone was found. Please type your answer instead.",
                        "warn"
                    );
                } else {
                    showNotice(
                        "The microphone could not be started. Please type your answer instead.",
                        "error"
                    );
                }
            });
    }

    function recordFrom(stream) {
        var options = {};
        var preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

        for (var i = 0; i < preferred.length; i++) {
            if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(preferred[i])) {
                options.mimeType = preferred[i];
                break;
            }
        }

        try {
            recorder = new MediaRecorder(stream, options);
        } catch (error) {
            showNotice("Recording is not supported in this browser. Please type instead.", "error");
            releaseMic();
            return;
        }

        recordedChunks = [];

        recorder.addEventListener("dataavailable", function (event) {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        });

        recorder.addEventListener("stop", onRecordingStopped);
        recorder.start();

        markRecording(true);
        showNotice("Listening... press the microphone again when you are done.", "live");

        recordingStopTimer = window.setTimeout(stopRecording, MAX_RECORDING_MS);
    }

    function stopRecording() {
        if (recordingStopTimer) {
            window.clearTimeout(recordingStopTimer);
            recordingStopTimer = null;
        }

        if (recorder && recorder.state === "recording") {
            recorder.stop();
        }

        markRecording(false);
    }

    function onRecordingStopped() {
        var type = (recorder && recorder.mimeType) || "audio/webm";
        var blob = new Blob(recordedChunks, { type: type });

        releaseMic();
        recordedChunks = [];

        if (!blob.size) {
            showNotice("Nothing was recorded. Please try again.", "warn");
            return;
        }

        showNotice("Transcribing your answer...");
        setStatus("Transcribing...");

        readAsBase64(blob)
            .then(function (base64) {
                return api.transcribeAudio({
                    audio: base64,
                    mime: type,
                    provider: activeProvider()
                });
            })
            .then(function (result) {
                if (!result.ok || !result.data) {
                    showNotice(
                        errorText(result, "Speech recognition failed. Please type your answer."),
                        "error"
                    );
                    setStatus("Your turn — type your answer");
                    return;
                }

                var text = String(result.data.text || "").trim();

                if (!text) {
                    showNotice("I could not make that out. Please try again or type it.", "warn");
                    setStatus("Your turn — type your answer");
                    return;
                }

                showNotice("");
                autoSubmit = true;

                var area = document.getElementById("interview-answer-input");

                if (area) {
                    area.value = text;
                }

                pushTurn("answer", text);
                sendCommand("answer", text);
                autoSubmit = false;
            })
            .catch(function () {
                showNotice("The recording could not be sent. Please type your answer.", "error");
                setStatus("Your turn — type your answer");
            });
    }

    function markRecording(on) {
        var button = document.getElementById("interview-mic");

        if (!button) {
            return;
        }

        button.classList.toggle("is-recording", on);
        var label = button.querySelector(".interview-mic-label");

        if (label) {
            label.textContent = on ? "Stop recording" : "Record answer";
        }
    }

    function releaseMic() {
        if (micStream) {
            micStream.getTracks().forEach(function (track) {
                track.stop();
            });
            micStream = null;
        }
    }

    /** Blob → base64 without the data: prefix. */
    function readAsBase64(blob) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();

            reader.onload = function () {
                var result = String(reader.result || "");
                var comma = result.indexOf(",");

                resolve(comma === -1 ? result : result.slice(comma + 1));
            };

            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /* ==========================
       Finishing
    ========================== */

    function finishInterview() {
        if (!state || busy) {
            return;
        }

        if (!state.turns.some(function (turn) {
            return turn.kind === "answer";
        })) {
            showNotice("Answer at least one question before finishing.", "warn");
            return;
        }

        if (!window.confirm("Finish the interview and generate your report?")) {
            return;
        }

        setBusy(true, "Writing your assessment...");
        stopRecording();
        stopSpeech();

        api
            .finishInterview(state.session.id, { provider: activeProvider() })
            .then(function (result) {
                setBusy(false);

                if (!result.ok || !result.data) {
                    showNotice(errorText(result, "The report could not be generated."), "error");
                    setStatus("Something went wrong — try again");
                    return;
                }

                state.report = result.data.report;
                state.status = "done";
                renderReport();
            })
            .catch(function () {
                setBusy(false);
                showNotice("Connection problem. Please try again.", "error");
            });
    }

    /* ==========================
       Report
    ========================== */

    function renderReport() {
        clear(root);
        stopTimer();
        stopSpeech();
        stopRecording();

        var report = state.report || {};
        var panel = el("div", "interview-report");

        panel.appendChild(el("span", "eyebrow", "FINAL ASSESSMENT"));
        panel.appendChild(el("h2", null, "Your interview report"));
        panel.appendChild(
            el(
                "p",
                "interview-lead",
                (state.session.targetRole || "Mock interview") +
                    " · " +
                    (state.session.mode === "voice" ? "Voice" : "Written") +
                    " · " +
                    state.turnCount +
                    " answers · " +
                    formatClock(elapsed)
            )
        );

        if (report.verdict) {
            panel.appendChild(
                el("div", "report-verdict", "Overall: " + report.verdict)
            );
        }

        /* --- scores --- */
        var scores = report.scores || {};
        var scoreNames = Object.keys(scores).filter(function (key) {
            return typeof scores[key] === "number";
        });

        if (scoreNames.length > 0) {
            var scoreBox = el("div", "report-scores");

            scoreNames.forEach(function (key) {
                var value = scores[key];
                var item = el("div", "report-score");

                item.appendChild(
                    el("span", "report-score-name", labelForScore(key))
                );

                var bar = el("div", "report-score-bar");
                var fill = el("span");
                fill.style.width = value * 10 + "%";
                bar.appendChild(fill);
                item.appendChild(bar);

                item.appendChild(el("span", "report-score-value", value + "/10"));
                scoreBox.appendChild(item);
            });

            panel.appendChild(scoreBox);
        }

        if (report.summary) {
            panel.appendChild(section("Overall read", [el("p", null, report.summary)]));
        }

        if (report.top_priorities && report.top_priorities.length) {
            var priorities = el("ol", "report-priorities");

            report.top_priorities.forEach(function (item) {
                priorities.appendChild(el("li", null, item));
            });

            panel.appendChild(section("Fix these first", [priorities]));
        }

        if (report.strengths && report.strengths.length) {
            panel.appendChild(evidenceSection("What you did well", report.strengths, "good"));
        }

        if (report.gaps && report.gaps.length) {
            panel.appendChild(evidenceSection("What to work on", report.gaps, "gap"));
        }

        if (report.improvement_plan && report.improvement_plan.length) {
            var plan = el("div", "report-plan");

            report.improvement_plan.forEach(function (entry) {
                var card = el("div", "report-plan-item");
                card.appendChild(el("strong", null, entry.focus));

                if (entry.actions && entry.actions.length) {
                    var list = el("ul", "report-plan-actions");

                    entry.actions.forEach(function (action) {
                        list.appendChild(el("li", null, action));
                    });

                    card.appendChild(list);
                }

                if (entry.practice) {
                    card.appendChild(el("p", "report-plan-practice", "Practise: " + entry.practice));
                }

                plan.appendChild(card);
            });

            panel.appendChild(section("Improvement plan", [plan]));
        }

        if (report.closing_note) {
            panel.appendChild(el("p", "report-closing", report.closing_note));
        }

        /* --- actions --- */
        var actions = el("div", "report-actions");

        var again = el("button", "btn btn-primary", "Start another interview");
        again.type = "button";
        again.addEventListener("click", function () {
            state = null;
            setupDraft = null;
            renderSetup();
        });
        actions.appendChild(again);

        var remove = el("button", "btn btn-ghost is-danger", "Delete this interview");
        remove.type = "button";
        remove.addEventListener("click", function () {
            if (!window.confirm("Delete this interview and its transcript? This cannot be undone.")) {
                return;
            }

            deleteSession(state.session.id, function () {
                state = null;
                setupDraft = null;
                renderSetup();
            });
        });
        actions.appendChild(remove);

        panel.appendChild(actions);

        root.appendChild(panel);
    }

    function labelForScore(key) {
        return key
            .split("_")
            .map(function (word) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(" ");
    }

    function section(title, nodes) {
        var wrap = el("div", "report-section");
        wrap.appendChild(el("h3", null, title));

        nodes.forEach(function (node) {
            wrap.appendChild(node);
        });

        return wrap;
    }

    function evidenceSection(title, items, tone) {
        var list = el("div", "report-evidence");

        items.forEach(function (item) {
            var card = el("div", "report-evidence-item is-" + tone);
            card.appendChild(el("p", "report-evidence-point", item.point || ""));

            if (item.evidence) {
                card.appendChild(el("p", "report-evidence-quote", "\u201C" + item.evidence + "\u201D"));
            }

            list.appendChild(card);
        });

        return section(title, [list]);
    }

    /* ==========================
       Lifecycle
    ========================== */

    function stopEverything() {
        stopTimer();
        stopSpeech();
        stopRecording();
        releaseMic();
        busy = false;
    }

    function open() {
        if (!root) {
            return;
        }

        /* Coming back to a live interview keeps it on screen. */
        if (state && state.status === "done" && state.report) {
            renderReport();
            return;
        }

        if (state && state.session) {
            renderRoom();
            updateMeter();

            if (state.session.mode === "voice" && state.question) {
                speak(state.question);
            }

            return;
        }

        renderSetup();
    }

    if (backButton) {
        backButton.addEventListener("click", function () {
            if (window.QAHub && window.QAHub.goTo) {
                window.QAHub.goTo("topics");
            } else {
                window.location.hash = "topics";
            }
        });
    }

    /* Leaving the section stops the clock, the microphone and the voice. */
    window.addEventListener("hashchange", function () {
        var hash = window.location.hash.replace(/^#\/?/, "").split("?")[0];

        if (hash !== HASH) {
            stopEverything();
        }
    });

    /* Signing in while the panel is open swaps the lock screen for setup. */
    document.addEventListener("qahub:auth", function () {
        var hash = window.location.hash.replace(/^#\/?/, "").split("?")[0];

        if (hash === HASH && !state) {
            renderSetup();
        }
    });

    window.QAInterview = { open: open };
})();
