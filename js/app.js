(function () {
    "use strict";

    /* ==========================
       Topics
       Question categories first, then Qubiqode,
       and Downloadable Docs always last.
    ========================== */

    const categories = [
        {
            id: "qa",
            name: "QA Basics",
            description: "Manual testing fundamentals",
            icon: "🕵️",
            type: "questions"
        },
        {
            id: "manual-testing",
            name: "Manual Testing",
            description: "Testing fundamentals, test design, defects, automation strategy and real-world scenarios",
            icon: "📝",
            type: "questions"
        },
        {
            id: "selenium",
            name: "Selenium",
            description: "Web browser automation",
            icon: "🌐",
            type: "questions"
        },
        {
            id: "testng",
            name: "TestNG",
            description: "Test execution framework for Java",
            icon: "✅",
            type: "questions"
        },
        {
            id: "cucumber",
            name: "Cucumber",
            description: "BDD with Gherkin scenarios",
            icon: "🧩",
            type: "questions"
        },
        {
            id: "java",
            name: "Java",
            description: "Core Java programming",
            icon: "☕",
            type: "questions"
        },
        {
            id: "playwright",
            name: "Playwright",
            description: "Modern browser automation",
            icon: "🎭",
            type: "questions"
        },
        {
            id: "api",
            name: "API Testing",
            description: "API Fundamentals, REST, HTTP Methods, Authentication, API Test Strategy, REST Assured, Mocking, Postman & SoapUI",
            icon: "🔌",
            type: "questions"
        }
    ];

    const tools = [
        {
            id: "qubiqode",
            name: "Qubiqode",
            description: "Write, run and test code in multiple programming languages.",
            icon: "💻",
            type: "editor",
            meta: "Code editor"
        },
        {
            id: "docs",
            name: "Downloadable Docs",
            description: "Access and download useful QA learning materials.",
            icon: "📁",
            type: "docs",
            meta: "Study material"
        }
    ];

    const allTopics = categories.concat(tools);

    const THEME_KEY = "qa-hub-theme";

    const questionCache = {};

    let currentTopic = null;
    let currentQuestions = [];
    let loadToken = 0;

    /* ==========================
       Elements
    ========================== */

    const root = document.documentElement;

    const homeView = document.getElementById("home-view");
    const topicsView = document.getElementById("topics-view");
    const studyView = document.getElementById("study-view");

    const startButton = document.getElementById("start-button");
    const homeButton = document.getElementById("home-button");
    const backButton = document.getElementById("back-button");
    const brandLink = document.getElementById("brand-link");
    const themeToggle = document.getElementById("theme-toggle");
    const themeColorMeta = document.getElementById("theme-color-meta");
    const toTopButton = document.getElementById("to-top");

    const topicGrid = document.getElementById("topic-grid");
    const topicChips = document.getElementById("topic-chips");

    const selectedTopic = document.getElementById("selected-topic");
    const selectedTopicIcon = document.getElementById("selected-topic-icon");
    const topicDescription = document.getElementById("topic-description");

    const questionTools = document.getElementById("question-tools");
    const searchInput = document.getElementById("search-input");
    const difficultyFilter = document.getElementById("difficulty-filter");
    const subtopicFilter = document.getElementById("subtopic-filter");
    const expandToggle = document.getElementById("expand-toggle");
    const questionStats = document.getElementById("question-stats");
    const questionContainer = document.getElementById("question-container");

    /* ==========================
       Small helpers
    ========================== */

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = text;
        }

        return element;
    }

    function clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    function getLevel(item) {
        return String(item.level || item.difficulty || "").trim();
    }

    function levelClass(level) {
        const value = String(level || "").toLowerCase().trim();

        if (value === "beginner") {
            return "level-beginner";
        }

        if (value === "intermediate") {
            return "level-intermediate";
        }

        if (value === "expert" || value === "experienced") {
            return "level-expert";
        }

        return "level-general";
    }

    function showMessage(title, detail) {
        clearElement(questionContainer);

        const box = createElement("div", "state-message");
        box.appendChild(createElement("strong", null, title));

        if (detail) {
            box.appendChild(createElement("span", null, detail));
        }

        questionContainer.appendChild(box);

        return box;
    }

    /* ==========================
       Dark / Light Theme
    ========================== */

    function currentTheme() {
        return root.getAttribute("data-theme") === "light" ? "light" : "dark";
    }

    function applyTheme(theme) {
        const value = theme === "light" ? "light" : "dark";

        root.setAttribute("data-theme", value);
        document.body.dataset.theme = value;

        if (themeToggle) {
            const next = value === "dark" ? "light" : "dark";
            const label = "Switch to " + next + " theme";

            themeToggle.title = label;
            themeToggle.setAttribute("aria-label", label);
        }

        if (themeColorMeta) {
            themeColorMeta.setAttribute(
                "content",
                value === "dark" ? "#0b1020" : "#ffffff"
            );
        }

        try {
            localStorage.setItem(THEME_KEY, value);
        } catch (error) {
            /* storage not available: the theme still applies for this visit */
        }

        // Tell the embedded code editor, if it is open
        const frame = document.querySelector(".qubiqode-frame");

        if (frame && frame.contentWindow) {
            try {
                frame.contentWindow.postMessage(
                    { type: "qa-hub-theme", theme: value },
                    "*"
                );
            } catch (error) {
                /* the frame will pick the theme up from storage instead */
            }
        }
    }

    applyTheme(currentTheme());

    if (themeToggle) {
        themeToggle.addEventListener("click", function () {
            applyTheme(currentTheme() === "dark" ? "light" : "dark");
        });
    }

    /* ==========================
       Views and navigation
       The address hash keeps the browser Back
       button working on desktop and mobile.
    ========================== */

    function showView(name) {
        homeView.hidden = name !== "home";
        topicsView.hidden = name !== "topics";
        studyView.hidden = name !== "study";

        homeButton.hidden = name === "home";

        window.scrollTo(0, 0);
    }

    function goTo(hash) {
        if (window.location.hash === "#" + hash) {
            route();
        } else {
            window.location.hash = hash;
        }
    }

    function route() {
        const hash = window.location.hash.replace(/^#\/?/, "");

        if (!hash || hash === "home") {
            currentTopic = null;
            showView("home");
            return;
        }

        if (hash === "topics") {
            currentTopic = null;
            showView("topics");
            return;
        }

        const topic = allTopics.filter(function (item) {
            return item.id === hash;
        })[0];

        if (topic) {
            openTopic(topic);
        } else {
            showView("topics");
        }
    }

    startButton.addEventListener("click", function () {
        goTo("topics");
    });

    homeButton.addEventListener("click", function () {
        goTo("home");
    });

    backButton.addEventListener("click", function () {
        goTo("topics");
    });

    brandLink.addEventListener("click", function (event) {
        event.preventDefault();
        goTo("home");
    });

    window.addEventListener("hashchange", route);

    /* ==========================
       Topic grid
    ========================== */

    function renderTopicGrid() {
        clearElement(topicGrid);

        allTopics.forEach(function (topic) {
            const card = createElement("button", "topic-card");
            card.type = "button";

            if (topic.type !== "questions") {
                card.classList.add("is-tool");
            }

            const icon = createElement("span", "topic-card-icon", topic.icon);
            icon.setAttribute("aria-hidden", "true");

            const name = createElement("span", "topic-card-name", topic.name);
            const description = createElement(
                "span",
                "topic-card-description",
                topic.description
            );

            const meta = createElement("span", "topic-card-meta");
            const count = createElement(
                "span",
                "topic-card-count",
                topic.meta || "Loading..."
            );
            const arrow = createElement("span", "topic-card-arrow", "→");
            arrow.setAttribute("aria-hidden", "true");

            meta.appendChild(count);
            meta.appendChild(arrow);

            card.appendChild(icon);
            card.appendChild(name);
            card.appendChild(description);
            card.appendChild(meta);

            card.addEventListener("click", function () {
                goTo(topic.id);
            });

            topicGrid.appendChild(card);

            if (topic.type === "questions") {
                fetchQuestions(topic.id)
                    .then(function (questions) {
                        count.textContent =
                            questions.length +
                            (questions.length === 1 ? " question" : " questions");
                    })
                    .catch(function () {
                        count.textContent = "Open";
                    });
            }
        });
    }

    function renderTopicChips(activeId) {
        clearElement(topicChips);

        allTopics.forEach(function (topic) {
            const chip = createElement(
                "button",
                "topic-chip",
                topic.icon + " " + topic.name
            );
            chip.type = "button";

            if (topic.id === activeId) {
                chip.classList.add("active");
                chip.setAttribute("aria-current", "page");
            }

            chip.addEventListener("click", function () {
                goTo(topic.id);
            });

            topicChips.appendChild(chip);
        });

        const active = topicChips.querySelector(".active");

        if (active && typeof active.scrollIntoView === "function") {
            try {
                active.scrollIntoView({ block: "nearest", inline: "center" });
            } catch (error) {
                /* older browsers: the chip row can still be scrolled by hand */
            }
        }
    }

    /* ==========================
       Load Questions
    ========================== */

    function fetchQuestions(id) {
        if (questionCache[id]) {
            return Promise.resolve(questionCache[id]);
        }

        return fetch("./data/" + id + ".json")
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Unable to load " + id);
                }

                return response.json();
            })
            .then(function (data) {
                const questions = Array.isArray(data.questions)
                    ? data.questions
                    : [];

                questionCache[id] = questions;

                return questions;
            });
    }

    function openTopic(topic) {
        const token = ++loadToken;

        currentTopic = topic;
        currentQuestions = [];

        showView("study");
        renderTopicChips(topic.id);

        selectedTopic.textContent = topic.name;
        selectedTopicIcon.textContent = topic.icon;
        topicDescription.textContent = topic.description;

        questionContainer.className = "question-container";
        clearElement(questionStats);

        if (topic.type === "editor") {
            questionTools.hidden = true;
            questionStats.hidden = true;
            showQubiqode();
            return;
        }

        if (topic.type === "docs") {
            questionTools.hidden = true;
            questionStats.hidden = true;
            showDocuments(token);
            return;
        }

        questionTools.hidden = false;
        questionStats.hidden = false;

        resetFilterControls();
        showMessage("Loading questions...");

        fetchQuestions(topic.id)
            .then(function (questions) {
                if (token !== loadToken) {
                    return;
                }

                currentQuestions = questions;

                fillSubtopicFilter(questions);
                applyFilters();
            })
            .catch(function (error) {
                console.error(error);

                if (token !== loadToken) {
                    return;
                }

                showMessage(
                    "Unable to load questions.",
                    "Please check your connection and try again."
                );
            });
    }

    /* ==========================
       Search + Filters
    ========================== */

    function resetFilterControls() {
        searchInput.value = "";
        difficultyFilter.value = "all";

        clearElement(subtopicFilter);

        const all = createElement("option", null, "All Sections");
        all.value = "all";
        subtopicFilter.appendChild(all);
        subtopicFilter.value = "all";
        subtopicFilter.hidden = true;

        expandToggle.textContent = "Expand all";
    }

    function fillSubtopicFilter(questions) {
        const seen = [];

        questions.forEach(function (item) {
            const topic = String(item.topic || "").trim();

            if (topic && seen.indexOf(topic) === -1) {
                seen.push(topic);
            }
        });

        seen.forEach(function (topic) {
            const option = createElement("option", null, topic);
            option.value = topic;
            subtopicFilter.appendChild(option);
        });

        // Only useful when there is more than one section
        subtopicFilter.hidden = seen.length < 2;
    }

    function searchableText(item) {
        return [
            item.question,
            item.answer,
            item.explanation,
            item.realTimeExample,
            item.example,
            item.topic,
            item.javaCode,
            item.code
        ]
            .concat(item.buzzWords || [])
            .concat(item.tags || [])
            .filter(function (value) {
                return typeof value === "string" && value.length > 0;
            })
            .join(" ")
            .toLowerCase();
    }

    function applyFilters() {
        if (!currentTopic || currentTopic.type !== "questions") {
            return;
        }

        const words = searchInput.value
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .filter(function (word) {
                return word.length > 0;
            });

        const level = difficultyFilter.value.toLowerCase().trim();
        const subtopic = subtopicFilter.value;

        const filtered = currentQuestions.filter(function (item) {
            if (level !== "all" && getLevel(item).toLowerCase() !== level) {
                return false;
            }

            if (
                subtopic !== "all" &&
                String(item.topic || "").trim() !== subtopic
            ) {
                return false;
            }

            if (words.length > 0) {
                const text = searchableText(item);

                // Every typed word must appear somewhere in the question
                for (let i = 0; i < words.length; i++) {
                    if (text.indexOf(words[i]) === -1) {
                        return false;
                    }
                }
            }

            return true;
        });

        updateStats(filtered);
        displayQuestions(filtered);
    }

    function filtersAreActive() {
        return (
            searchInput.value.trim() !== "" ||
            difficultyFilter.value !== "all" ||
            subtopicFilter.value !== "all"
        );
    }

    function clearFilters() {
        searchInput.value = "";
        difficultyFilter.value = "all";
        subtopicFilter.value = "all";

        applyFilters();
    }

    function updateStats(questions) {
        clearElement(questionStats);

        const counts = { beginner: 0, intermediate: 0, expert: 0 };

        questions.forEach(function (item) {
            const level = getLevel(item).toLowerCase();

            if (level === "beginner") {
                counts.beginner++;
            } else if (level === "intermediate") {
                counts.intermediate++;
            } else if (level === "expert" || level === "experienced") {
                counts.expert++;
            }
        });

        const summary = createElement("span");
        summary.appendChild(document.createTextNode("Showing "));
        summary.appendChild(createElement("strong", null, String(questions.length)));
        summary.appendChild(
            document.createTextNode(
                " of " + currentQuestions.length + " questions"
            )
        );
        questionStats.appendChild(summary);

        [
            ["Beginner", counts.beginner],
            ["Intermediate", counts.intermediate],
            ["Expert", counts.expert]
        ].forEach(function (entry) {
            if (entry[1] > 0) {
                questionStats.appendChild(
                    createElement(
                        "span",
                        "stat-pill " + levelClass(entry[0]),
                        entry[0] + " " + entry[1]
                    )
                );
            }
        });

        if (filtersAreActive()) {
            const clear = createElement("button", "link-button", "Clear filters");
            clear.type = "button";
            clear.addEventListener("click", clearFilters);
            questionStats.appendChild(clear);
        }
    }

    /* ==========================
       Reusable Sections
    ========================== */

    function createSection(title, content, extraClass) {
        if (!content) {
            return null;
        }

        const section = createElement(
            "div",
            "detail-section" + (extraClass ? " " + extraClass : "")
        );

        section.appendChild(createElement("h4", null, title));
        section.appendChild(createElement("p", null, content));

        return section;
    }

    function copyText(text, button) {
        function done(success) {
            const original = "Copy";

            button.textContent = success ? "Copied" : "Copy failed";

            window.setTimeout(function () {
                button.textContent = original;
            }, 1500);
        }

        function fallback() {
            const area = document.createElement("textarea");

            area.value = text;
            area.setAttribute("readonly", "");
            area.style.position = "fixed";
            area.style.top = "-1000px";

            document.body.appendChild(area);
            area.select();

            let success;

            try {
                success = document.execCommand("copy");
            } catch (error) {
                success = false;
            }

            document.body.removeChild(area);
            done(success);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(
                function () {
                    done(true);
                },
                fallback
            );
        } else {
            fallback();
        }
    }

    function createCodeSection(title, content, isOutput) {
        if (!content) {
            return null;
        }

        const section = createElement("div", "detail-section code-section");

        const heading = createElement("div", "code-heading");
        heading.appendChild(createElement("h4", null, title));

        if (!isOutput) {
            const copy = createElement("button", "copy-button", "Copy");
            copy.type = "button";
            copy.addEventListener("click", function () {
                copyText(content, copy);
            });
            heading.appendChild(copy);
        }

        const block = createElement(
            "pre",
            "code-block" + (isOutput ? " output-block" : "")
        );
        block.setAttribute("tabindex", "0");
        block.appendChild(createElement("code", null, content));

        section.appendChild(heading);
        section.appendChild(block);

        return section;
    }

    function createBadgeSection(title, values) {
        if (!Array.isArray(values) || values.length === 0) {
            return null;
        }

        const section = createElement("div", "detail-section");
        section.appendChild(createElement("h4", null, title));

        const container = createElement("div", "tag-container");

        values.forEach(function (value) {
            container.appendChild(createElement("span", "tag-badge", value));
        });

        section.appendChild(container);

        return section;
    }

    function createFollowUps(questions) {
        if (!Array.isArray(questions) || questions.length === 0) {
            return null;
        }

        const section = createElement("div", "detail-section");
        section.appendChild(createElement("h4", null, "Follow-up Questions"));

        const list = createElement("ol", "followup-list");

        questions.forEach(function (question) {
            list.appendChild(createElement("li", null, question));
        });

        section.appendChild(list);

        return section;
    }

    function createSources(sources) {
        if (!Array.isArray(sources) || sources.length === 0) {
            return null;
        }

        const list = createElement("ul", "source-list");

        sources.forEach(function (source) {
            if (!source || !source.name || !source.url) {
                return;
            }

            let url;

            try {
                url = new URL(source.url);
            } catch (error) {
                return;
            }

            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return;
            }

            const item = createElement("li");
            const link = createElement("a", null, source.name);

            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            item.appendChild(link);
            list.appendChild(item);
        });

        if (list.children.length === 0) {
            return null;
        }

        const section = createElement("div", "detail-section");
        section.appendChild(createElement("h4", null, "Reference Sources"));
        section.appendChild(list);

        return section;
    }

    /* ==========================
       Render Questions
    ========================== */

    function createQuestionCard(item, index) {
        const card = createElement("details", "question-card");

        const summaryElement = createElement("summary");

        // The row lives inside the summary because some browsers
        // do not lay out a <summary> itself as a flex container.
        const summary = createElement("span", "summary-row");
        summaryElement.appendChild(summary);

        summary.appendChild(
            createElement("span", "question-number", String(item.id || index + 1))
        );

        const main = createElement("span", "question-main");
        main.appendChild(createElement("span", "question-text", item.question));

        const meta = createElement("span", "question-meta");
        const level = getLevel(item) || "General";

        meta.appendChild(
            createElement("span", "difficulty-badge " + levelClass(level), level)
        );

        if (item.topic) {
            meta.appendChild(createElement("span", "topic-label", item.topic));
        }

        main.appendChild(meta);
        summary.appendChild(main);

        const chevron = createElement("span", "question-chevron", "▾");
        chevron.setAttribute("aria-hidden", "true");
        summary.appendChild(chevron);

        card.appendChild(summaryElement);

        const answerSection = createElement("div", "answer-section");

        [
            createSection("Answer", item.answer),
            createSection("Explanation", item.explanation),
            createSection(
                "Real-Time Example",
                item.realTimeExample || item.example,
                "example-section"
            ),
            createCodeSection("Code", item.javaCode || item.code, false),
            createCodeSection("Expected Output", item.expectedOutput, true),
            createBadgeSection("Tags", item.tags),
            createBadgeSection("🧠 Remember These Keywords", item.buzzWords),
            createFollowUps(item.followUpQuestions),
            createSources(item.sources)
        ].forEach(function (section) {
            if (section) {
                answerSection.appendChild(section);
            }
        });

        card.appendChild(answerSection);

        return card;
    }

    function displayQuestions(questions) {
        expandToggle.textContent = "Expand all";

        if (!questions || questions.length === 0) {
            const box = showMessage(
                "No matching questions found.",
                "Try a different search word or clear the filters."
            );

            if (filtersAreActive()) {
                const clear = createElement("button", "btn btn-ghost", "Clear filters");
                clear.type = "button";
                clear.style.marginTop = "16px";
                clear.addEventListener("click", clearFilters);
                box.appendChild(clear);
            }

            return;
        }

        clearElement(questionContainer);

        const fragment = document.createDocumentFragment();

        questions.forEach(function (item, index) {
            fragment.appendChild(createQuestionCard(item, index));
        });

        questionContainer.appendChild(fragment);
    }

    /* ==========================
       Downloadable Documents
    ========================== */

    function showDocuments(token) {
        showMessage("Loading documents...");

        fetch("./docs.json")
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Unable to load documents");
                }

                return response.json();
            })
            .then(function (data) {
                if (token !== loadToken) {
                    return;
                }

                const documents = Array.isArray(data.documents)
                    ? data.documents
                    : [];

                if (documents.length === 0) {
                    showMessage("No documents available yet.");
                    return;
                }

                clearElement(questionContainer);
                questionContainer.className = "docs-grid";

                documents.forEach(function (doc) {
                    if (!doc || !doc.file) {
                        return;
                    }

                    const card = createElement("div", "download-doc-card");

                    card.appendChild(
                        createElement("span", "doc-type", doc.type || "FILE")
                    );
                    card.appendChild(
                        createElement("h3", null, "📄 " + (doc.name || doc.file))
                    );

                    if (doc.description) {
                        card.appendChild(createElement("p", null, doc.description));
                    }

                    const filePath =
                        "./docs/" +
                        doc.file
                            .split("/")
                            .map(encodeURIComponent)
                            .join("/");

                    /* View */

                    const viewLink =
                        createElement(
                            "a",
                            "view-btn",
                            "👁 View"
                        );

                    viewLink.href =
                        "./viewer.html?file=" +
                        encodeURIComponent(doc.file);

                    viewLink.target = "_blank";

                    /* Download */

                    const downloadLink =
                        createElement(
                            "a",
                            "download-btn",
                            "↓ Download"
                        );

                    downloadLink.href =
                        filePath;

                    downloadLink.download =
                        doc.file
                            .split("/")
                            .pop();

                    /* Actions */

                    const actions =
                        createElement("div", "document-actions");

                    actions.appendChild(viewLink);
                    actions.appendChild(downloadLink);

                    card.appendChild(actions);

                    questionContainer.appendChild(card);
                });
            })
            .catch(function (error) {
                console.error(error);

                if (token !== loadToken) {
                    return;
                }

                showMessage(
                    "Unable to load documents.",
                    "Please try again."
                );
            });
    }

    /* ==========================
       Qubiqode
    ========================== */

    function showQubiqode() {
        clearElement(questionContainer);

        const frame = createElement("iframe", "qubiqode-frame");

        frame.src = "./qubiqode/index.html";
        frame.title = "Qubiqode Online Code Editor";
        frame.setAttribute("allowfullscreen", "");

        questionContainer.appendChild(frame);
    }

    /* ==========================
       Events
    ========================== */

    searchInput.addEventListener("input", applyFilters);
    searchInput.addEventListener("search", applyFilters);
    difficultyFilter.addEventListener("change", applyFilters);
    subtopicFilter.addEventListener("change", applyFilters);

    expandToggle.addEventListener("click", function () {
        const cards = questionContainer.querySelectorAll(".question-card");
        const expand = expandToggle.textContent === "Expand all";

        for (let i = 0; i < cards.length; i++) {
            cards[i].open = expand;
        }

        expandToggle.textContent = expand ? "Collapse all" : "Expand all";
    });

    window.addEventListener(
        "scroll",
        function () {
            const scrolled =
                window.pageYOffset || document.documentElement.scrollTop || 0;

            toTopButton.hidden = scrolled < 600;
        },
        { passive: true }
    );

    toTopButton.addEventListener("click", function () {
        try {
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            window.scrollTo(0, 0);
        }
    });

    /* ==========================
       Start
    ========================== */

    renderTopicGrid();
    route();
})();
