/* =========================================================
   QA INTERVIEW HUB — LEARNING PROGRESS
   Tracks completed questions, revision bookmarks and renders
   the personalised dashboard.

   Completion is recorded only when an answer is actually
   expanded, never when the question title is merely visible.
========================================================= */

(function () {
    "use strict";

    var completed = {};   // questionKey -> true
    var bookmarks = {};   // questionKey -> true
    var loaded = false;   // progress has been fetched for this session
    var guestHintShown = false;

    // Newly studied keys wait briefly so that "Expand all" — which opens every
    // answer at once — is written to D1 as a single batch, not one call each.
    var pending = {};     // questionKey -> true, awaiting the next flush
    var flushTimer = null;
    var FLUSH_DELAY_MS = 250;

    /* =========================================================
       Toast
    ========================================================= */

    function toastHost() {
        var host = document.getElementById("qa-toast-host");

        if (!host) {
            host = document.createElement("div");
            host.id = "qa-toast-host";
            host.className = "toast-host";
            host.setAttribute("aria-live", "polite");
            document.body.appendChild(host);
        }

        return host;
    }

    function toast(message, tone) {
        var host = toastHost();
        var node = document.createElement("div");

        node.className = "toast" + (tone ? " toast-" + tone : "");
        node.textContent = message;

        host.appendChild(node);

        window.setTimeout(function () {
            node.classList.add("toast-out");

            window.setTimeout(function () {
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            }, 300);
        }, 2600);
    }

    /* =========================================================
       State
    ========================================================= */

    function signedIn() {
        return Boolean(window.QAAuth && window.QAAuth.user);
    }

    function setFromLists(completedKeys, bookmarkKeys) {
        completed = {};
        bookmarks = {};

        (completedKeys || []).forEach(function (key) {
            completed[key] = true;
        });

        (bookmarkKeys || []).forEach(function (key) {
            bookmarks[key] = true;
        });

        loaded = true;
    }

    function load() {
        if (!signedIn()) {
            completed = {};
            bookmarks = {};
            loaded = false;
            return Promise.resolve();
        }

        return window.QAAPI.getProgress().then(function (result) {
            if (!result.ok || !result.data) {
                return;
            }

            setFromLists(result.data.completed, result.data.bookmarks);
        });
    }

    function resetState() {
        completed = {};
        bookmarks = {};
        loaded = false;
        pending = {};

        if (flushTimer) {
            window.clearTimeout(flushTimer);
            flushTimer = null;
        }
    }

    /* =========================================================
       Question cards
    ========================================================= */

    function refreshCard(card) {
        var key = card.getAttribute("data-question-key");

        if (!key) {
            return;
        }

        var isDone = Boolean(completed[key]);
        var isMarked = Boolean(bookmarks[key]);

        card.classList.toggle("is-completed", isDone);

        var badge = card.querySelector(".question-done");

        if (badge) {
            badge.hidden = !isDone;
        }

        var actions = card.querySelector(".question-actions");

        if (!actions) {
            return;
        }

        var reset = actions.querySelector(".qa-reset");
        var mark = actions.querySelector(".qa-bookmark");

        if (reset) {
            reset.hidden = !isDone;
        }

        if (mark) {
            mark.classList.toggle("is-active", isMarked);
            mark.textContent = isMarked ? "★ Saved for revision" : "☆ Revise later";
            mark.setAttribute("aria-pressed", isMarked ? "true" : "false");
        }
    }

    function buildActions(card, key) {
        var answer = card.querySelector(".answer-section");

        if (!answer || answer.querySelector(".question-actions")) {
            return;
        }

        var actions = document.createElement("div");
        actions.className = "question-actions";

        var mark = document.createElement("button");
        mark.type = "button";
        mark.className = "btn btn-ghost qa-bookmark";
        mark.textContent = "☆ Revise later";
        mark.addEventListener("click", function () {
            toggleBookmark(key);
        });

        var reset = document.createElement("button");
        reset.type = "button";
        reset.className = "link-button qa-reset";
        reset.textContent = "↺ Mark as not studied";
        reset.hidden = true;
        reset.addEventListener("click", function () {
            clearCompletion(key);
        });

        actions.appendChild(mark);
        actions.appendChild(reset);
        answer.appendChild(actions);
    }

    function eachCard(container, fn) {
        var cards = container.querySelectorAll(".question-card");

        for (var i = 0; i < cards.length; i++) {
            fn(cards[i]);
        }
    }

    function onRendered(payload) {
        var container = payload && payload.container;

        if (!container) {
            return;
        }

        eachCard(container, function (card) {
            var key = card.getAttribute("data-question-key");

            if (!key) {
                return;
            }

            buildActions(card, key);
            refreshCard(card);
        });

        updateStudyStats(payload);
    }

    function updateStudyStats(payload) {
        var stats = document.getElementById("question-stats");

        if (!stats) {
            return;
        }

        var existing = stats.querySelector(".study-progress");

        if (existing) {
            existing.parentNode.removeChild(existing);
        }

        if (!signedIn() || !payload || !payload.topicId) {
            return;
        }

        var total = (payload.questions || []).length;
        var prefix = payload.topicId + ":";
        var doneCount = 0;

        Object.keys(completed).forEach(function (key) {
            if (key.indexOf(prefix) === 0) {
                doneCount += 1;
            }
        });

        if (total === 0) {
            return;
        }

        var percent = Math.round((doneCount / total) * 100);
        var remaining = total - doneCount;
        var pill = document.createElement("span");

        pill.className = "study-progress";
        pill.textContent =
            "✓ " + doneCount + " studied · " + remaining + " left · " + percent + "%";

        stats.appendChild(pill);
    }

    /* =========================================================
       Mutations
    ========================================================= */

    /**
     * Records a studied question. The count only moves when the key was not
     * already studied, so re-opening an answer changes nothing (requirement 3).
     */
    function markStudied(key) {
        if (completed[key]) {
            return;
        }

        // Update the UI immediately; the write is batched just below.
        completed[key] = true;
        pending[key] = true;

        refreshVisible(key);
        scheduleFlush();
    }

    function scheduleFlush() {
        if (flushTimer) {
            return;
        }

        flushTimer = window.setTimeout(flushPending, FLUSH_DELAY_MS);
    }

    function flushPending() {
        flushTimer = null;

        var keys = Object.keys(pending);

        if (keys.length === 0) {
            return;
        }

        pending = {};

        function rollback() {
            keys.forEach(function (key) {
                delete completed[key];
            });

            refreshAllCards();
            toast("Your progress could not be saved. Please try again.", "warn");
        }

        window.QAAPI.completeMany(keys).then(function (result) {
            if (!result.ok) {
                rollback();
            }
        }).catch(rollback);
    }

    function clearCompletion(key) {
        if (!signedIn()) {
            return;
        }

        // Still queued: nothing has reached the server, so just drop it locally.
        if (pending[key]) {
            delete pending[key];
            delete completed[key];
            refreshVisible(key);
            toast("Marked as not studied.");
            return;
        }

        window.QAAPI.reset(key).then(function (result) {
            if (!result.ok) {
                return;
            }

            delete completed[key];
            refreshVisible(key);
            toast("Marked as not studied.");
        });
    }

    function toggleBookmark(key) {
        if (!signedIn()) {
            toast("Sign in to save revision bookmarks.", "warn");
            return;
        }

        var mark = bookmarks[key];

        var call = mark
            ? window.QAAPI.removeBookmark(key)
            : window.QAAPI.addBookmark(key);

        call.then(function (result) {
            if (!result.ok) {
                toast(window.QAAPI.messageOf(result, "Could not update bookmark."), "warn");
                return;
            }

            if (mark) {
                delete bookmarks[key];
                toast("Removed from revision list.");
            } else {
                bookmarks[key] = true;
                toast("Saved for revision.");
            }

            refreshVisible(key);
        });
    }

    function refreshVisible(key) {
        var cards = document.querySelectorAll('.question-card[data-question-key="' + key + '"]');

        for (var i = 0; i < cards.length; i++) {
            refreshCard(cards[i]);
        }

        refreshProgressViews();
    }

    /** Re-renders every counter that summarises progress. */
    function refreshProgressViews() {
        updateTopicCards();

        var stats = document.getElementById("question-stats");

        if (stats && window.QAHub && window.QAHub.currentTopic) {
            updateStudyStats({
                topicId: window.QAHub.currentTopic.id,
                questions: window.QAHub.getCurrentQuestions
                    ? window.QAHub.getCurrentQuestions()
                    : []
            });
        }

        if (window.location.hash.indexOf("dashboard") !== -1) {
            renderDashboard();
        }
    }

    function refreshAllCards() {
        if (!window.QAHub) {
            return;
        }

        window.QAHub.eachQuestionCard(function (card) {
            refreshCard(card);
        });

        refreshProgressViews();
    }

    /* =========================================================
       Completion trigger (answer expanded)
    ========================================================= */

    /**
     * An answer became visible. Closing an answer never reaches this point,
     * so collapsing a question leaves progress untouched (requirement 4).
     */
    function onOpened(payload) {
        if (!payload || !payload.key) {
            return;
        }

        if (!signedIn()) {
            if (!guestHintShown) {
                guestHintShown = true;
                toast("Sign in to track your progress automatically.", "warn");
            }

            return;
        }

        markStudied(payload.key);
    }

    /* =========================================================
       Topic cards (personalised counts)
    ========================================================= */

    function topicProgress(topicId, total) {
        var prefix = topicId + ":";
        var doneCount = 0;

        Object.keys(completed).forEach(function (key) {
            if (key.indexOf(prefix) === 0) {
                doneCount += 1;
            }
        });

        var percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

        return { done: doneCount, total: total, percent: percent };
    }

    function updateTopicCards() {
        if (!window.QAHub || !window.QAHub.eachTopicCard) {
            return;
        }

        window.QAHub.eachTopicCard(function (ref) {
            var bar = ref.card.querySelector(".topic-card-progress");

            if (!signedIn() || !loaded || !ref.total) {
                if (bar) {
                    bar.hidden = true;
                }

                // Restore the plain question count (guests and signed-out users).
                if (ref.countEl && ref.total) {
                    ref.countEl.hidden = false;
                    ref.countEl.textContent =
                        ref.total + (ref.total === 1 ? " question" : " questions");
                }

                return;
            }

            var info = topicProgress(ref.topicId, ref.total);
            var remaining = info.total - info.done;

            if (ref.countEl) {
                ref.countEl.hidden = false;
                ref.countEl.textContent = info.done + " studied · " + remaining + " left";
            }

            if (!bar) {
                bar = document.createElement("span");
                bar.className = "topic-card-progress";

                var track = document.createElement("span");
                track.className = "progress-track";

                var fill = document.createElement("span");
                fill.className = "progress-fill";

                var label = document.createElement("span");
                label.className = "progress-label";

                track.appendChild(fill);
                bar.appendChild(track);
                bar.appendChild(label);

                ref.card.appendChild(bar);
            }

            bar.hidden = false;
            bar.querySelector(".progress-fill").style.width = info.percent + "%";
            bar.querySelector(".progress-label").textContent = info.percent + "%";
        });
    }

    /* =========================================================
       Dashboard
    ========================================================= */

    function questionTopics() {
        return (window.QAHub ? window.QAHub.topics : []).filter(function (topic) {
            return topic.type === "questions";
        });
    }

    function loadTotals() {
        var topics = questionTopics();

        return Promise.all(
            topics.map(function (topic) {
                return window.QAHub.loadQuestions(topic.id)
                    .then(function (questions) {
                        return { topic: topic, questions: questions };
                    })
                    .catch(function () {
                        return { topic: topic, questions: [] };
                    });
            })
        );
    }

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

    function formatDate(value) {
        var date = new Date(value);

        if (isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short"
        });
    }

    function relativeDay(value) {
        var date = new Date(value);

        if (isNaN(date.getTime())) {
            return "";
        }

        var days = Math.floor((Date.now() - date.getTime()) / 86400000);

        if (days <= 0) {
            return "Today";
        }

        if (days === 1) {
            return "Yesterday";
        }

        return days + " days ago";
    }

    function questionTextLookup(totals) {
        var map = {};

        totals.forEach(function (entry) {
            (entry.questions || []).forEach(function (item) {
                var key = entry.topic.id + ":" + item.id;

                map[key] = {
                    question: item.question,
                    topicName: entry.topic.name,
                    topicId: entry.topic.id
                };
            });
        });

        return map;
    }

    function statCard(label, value, detail) {
        var card = el("div", "dash-stat");
        card.appendChild(el("span", "dash-stat-value", value));
        card.appendChild(el("span", "dash-stat-label", label));

        if (detail) {
            card.appendChild(el("span", "dash-stat-detail", detail));
        }

        return card;
    }

    function renderDashboard() {
        var host = document.getElementById("dashboard-content");

        if (!host) {
            return;
        }

        if (!signedIn()) {
            clear(host);
            var gate = el("div", "state-message");
            gate.appendChild(el("strong", null, "Please sign in."));
            gate.appendChild(el("span", null, "The dashboard shows your personal learning progress."));
            host.appendChild(gate);
            return;
        }

        clear(host);
        host.appendChild(el("div", "state-message", "Loading your dashboard..."));

        Promise.all([window.QAAPI.getDashboard(), loadTotals()]).then(function (results) {
            var response = results[0];
            var totals = results[1];

            if (!response.ok || !response.data) {
                clear(host);
                host.appendChild(
                    el(
                        "div",
                        "state-message",
                        window.QAAPI.messageOf(response, "Could not load your dashboard.")
                    )
                );
                return;
            }

            var data = response.data;

            if (window.location.hash.indexOf("dashboard") === -1) {
                return;
            }

            clear(host);

            var grandTotal = totals.reduce(function (sum, entry) {
                return sum + (entry.questions || []).length;
            }, 0);

            var doneTotal = data.completedTotal || 0;
            var overallPercent = grandTotal > 0
                ? Math.round((doneTotal / grandTotal) * 100)
                : 0;

            var weekTotal = (data.weekly || []).reduce(function (sum, day) {
                return sum + day.count;
            }, 0);

            /* ---- headline stats ---- */

            var stats = el("div", "dash-stats");
            stats.appendChild(statCard("Questions completed", String(doneTotal), "of " + grandTotal + " total"));
            stats.appendChild(statCard("Overall progress", overallPercent + "%", "across all topics"));
            stats.appendChild(statCard("Completed this week", String(weekTotal), "last 7 days"));
            stats.appendChild(statCard("Saved for revision", String((data.bookmarks || []).length), "bookmarks"));
            host.appendChild(stats);

            /* ---- overall progress bar ---- */

            var overall = el("div", "dash-card");
            overall.appendChild(el("h3", null, "Overall Completion"));

            var track = el("div", "progress-track progress-track-lg");
            var fill = el("div", "progress-fill");
            fill.style.width = overallPercent + "%";
            track.appendChild(fill);
            overall.appendChild(track);
            overall.appendChild(
                el("p", "dash-muted", doneTotal + " of " + grandTotal + " questions completed")
            );
            host.appendChild(overall);

            /* ---- topic wise ---- */

            var topicSection = el("div", "dash-card");
            topicSection.appendChild(el("h3", null, "Progress by Topic"));

            var grid = el("div", "dash-topics");

            totals.forEach(function (entry) {
                var total = (entry.questions || []).length;

                if (total === 0) {
                    return;
                }

                var done = (data.completedByTopic || {})[entry.topic.id] || 0;
                var percent = Math.round((done / total) * 100);

                var row = el("button", "dash-topic-row");
                row.type = "button";

                var head = el("span", "dash-topic-head");
                head.appendChild(el("span", "dash-topic-icon", entry.topic.icon));
                head.appendChild(el("span", "dash-topic-name", entry.topic.name));
                head.appendChild(
                    el(
                        "span",
                        "dash-topic-count",
                        done + " studied · " + (total - done) + " left · " + percent + "%"
                    )
                );
                row.appendChild(head);

                var topicTrack = el("span", "progress-track");
                var topicFill = el("span", "progress-fill");
                topicFill.style.width = percent + "%";
                topicTrack.appendChild(topicFill);
                row.appendChild(topicTrack);

                row.addEventListener("click", function () {
                    window.QAHub.goTo(entry.topic.id);
                });

                grid.appendChild(row);
            });

            topicSection.appendChild(grid);
            host.appendChild(topicSection);

            /* ---- weekly activity ---- */

            var week = el("div", "dash-card");
            week.appendChild(el("h3", null, "Activity — Last 7 Days"));

            var max = (data.weekly || []).reduce(function (peak, day) {
                return Math.max(peak, day.count);
            }, 0);

            var chart = el("div", "dash-chart");

            (data.weekly || []).forEach(function (day) {
                var column = el("div", "dash-bar-col");
                var bar = el("div", "dash-bar");
                var height = max > 0 ? Math.max(6, Math.round((day.count / max) * 100)) : 6;

                bar.style.height = height + "%";
                bar.title = day.count + " completed";

                column.appendChild(el("span", "dash-bar-value", String(day.count)));
                column.appendChild(bar);
                column.appendChild(el("span", "dash-bar-label", formatDate(day.date)));

                chart.appendChild(column);
            });

            week.appendChild(chart);
            host.appendChild(week);

            /* ---- recent + bookmarks ---- */

            var lookup = questionTextLookup(totals);

            var lists = el("div", "dash-lists");

            lists.appendChild(
                buildList(
                    "Recently Completed",
                    (data.recent || []).map(function (entry) {
                        var info = lookup[entry.questionKey];
                        var topicId = entry.questionKey.split(":")[0];

                        return {
                            key: entry.questionKey,
                            title: info ? info.question : entry.questionKey,
                            meta: (info ? info.topicName + " · " : "") + relativeDay(entry.completedAt),
                            topicId: topicId,
                            empty: "No questions completed yet. Open any answer to start tracking."
                        };
                    }),
                    "Open a few answers and they will appear here."
                )
            );

            lists.appendChild(
                buildList(
                    "Revision Bookmarks",
                    (data.bookmarks || []).map(function (entry) {
                        var info = lookup[entry.questionKey];
                        var topicId = entry.questionKey.split(":")[0];

                        return {
                            key: entry.questionKey,
                            title: info ? info.question : entry.questionKey,
                            meta: info ? info.topicName : entry.questionKey,
                            topicId: topicId,
                            empty: "No bookmarks yet. Use “Revise later” on any question."
                        };
                    }),
                    "Your saved questions will appear here."
                )
            );

            host.appendChild(lists);
        });
    }

    function buildList(title, items, emptyText) {
        var card = el("div", "dash-card");
        card.appendChild(el("h3", null, title));

        if (items.length === 0) {
            card.appendChild(el("p", "dash-muted", emptyText));
            return card;
        }

        var list = el("ul", "dash-list");

        items.forEach(function (item) {
            var row = el("li", "dash-list-item");
            var link = el("button", "dash-list-link");
            link.type = "button";

            link.appendChild(el("span", "dash-list-title", item.title));
            link.appendChild(el("span", "dash-list-meta", item.meta));

            link.addEventListener("click", function () {
                window.QAHub.goTo(item.topicId);
            });

            row.appendChild(link);
            list.appendChild(row);
        });

        card.appendChild(list);

        return card;
    }

    /* =========================================================
       Wiring
    ========================================================= */

    function refreshAll() {
        if (!window.QAHub) {
            return;
        }

        window.QAHub.eachTopicCard(function (ref) {
            ref.card.classList.toggle("is-tracked", signedIn() && loaded);
        });

        if (window.QAHub.currentTopic) {
            window.QAHub.eachQuestionCard(function (card) {
                refreshCard(card);
            });

            updateStudyStats({
                topicId: window.QAHub.currentTopic.id,
                questions: window.QAHub.getCurrentQuestions
                    ? window.QAHub.getCurrentQuestions()
                    : []
            });
        }

        updateTopicCards();
    }

    function onAuthChanged(detail) {
        resetState();

        load().then(refreshAll);

        if (detail && detail.user && !detail.initial) {
            toast("Welcome, " + detail.user.name + "!");
        }

        if (window.location.hash.indexOf("dashboard") !== -1) {
            renderDashboard();
        }
    }

    function init() {
        if (!window.QAHub) {
            return;
        }

        window.QAHub.on("rendered", onRendered);
        window.QAHub.on("opened", onOpened);
        window.QAHub.on("topicCard", updateTopicCards);

        document.addEventListener("qahub:auth", function (event) {
            onAuthChanged(event.detail);
        });
    }

    init();

    window.QAProgress = {
        toast: toast,
        renderDashboard: renderDashboard,
        refresh: function () {
            return load().then(refreshAll);
        }
    };
})();
