const categories = [
    {
        id: "qa",
        name: "QA Basics",
        description: "Manual testing fundamentals",
        icon: "🧪"
    },
    {
        id: "selenium",
        name: "Selenium",
        description: "Web browser automation",
        icon: "🌐"
    },
    {
        id: "java",
        name: "Java",
        description: "Core Java programming",
        icon: "☕"
    },
    {
        id: "playwright",
        name: "Playwright",
        description: "Modern browser automation",
        icon: "🎭"
    }
];

let currentQuestions = [];

const homePage = document.getElementById("home-page");
const dashboardPage = document.getElementById("dashboard-page");

const startButtons = document.querySelectorAll(
    "#start-button, #start-learning"
);

const homeButton = document.getElementById("home-button");

const topicList = document.getElementById("topic-list");

const selectedTopic =
    document.getElementById("selected-topic");

const topicDescription =
    document.getElementById("topic-description");

const questionContainer =
    document.getElementById("question-container");

const searchInput =
    document.getElementById("search-input");

const difficultyFilter =
    document.getElementById("difficulty-filter");

const questionStats =
    document.getElementById("question-stats");

/* ==========================
   Navigation
========================== */

function openDashboard() {
    homePage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");

    displayTopics();

    if (categories.length > 0) {
        loadQuestions(categories[0]);
    }
}

function goHome() {
    dashboardPage.classList.add("hidden");
    homePage.classList.remove("hidden");
}

startButtons.forEach(button => {
    button.addEventListener(
        "click",
        openDashboard
    );
});

homeButton.addEventListener(
    "click",
    goHome
);

/* ==========================
   Dark / Light Theme
========================== */

const themeToggle =
    document.getElementById("theme-toggle");

function applyTheme(theme) {

    document.body.dataset.theme = theme;

    if (themeToggle) {

        if (theme === "dark") {
            themeToggle.textContent = "☀️";
            themeToggle.title = "Switch to light theme";
            themeToggle.setAttribute(
                "aria-label",
                "Switch to light theme"
            );
        } else {
            themeToggle.textContent = "🌙";
            themeToggle.title = "Switch to dark theme";
            themeToggle.setAttribute(
                "aria-label",
                "Switch to dark theme"
            );
        }
    }

    localStorage.setItem("qa-hub-theme", theme);
}

// Restore saved theme; default is dark

const savedTheme =
    localStorage.getItem("qa-hub-theme") || "dark";

applyTheme(savedTheme);

// Switch theme when clicked

if (themeToggle) {
    themeToggle.addEventListener("click", () => {

        const currentTheme =
            document.body.dataset.theme || "dark";

        const newTheme =
            currentTheme === "dark" ? "light" : "dark";

        applyTheme(newTheme);
    });
}

/* ==========================
   Sidebar
========================== */

function displayTopics() {

    topicList.innerHTML = "";

    categories.forEach(category => {

        const button = document.createElement("button");

        button.className = "topic-button";
        button.textContent = `${category.icon} ${category.name}`;

        button.addEventListener("click", () => loadQuestions(category));

        topicList.appendChild(button);
    });

    // Downloadable Docs button

    const docsButton = document.createElement("button");

    docsButton.className = "topic-button";
    docsButton.textContent = "📁 Downloadable Docs";

    docsButton.addEventListener("click", showDocuments);

    topicList.appendChild(docsButton);

    const qubiqodeButton = document.createElement("button");
    qubiqodeButton.textContent = "💻 Qubiqode";
    qubiqodeButton.addEventListener("click", () => {
        window.location.href = "./qubiqode/index.html";
    });
    topicList.appendChild(qubiqodeButton);
}

/* ==========================
   Downloadable Documents
========================== */

async function showDocuments() {

    selectedTopic.textContent = "Downloadable Docs";

    topicDescription.textContent =
        "Access and download useful QA learning materials.";

    document.querySelectorAll(".topic-button")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.textContent.includes("Downloadable Docs")
            );
        });

    document.querySelector(".question-tools").style.display = "none";
    questionStats.style.display = "none";

    questionContainer.innerHTML = "Loading documents...";

    try {

        const response = await fetch("./docs.json");

        if (!response.ok) {
            questionContainer.textContent =
                "Unable to load documents.";
            return;
        }

        const data = await response.json();

        questionContainer.innerHTML = "";

        data.documents.forEach(doc => {

            const card = document.createElement("div");
            card.className = "download-doc-card";

            const name = document.createElement("h3");
            name.textContent = "📄 " + doc.name;

            const description = document.createElement("p");
            description.textContent = doc.description;

            const type = document.createElement("span");
            type.textContent = doc.type;

            const link = document.createElement("a");
            link.href = "./docs/" +
                doc.file.split("/").map(encodeURIComponent).join("/");
            link.download = doc.file.split("/").pop();
            link.className = "download-btn";
            link.textContent = "↓ Download";

            card.append(name, description, type, link);

            questionContainer.appendChild(card);
        });

    } catch (error) {

        console.error(error);

        questionContainer.textContent =
            "Unable to load documents. Please try again.";
    }
}

/* ==========================
   Load Questions
========================== */

async function loadQuestions(category) {

    selectedTopic.textContent =
        category.name;

    document.querySelector(".question-tools").style.display = "flex";
    questionStats.style.display = "";

    topicDescription.textContent =
        category.description;

    document
        .querySelectorAll(".topic-button")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.textContent.includes(
                    category.name
                )
            );

        });

    questionContainer.innerHTML =
        "<p>Loading questions...</p>";

    try {

        const response =
            await fetch(
                `./data/${category.id}.json`
            );

        if (!response.ok) {
            questionContainer.innerHTML =
                "<p>Unable to load questions.</p>";
            return;
        }

        const data =
            await response.json();

        currentQuestions =
            data.questions || [];

        if (searchInput) {
            searchInput.value = "";
        }

        if (difficultyFilter) {
            difficultyFilter.value = "all";
        }

        applyFilters();

    } catch (error) {

        console.error(error);

        questionContainer.innerHTML =
            "<p>Unable to load questions.</p>";
    }
}

/* ==========================
   Search + Filters
========================== */


function applyFilters() {

    let filteredQuestions = [...currentQuestions];

    const searchText =
        searchInput?.value.toLowerCase().trim() || "";

    const difficulty =
        (difficultyFilter?.value || "all").toLowerCase().trim();

    /* Search */
    if (searchText) {

        filteredQuestions = filteredQuestions.filter(q => {

            const searchableText = [
                q.question || "",
                q.answer || "",
                q.explanation || "",
                ...(q.tags || [])
            ]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(searchText);
        });
    }

    /* Difficulty */

    if (difficulty !== "all") {

        filteredQuestions =
            filteredQuestions.filter(q => {

                const level = (
                    q.level || ""
                ).toLowerCase().trim();

                return level === difficulty;
            });
    }
    updateStats(filteredQuestions);
    displayQuestions(filteredQuestions);
}


function updateStats(questions) {

    let beginner = 0;
    let intermediate = 0;
    let expert = 0;

    questions.forEach(item => {

        const level = (
            item.level || ""
        ).toLowerCase().trim();

        if (level === "beginner") {
            beginner++;
        } else if (level === "intermediate") {
            intermediate++;
        } else if (
            level === "expert" ||
            level === "experienced"
        ) {
            expert++;
        }

    });

}

/* ==========================
   Reusable Sections
========================== */

function createSection(
    title,
    content
) {

    if (!content) return null;

    const section =
        document.createElement("div");

    section.className =
        "detail-section";

    const heading =
        document.createElement("h4");

    heading.textContent = title;

    const paragraph =
        document.createElement("p");

    paragraph.textContent = content;

    section.append(
        heading,
        paragraph
    );

    return section;
}


/* ==========================
   Tags
========================== */

function createTags(tags) {

    if (!Array.isArray(tags) || tags.length === 0) {
        return null;
    }

    const section = document.createElement("div");
    section.className = "detail-section";

    const heading = document.createElement("h4");
    heading.textContent = "Tags";

    const container = document.createElement("div");
    container.className = "tag-container";

    tags.forEach(tag => {
        const badge = document.createElement("span");
        badge.className = "tag-badge";
        badge.textContent = tag;
        container.appendChild(badge);
    });

    section.append(heading, container);
    return section;
}

/* ==========================
   Buzz Words
========================== */

function createBuzzWords(buzzWords) {

    if (!Array.isArray(buzzWords) || buzzWords.length === 0) {
        return null;
    }

    const section = document.createElement("div");
    section.className = "detail-section";

    const heading = document.createElement("h4");
    heading.textContent = "🧠 Remember These Keywords";

    const container = document.createElement("div");
    container.className = "tag-container";

    buzzWords.forEach(word => {
        const badge = document.createElement("span");
        badge.className = "tag-badge";
        badge.textContent = word;
        container.appendChild(badge);
    });

    section.append(heading, container);
    return section;
}

/* ==========================
   Follow-up Questions
========================== */

function createFollowUps(
    questions
) {

    if (
        !Array.isArray(questions) ||
        questions.length === 0
    ) {
        return null;
    }

    const section =
        document.createElement("div");

    section.className =
        "detail-section";

    const heading =
        document.createElement("h4");

    heading.textContent =
        "Follow-up Questions";

    const list =
        document.createElement("ol");

    list.className =
        "followup-list";

    questions.forEach(question => {

        const item =
            document.createElement("li");

        item.textContent =
            question;

        list.appendChild(item);
    });

    section.append(
        heading,
        list
    );

    return section;
}

/* ==========================
   Sources
========================== */

function createSources(
    sources
) {

    if (
        !Array.isArray(sources) ||
        sources.length === 0
    ) {
        return null;
    }

    const section =
        document.createElement("div");

    section.className =
        "detail-section";

    const heading =
        document.createElement("h4");

    heading.textContent =
        "Reference Sources";

    const list =
        document.createElement("ul");

    list.className =
        "source-list";

    sources.forEach(source => {

        if (
            !source.name ||
            !source.url
        ) {
            return;
        }

        let url;

        try {
            url = new URL(
                source.url
            );
        } catch {
            return;
        }

        const item =
            document.createElement("li");

        const link =
            document.createElement("a");

        link.href = url.href;
        link.target = "_blank";

        link.rel =
            "noopener noreferrer";

        link.textContent =
            source.name;

        item.appendChild(link);

        list.appendChild(item);
    });

    if (
        list.children.length === 0
    ) {
        return null;
    }

    section.append(
        heading,
        list
    );

    return section;
}

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

/* ==========================
   Render Questions
========================== */

function displayQuestions(
    questions
) {

    questionContainer.innerHTML =
        "";

    if (
        !questions ||
        questions.length === 0
    ) {

        questionContainer.innerHTML =
            `
            <p>
                No matching questions found.
            </p>
        `;

        return;
    }

    questions.forEach(
        (item, index) => {

            const card =
                document.createElement(
                    "details"
                );

            card.className =
                "question-card";

            const summary =
                document.createElement(
                    "summary"
                );

            const questionText =
                document.createElement(
                    "span"
                );

            questionText.className =
                "question-text";

            questionText.textContent =
                `${item.id || index + 1}. ${item.question}`;


            const difficulty =
                document.createElement("small");

            difficulty.className = "difficulty-badge";

            const difficultyLevel = (
                item.level || "General"
            ).toLowerCase().trim();

            if (difficultyLevel === "beginner") {
                difficulty.classList.add("beginner");
            } else if (difficultyLevel === "intermediate") {
                difficulty.classList.add("intermediate");
            } else if (difficultyLevel === "expert") {
                difficulty.classList.add("expert");
            }

            difficulty.textContent = item.level || "General";

            summary.append(
                questionText,
                difficulty
            );

            const answerSection =
                document.createElement(
                    "div"
                );

            answerSection.className =
                "answer-section";

            const answer =
                createSection(
                    "Answer",
                    item.answer
                );

            const explanation =
                createSection(
                    "Explanation",
                    item.explanation
                );

            const example =
                createSection(
                    "Real-Time Example",
                    item.realTimeExample ||
                    item.example
                );

            if (answer)
                answerSection.appendChild(
                    answer
                );

            if (explanation)
                answerSection.appendChild(
                    explanation
                );

            if (example)
                answerSection.appendChild(
                    example
                );

            const tags =
                createTags(item.tags);

            const followUps =
                createFollowUps(
                    item.followUpQuestions
                );

            const sources =
                createSources(
                    item.sources
                );

            if (tags)
                answerSection.appendChild(
                    tags
                );

            // Display Buzz Words
            const buzzWords =
                createBuzzWords(item.buzzWords);

            if (buzzWords)
                answerSection.appendChild(
                    buzzWords
                );

            if (followUps)
                answerSection.appendChild(
                    followUps
                );

            if (sources)
                answerSection.appendChild(
                    sources
                );

            card.append(
                summary,
                answerSection
            );

            questionContainer.appendChild(
                card
            );
        }
    );
}

/* ==========================
   Events
========================== */

if (searchInput) {
    searchInput.addEventListener(
        "input",
        applyFilters
    );
}

if (difficultyFilter) {
    difficultyFilter.addEventListener(
        "change",
        applyFilters
    );
}