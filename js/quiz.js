/* =========================================================
   QA INTERVIEW HUB — QA QUIZ BATTLE
   A five-question quiz game built entirely from the same
   question bank the hub studies from.

   Everything shown to the player is real bank data: the
   question text, the answer choices (one correct answer plus
   distractors taken from other questions of the same topic)
   and the explanation. Nothing is written on the fly.

   Topics come from window.QAHub.topics, so a topic added to
   the hub later appears in the game with no change here.
========================================================= */

(function () {
    "use strict";

    var root = document.getElementById("quiz-root");
    var backButton = document.getElementById("game-back-button");

    if (!root) {
        return;
    }

    var QUESTION_COUNT = 5;
    var GAME_HASH = "quiz-battle";

    var LEVELS = [
        {
            id: "beginner",
            label: "Beginner",
            icon: "🌱",
            blurb: "Warm up with the fundamentals."
        },
        {
            id: "intermediate",
            label: "Intermediate",
            icon: "⚡",
            blurb: "Turn the heat up a notch."
        },
        {
            id: "expert",
            label: "Expert",
            icon: "🔥",
            blurb: "Only for the fearless."
        }
    ];

    var LEVEL_SETTINGS = {
        beginner: { seconds: 30, points: 10 },
        intermediate: { seconds: 25, points: 15 },
        expert: { seconds: 20, points: 20 }
    };

    var setup = { topicId: null, levelId: null };
    var round = null;
    var tickTimer = null;
    var refs = { topicGrid: null, levelGrid: null, start: null };

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

    function shuffle(list) {
        var copy = list.slice();

        for (var i = copy.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var swap = copy[i];
            copy[i] = copy[j];
            copy[j] = swap;
        }

        return copy;
    }

    function formatTime(totalSeconds) {
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;

        if (minutes <= 0) {
            return seconds + "s";
        }

        return minutes + "m " + (seconds < 10 ? "0" : "") + seconds + "s";
    }

    /* ==========================
       Question bank helpers
    ========================== */

    function normText(value) {
        return String(value === undefined || value === null ? "" : value)
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    // One topic in the bank labels a few questions "Advanced". It is treated
    // as Expert so those questions are never left out of a round.
    function bucketOf(question) {
        var level = String(question.level || question.difficulty || "")
            .trim()
            .toLowerCase();

        if (level === "advanced" || level === "experienced") {
            return "expert";
        }

        if (level === "beginner" || level === "intermediate" || level === "expert") {
            return level;
        }

        return "intermediate";
    }

    function questionTopics() {
        var topics = (window.QAHub && window.QAHub.topics) || [];

        return topics.filter(function (topic) {
            return topic.type === "questions";
        });
    }

    function topicById(id) {
        var topics = questionTopics();

        for (var i = 0; i < topics.length; i++) {
            if (topics[i].id === id) {
                return topics[i];
            }
        }

        return null;
    }

    function topicName(id) {
        var topic = topicById(id);
        return topic ? topic.name : "Quiz";
    }

    function topicIcon(id) {
        var topic = topicById(id);
        return topic ? topic.icon : "❔";
    }

    function levelBy(id) {
        for (var i = 0; i < LEVELS.length; i++) {
            if (LEVELS[i].id === id) {
                return LEVELS[i];
            }
        }

        return LEVELS[0];
    }

    function loadTopic(topicId) {
        if (window.QAHub && window.QAHub.loadQuestions) {
            return window.QAHub.loadQuestions(topicId);
        }

        return fetch("./data/" + topicId + ".json")
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Unable to load " + topicId);
                }

                return response.json();
            })
            .then(function (data) {
                return Array.isArray(data.questions) ? data.questions : [];
            });
    }

    /**
     * Returns five questions taken from the bank. The chosen level is filled
     * first; if that level holds fewer than five questions the round is topped
     * up from the closest levels, so a round is always five real questions and
     * never a made-up one. A topic with fewer than five questions in total
     * simply plays with everything it has.
     */
    function pickQuestions(all, level) {
        var buckets = { beginner: [], intermediate: [], expert: [] };

        all.forEach(function (question) {
            buckets[bucketOf(question)].push(question);
        });

        var order = level === "beginner"
            ? ["beginner", "intermediate", "expert"]
            : level === "expert"
                ? ["expert", "intermediate", "beginner"]
                : ["intermediate", "beginner", "expert"];

        var picked = [];

        order.forEach(function (key) {
            if (picked.length >= QUESTION_COUNT) {
                return;
            }

            shuffle(buckets[key]).forEach(function (question) {
                if (picked.length < QUESTION_COUNT) {
                    picked.push(question);
                }
            });
        });

        return shuffle(picked);
    }

    /**
     * Four choices: the question's own answer plus three answers drawn from
     * other questions of the same topic (same level first). Every choice is
     * bank text, and duplicates are skipped.
     */
    function buildOptions(question, pool) {
        var seen = {};
        var sameLevel = [];
        var otherLevel = [];

        seen[normText(question.answer)] = true;

        pool.forEach(function (candidate) {
            var key = normText(candidate.answer);

            if (seen[key]) {
                return;
            }

            seen[key] = true;

            if (bucketOf(candidate) === bucketOf(question)) {
                sameLevel.push(candidate.answer);
            } else {
                otherLevel.push(candidate.answer);
            }
        });

        var distractors = shuffle(sameLevel)
            .concat(shuffle(otherLevel))
            .slice(0, 3);

        var options = [{ text: question.answer, correct: true }];

        distractors.forEach(function (text) {
            options.push({ text: text, correct: false });
        });

        return shuffle(options);
    }

    /* ==========================
       Setup screen
    ========================== */

    function markSelected(container, attribute, value) {
        var buttons = container.querySelectorAll("[" + attribute + "]");

        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle(
                "is-selected",
                buttons[i].getAttribute(attribute) === value
            );
        }
    }

    function syncStart() {
        if (refs.start) {
            refs.start.disabled = !(setup.topicId && setup.levelId);
        }
    }

    function selectTopic(id) {
        setup.topicId = id;

        if (refs.topicGrid) {
            markSelected(refs.topicGrid, "data-topic", id);
        }

        syncStart();
    }

    function selectLevel(id) {
        setup.levelId = id;

        if (refs.levelGrid) {
            markSelected(refs.levelGrid, "data-level", id);
        }

        syncStart();
    }

    function renderSetup() {
        stopTimer();
        clear(root);

        round = null;
        refs.topicGrid = null;
        refs.levelGrid = null;
        refs.start = null;

        var wrap = el("div", "quiz-setup");

        var hero = el("div", "quiz-hero");
        hero.appendChild(el("span", "quiz-hero-icon", "🎮"));
        hero.appendChild(el("span", "eyebrow", "PLAY & LEARN"));
        hero.appendChild(el("h2", "quiz-title", "QA Quiz Battle"));
        hero.appendChild(
            el(
                "p",
                "quiz-sub",
                "Pick a topic and a difficulty, then battle through " +
                    QUESTION_COUNT +
                    " questions against the clock."
            )
        );
        wrap.appendChild(hero);

        var topics = questionTopics();

        var topicBlock = el("div", "quiz-block");
        topicBlock.appendChild(el("h3", "quiz-block-title", "1 · Choose a topic"));

        if (!topics.length) {
            topicBlock.appendChild(
                el("p", "quiz-empty", "No topics are available right now.")
            );
            wrap.appendChild(topicBlock);
            root.appendChild(wrap);
            return;
        }

        var topicGrid = el("div", "quiz-topic-grid");

        topics.forEach(function (topic) {
            var button = el("button", "quiz-topic");
            button.type = "button";
            button.setAttribute("data-topic", topic.id);
            button.setAttribute("aria-pressed", "false");
            button.appendChild(el("span", "quiz-topic-icon", topic.icon || "❓"));
            button.appendChild(el("span", "quiz-topic-name", topic.name));

            if (setup.topicId === topic.id) {
                button.classList.add("is-selected");
                button.setAttribute("aria-pressed", "true");
            }

            button.addEventListener("click", function () {
                selectTopic(topic.id);
                markAria(topicGrid, "data-topic", topic.id, "aria-pressed");
            });

            topicGrid.appendChild(button);
        });

        refs.topicGrid = topicGrid;
        topicBlock.appendChild(topicGrid);
        wrap.appendChild(topicBlock);

        var levelBlock = el("div", "quiz-block");
        levelBlock.appendChild(el("h3", "quiz-block-title", "2 · Pick a difficulty"));

        var levelGrid = el("div", "quiz-level-grid");

        LEVELS.forEach(function (level) {
            var settings = LEVEL_SETTINGS[level.id];
            var button = el("button", "quiz-level");
            button.type = "button";
            button.setAttribute("data-level", level.id);
            button.setAttribute("aria-pressed", "false");
            button.appendChild(el("span", "quiz-level-icon", level.icon));
            button.appendChild(el("span", "quiz-level-name", level.label));
            button.appendChild(el("span", "quiz-level-blurb", level.blurb));
            button.appendChild(
                el(
                    "span",
                    "quiz-level-meta",
                    QUESTION_COUNT + " questions · " + settings.seconds + "s each"
                )
            );

            if (setup.levelId === level.id) {
                button.classList.add("is-selected");
                button.setAttribute("aria-pressed", "true");
            }

            button.addEventListener("click", function () {
                selectLevel(level.id);
                markAria(levelGrid, "data-level", level.id, "aria-pressed");
            });

            levelGrid.appendChild(button);
        });

        refs.levelGrid = levelGrid;
        levelBlock.appendChild(levelGrid);
        wrap.appendChild(levelBlock);

        var footer = el("div", "quiz-setup-footer");
        var start = el("button", "btn btn-primary btn-large quiz-start", "▶ Start Battle");
        start.type = "button";
        start.disabled = !(setup.topicId && setup.levelId);
        start.addEventListener("click", startRound);
        refs.start = start;
        footer.appendChild(start);
        wrap.appendChild(footer);

        root.appendChild(wrap);
    }

    function markAria(container, attribute, value, aria) {
        var buttons = container.querySelectorAll("[" + attribute + "]");

        for (var i = 0; i < buttons.length; i++) {
            buttons[i].setAttribute(
                aria,
                buttons[i].getAttribute(attribute) === value ? "true" : "false"
            );
        }
    }

    /* ==========================
       Round
    ========================== */

    function startRound() {
        if (!setup.topicId || !setup.levelId) {
            return;
        }

        stopTimer();
        clear(root);
        round = null;
        root.appendChild(el("div", "quiz-loading", "Loading questions…"));

        var topicId = setup.topicId;
        var levelId = setup.levelId;

        loadTopic(topicId)
            .then(function (all) {
                var picked = pickQuestions(all, levelId);

                if (!picked.length) {
                    clear(root);
                    root.appendChild(
                        el(
                            "div",
                            "quiz-empty",
                            "No questions are available for this topic yet."
                        )
                    );
                    return;
                }

                round = {
                    topicId: topicId,
                    levelId: levelId,
                    topicName: topicName(topicId),
                    questions: picked,
                    pool: all,
                    index: 0,
                    score: 0,
                    correct: 0,
                    timeUsed: 0,
                    answers: [],
                    current: null,
                    dom: null
                };

                renderQuestion();
            })
            .catch(function (error) {
                console.error(error);
                clear(root);
                root.appendChild(
                    el("div", "quiz-empty", "Unable to load questions. Please try again.")
                );
            });
    }

    function renderQuestion() {
        stopTimer();

        var question = round.questions[round.index];
        var settings = LEVEL_SETTINGS[round.levelId];
        var options = buildOptions(question, round.pool);

        round.current = {
            question: question,
            options: options,
            timeLeft: settings.seconds,
            answered: false
        };

        clear(root);

        var screen = el("div", "quiz-screen");

        var bar = el("div", "quiz-bar");
        var badges = el("div", "quiz-bar-left");
        badges.appendChild(
            el(
                "span",
                "quiz-badge quiz-badge-topic",
                (topicIcon(round.topicId) + " " + round.topicName).trim()
            )
        );
        badges.appendChild(
            el("span", "quiz-badge quiz-badge-level level-" + round.levelId, levelBy(round.levelId).label)
        );
        bar.appendChild(badges);

        var score = el("span", "quiz-score", "★ " + round.score + " pts");
        bar.appendChild(score);
        screen.appendChild(bar);

        var meta = el("div", "quiz-meta");
        meta.appendChild(
            el(
                "span",
                "quiz-counter",
                "Question " + (round.index + 1) + " of " + round.questions.length
            )
        );

        var timer = el("div", "quiz-timer");
        timer.appendChild(el("span", "quiz-timer-icon", "⏱"));
        var timerText = el("span", "quiz-timer-text", settings.seconds + "s");
        timer.appendChild(timerText);
        var timerBar = el("span", "quiz-timer-bar");
        timer.appendChild(timerBar);
        meta.appendChild(timer);
        screen.appendChild(meta);

        var progress = el("div", "quiz-progress");
        var progressFill = el("div", "quiz-progress-fill");
        progressFill.style.width = Math.round((round.index / round.questions.length) * 100) + "%";
        progress.appendChild(progressFill);
        screen.appendChild(progress);

        var card = el("div", "quiz-question-card");
        card.appendChild(el("p", "quiz-question-text", question.question));

        var list = el("div", "quiz-options");
        var letters = ["A", "B", "C", "D", "E", "F"];

        options.forEach(function (option, index) {
            var button = el("button", "quiz-option");
            button.type = "button";
            button.setAttribute("data-index", String(index));
            button.appendChild(el("span", "quiz-option-key", letters[index] || "•"));
            button.appendChild(el("span", "quiz-option-text", option.text));

            button.addEventListener("click", function () {
                answer(index);
            });

            list.appendChild(button);
        });

        card.appendChild(list);

        var feedback = el("div", "quiz-feedback");
        feedback.hidden = true;
        card.appendChild(feedback);

        var actions = el("div", "quiz-actions");
        var next = el("button", "btn btn-primary quiz-next", "Next →");
        next.type = "button";
        next.hidden = true;
        next.addEventListener("click", advance);
        actions.appendChild(next);
        card.appendChild(actions);

        screen.appendChild(card);
        root.appendChild(screen);

        round.dom = {
            timerText: timerText,
            timerBar: timerBar,
            timer: timer,
            progressFill: progressFill,
            options: list,
            feedback: feedback,
            next: next,
            score: score
        };

        startTimer();
    }

    function startTimer() {
        tickTimer = window.setInterval(function () {
            round.current.timeLeft -= 1;
            updateTimer();

            if (round.current.timeLeft <= 0) {
                answer(-1);
            }
        }, 1000);

        updateTimer();
    }

    function updateTimer() {
        if (!round || !round.dom || !round.current) {
            return;
        }

        var settings = LEVEL_SETTINGS[round.levelId];
        var left = Math.max(0, round.current.timeLeft);

        round.dom.timerText.textContent = left + "s";
        round.dom.timerBar.style.width = Math.round((left / settings.seconds) * 100) + "%";
        round.dom.timer.classList.toggle("is-low", left <= 5);
    }

    function stopTimer() {
        if (tickTimer) {
            window.clearInterval(tickTimer);
            tickTimer = null;
        }
    }

    function answer(choiceIndex) {
        if (!round || !round.current || round.current.answered) {
            return;
        }

        round.current.answered = true;
        stopTimer();

        var settings = LEVEL_SETTINGS[round.levelId];
        var question = round.current.question;
        var options = round.current.options;
        var correctIndex = 0;

        options.forEach(function (option, index) {
            if (option.correct) {
                correctIndex = index;
            }
        });

        var isCorrect = choiceIndex === correctIndex;
        var earned = 0;

        // Points for the right answer, plus a bonus for the time left over.
        if (isCorrect) {
            var ratio = Math.max(0, round.current.timeLeft) / settings.seconds;

            earned = settings.points + Math.round(settings.points * ratio);
            round.correct += 1;
            round.score += earned;
        }

        round.timeUsed += settings.seconds - Math.max(0, round.current.timeLeft);

        round.answers.push({
            question: question,
            isCorrect: isCorrect
        });

        var buttons = round.dom.options.querySelectorAll(".quiz-option");

        for (var i = 0; i < buttons.length; i++) {
            var index = Number(buttons[i].getAttribute("data-index"));

            buttons[i].disabled = true;

            if (index === correctIndex) {
                buttons[i].classList.add("is-correct");
            }

            if (index === choiceIndex) {
                buttons[i].classList.add("is-chosen");

                if (!isCorrect) {
                    buttons[i].classList.add("is-wrong");
                }
            }
        }

        round.dom.score.textContent = "★ " + round.score + " pts";
        round.dom.score.classList.remove("is-bump");

        // Restart the bump animation even when the score text is unchanged.
        void round.dom.score.offsetWidth;
        round.dom.score.classList.add("is-bump");

        showFeedback(isCorrect, earned, choiceIndex === -1);

        var next = round.dom.next;
        next.hidden = false;
        next.textContent =
            round.index + 1 >= round.questions.length ? "See results →" : "Next →";
    }

    function showFeedback(isCorrect, earned, timedOut) {
        var question = round.current.question;
        var feedback = round.dom.feedback;

        clear(feedback);
        feedback.hidden = false;
        feedback.className = "quiz-feedback " + (isCorrect ? "is-correct" : "is-wrong");

        var head = el("div", "quiz-feedback-head");
        head.appendChild(
            el("span", "quiz-feedback-icon", isCorrect ? "🎉" : timedOut ? "⌛" : "❌")
        );
        head.appendChild(
            el("strong", null, isCorrect ? "Correct!" : timedOut ? "Time is up!" : "Not quite")
        );

        if (isCorrect) {
            head.appendChild(el("span", "quiz-points", "+" + earned + " pts"));
        }

        feedback.appendChild(head);

        var explanation = el("div", "quiz-explanation");
        explanation.appendChild(el("span", "quiz-explanation-label", "Explanation"));
        explanation.appendChild(el("p", "quiz-explanation-text", question.answer));
        feedback.appendChild(explanation);

        if (question.realTimeExample) {
            var example = el("div", "quiz-example");
            example.appendChild(el("span", "quiz-explanation-label", "Real-time example"));
            example.appendChild(el("p", "quiz-explanation-text", question.realTimeExample));
            feedback.appendChild(example);
        }
    }

    function advance() {
        if (!round) {
            return;
        }

        round.index += 1;

        if (round.index >= round.questions.length) {
            renderResults();
        } else {
            renderQuestion();
        }
    }

    /* ==========================
       Results
    ========================== */

    function rankFor(accuracy) {
        if (accuracy >= 80) {
            return "Quiz Champion!";
        }

        if (accuracy >= 60) {
            return "Great job!";
        }

        if (accuracy >= 40) {
            return "Nice effort!";
        }

        return "Keep practising!";
    }

    function trophyFor(accuracy) {
        if (accuracy >= 80) {
            return "🏆";
        }

        if (accuracy >= 60) {
            return "🥈";
        }

        if (accuracy >= 40) {
            return "🥉";
        }

        return "💪";
    }

    function statCard(icon, value, label, modifier) {
        var card = el("div", "quiz-stat" + (modifier ? " " + modifier : ""));

        card.appendChild(el("span", "quiz-stat-icon", icon));
        card.appendChild(el("span", "quiz-stat-value", String(value)));
        card.appendChild(el("span", "quiz-stat-label", label));

        return card;
    }

    function breakdown(title, items, tone) {
        var block = el("div", "quiz-review-block " + tone);

        var head = el("div", "quiz-review-head");
        head.appendChild(el("span", null, title));
        head.appendChild(el("span", "quiz-review-count", String(items.length)));
        block.appendChild(head);

        if (!items.length) {
            block.appendChild(
                el(
                    "p",
                    "quiz-review-empty",
                    tone === "is-correct"
                        ? "None this time — better luck on the next round!"
                        : "None. A flawless battle!"
                )
            );

            return block;
        }

        var list = el("ul", "quiz-review-list");

        items.forEach(function (item) {
            var entry = el("li", "quiz-review-item");
            entry.appendChild(el("span", "quiz-review-question", item.question.question));

            if (!item.isCorrect) {
                var answer = el("span", "quiz-review-answer", item.question.answer);
                answer.title = item.question.answer;
                entry.appendChild(answer);
            }

            list.appendChild(entry);
        });

        block.appendChild(list);

        return block;
    }

    function renderResults() {
        stopTimer();

        var total = round.questions.length;
        var accuracy = Math.round((round.correct / total) * 100);

        var correctItems = round.answers.filter(function (item) {
            return item.isCorrect;
        });

        var wrongItems = round.answers.filter(function (item) {
            return !item.isCorrect;
        });

        clear(root);

        var screen = el("div", "quiz-screen quiz-results");

        var hero = el("div", "quiz-result-hero");
        hero.appendChild(el("span", "quiz-result-trophy", trophyFor(accuracy)));
        hero.appendChild(el("span", "eyebrow", "BATTLE COMPLETE"));
        hero.appendChild(el("h2", "quiz-title", rankFor(accuracy)));
        hero.appendChild(
            el(
                "p",
                "quiz-sub",
                round.topicName + " · " + levelBy(round.levelId).label + " level"
            )
        );
        screen.appendChild(hero);

        var stats = el("div", "quiz-stats");
        stats.appendChild(statCard("★", round.score, "Score", "quiz-stat-score"));
        stats.appendChild(statCard("🎯", accuracy + "%", "Accuracy", "quiz-stat-accuracy"));
        stats.appendChild(
            statCard("✅", round.correct + " / " + total, "Correct answers", "quiz-stat-correct")
        );
        stats.appendChild(
            statCard("⏱", formatTime(round.timeUsed), "Time taken", "quiz-stat-time")
        );
        screen.appendChild(stats);

        var review = el("div", "quiz-review");
        review.appendChild(breakdown("✅ Correct answers", correctItems, "is-correct"));
        review.appendChild(breakdown("❌ Incorrect answers", wrongItems, "is-wrong"));
        screen.appendChild(review);

        var actions = el("div", "quiz-result-actions");

        var replay = el("button", "btn btn-primary btn-large", "🔁 Play again");
        replay.type = "button";
        replay.addEventListener("click", startRound);

        var change = el("button", "btn btn-ghost btn-large", "🎲 Change topic");
        change.type = "button";
        change.addEventListener("click", renderSetup);

        actions.appendChild(replay);
        actions.appendChild(change);
        screen.appendChild(actions);

        root.appendChild(screen);

        // The round is over: drop it so stray keys cannot act on the results.
        round = null;
    }

    /* ==========================
       Wiring
    ========================== */

    if (backButton) {
        backButton.addEventListener("click", function () {
            stopTimer();

            if (window.QAHub && window.QAHub.goTo) {
                window.QAHub.goTo("topics");
            } else {
                window.location.hash = "topics";
            }
        });
    }

    // Sort any key presses into "pick an answer" or "move on".
    document.addEventListener("keydown", function (event) {
        var view = document.getElementById("game-view");

        if (!round || !round.current || (view && view.hidden)) {
            return;
        }

        var tag = event.target && event.target.tagName;

        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
            return;
        }

        if (!round.current.answered) {
            var choice = parseInt(event.key, 10);

            if (choice >= 1 && choice <= round.current.options.length) {
                event.preventDefault();
                answer(choice - 1);
            }

            return;
        }

        if (event.key === "Enter" && round.dom && !round.dom.next.hidden) {
            event.preventDefault();
            advance();
        }
    });

    // Leaving the game stops the clock so it never keeps running in the
    // background — the same reason the replay timer is cleared on entry.
    window.addEventListener("hashchange", function () {
        var name = window.location.hash.replace(/^#\/?/, "").split("?")[0];

        if (name !== GAME_HASH) {
            stopTimer();
        }
    });

    window.QAQuiz = {
        open: function () {
            renderSetup();
        },
        levels: LEVELS
    };

    // The page may be opened straight on the game by its hash.
    if (window.location.hash.replace(/^#\/?/, "").split("?")[0] === GAME_HASH) {
        renderSetup();
    }
})();
