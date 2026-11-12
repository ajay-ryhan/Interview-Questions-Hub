const categories = [
    {
        id: "qa",
        name: "QA Fundamentals",
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
   Sidebar
========================== */

function displayTopics() {

    topicList.innerHTML = "";

    categories.forEach(category => {

        const button =
            document.createElement("button");

        button.className =
            "topic-button";

        button.textContent =
            `${category.icon} ${category.name}`;

        button.addEventListener(
            "click",
            () => loadQuestions(category)
        );

        topicList.appendChild(button);
    });
}

/* ==========================
   Load Questions
========================== */

async function loadQuestions(category) {

    selectedTopic.textContent =
        category.name;

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
            throw new Error(
                "Unable to load questions."
            );
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

    let filteredQuestions =
        [...currentQuestions];

    const searchText =
        searchInput?.value
            .toLowerCase()
            .trim() || "";

    const difficulty =
        difficultyFilter?.value ||
        "all";

    /* Search */

    if (searchText) {

        filteredQuestions =
            filteredQuestions.filter(q => {

                const searchableText = [

                    q.question || "",

                    q.answer || "",

                    q.explanation || "",

                    ...(q.tags || [])

                ]
                    .join(" ")
                    .toLowerCase();

                return searchableText.includes(
                    searchText
                );
            });
    }

    /* Difficulty */

    if (
        difficulty &&
        difficulty !== "all"
    ) {

        filteredQuestions =
            filteredQuestions.filter(q => {

                const level =
                    q.difficulty ||
                    q.level ||
                    "";

                return (
                    level.toLowerCase() ===
                    difficulty.toLowerCase()
                );
            });
    }

    updateStats(filteredQuestions);

    displayQuestions(
        filteredQuestions
    );
}

function updateStats(questions) {

    const beginner =
        questions.filter(q =>
            (q.difficulty ||
                q.level ||
                "")
                .toLowerCase()
                .includes("beginner")
        ).length;

    const intermediate =
        questions.filter(q =>
            (q.difficulty ||
                q.level ||
                "")
                .toLowerCase()
                .includes(
                    "intermediate"
                )
        ).length;

    const advanced =
        questions.filter(q =>
            (q.difficulty ||
                q.level ||
                "")
                .toLowerCase()
                .includes("advanced")
        ).length;

    questionStats.innerHTML = `
        <strong>${questions.length}</strong> Questions |
        Beginner: ${beginner} |
        Intermediate: ${intermediate} |
        Advanced: ${advanced}
    `;
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
                document.createElement(
                    "small"
                );

            difficulty.className =
                "difficulty-badge";

            difficulty.textContent =
                item.difficulty ||
                item.level ||
                "General";

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


            /* ==========================
               Java Compiler Section
            ========================== */

            if (item.runnable && item.javaCode) {

                const codeSection =
                    document.createElement("div");

                codeSection.className = "code-section";

                codeSection.innerHTML = `
        <h4>Executable Java Example</h4>

        <pre class="code-block">
${escapeHtml(item.javaCode)}
        </pre>

        <button
            class="run-code-btn"
            data-question-id="${item.id}">
            ▶ Execute Code
        </button>

        <div
            id="output-${item.id}"
            class="output-panel">
            Click Execute Code
        </div>
    `;

                answerSection.appendChild(codeSection);
            }


            card.append(
                summary,
                answerSection
            );

            questionContainer.appendChild(
                card
            );
        }
    );

    document
        .querySelectorAll(".run-code-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                runJavaCode
            );

        });
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

async function runJavaCode(event) {

    const questionId =
        event.target.dataset.questionId;

    const question =
        currentQuestions.find(
            q => q.id == questionId
        );

    const outputPanel =
        document.getElementById(
            `output-${questionId}`
        );

    outputPanel.textContent =
        "Executing...";

    try {

        const response =
            await fetch(
                "/api/run-java",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        code:
                        question.javaCode
                    })
                }
            );

        const result =
            await response.json();

        outputPanel.textContent =
            result.output ||
            result.stdout ||
            result.stderr ||
            "No Output";

    } catch (error) {

        outputPanel.textContent =
            "Execution Failed";

        console.error(error);
    }
}