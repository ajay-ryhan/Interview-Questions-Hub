
const categories = [
    {
        id: "qa",
        name: "What is QA?",
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

const homePage = document.getElementById("home-page");
const dashboardPage = document.getElementById("dashboard-page");

const startButton = document.getElementById("start-button");
const homeButton = document.getElementById("home-button");

const topicList = document.getElementById("topic-list");
const selectedTopic = document.getElementById("selected-topic");
const topicDescription = document.getElementById("topic-description");
const questionContainer = document.getElementById("question-container");

// Start dashboard
startButton.addEventListener("click", () => {
    homePage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");

    displayTopics();
    loadQuestions(categories[0]);
});

// Return home
homeButton.addEventListener("click", () => {
    dashboardPage.classList.add("hidden");
    homePage.classList.remove("hidden");
});

// Display sidebar topics
function displayTopics() {
    topicList.innerHTML = "";

    categories.forEach(category => {
        const button = document.createElement("button");

        button.className = "topic-button";
        button.textContent = `${category.icon} ${category.name}`;

        button.addEventListener("click", () => {
            loadQuestions(category);
        });

        topicList.appendChild(button);
    });
}

// Load questions
async function loadQuestions(category) {

    selectedTopic.textContent = category.name;
    topicDescription.textContent = category.description;

    document.querySelectorAll(".topic-button").forEach(button => {
        button.classList.toggle(
            "active",
            button.textContent.includes(category.name)
        );
    });

    questionContainer.textContent = "Loading questions...";

    try {
        const response = await fetch(`./data/${category.id}.json`);

        if (!response.ok) {
            throw new Error("Unable to load questions.");
        }

        const data = await response.json();

        displayQuestions(data.questions);

    } catch (error) {
        questionContainer.textContent =
            "Unable to load questions. Please try again.";

        console.error(error);
    }
}

// Helper to create text sections safely
function createSection(title, content) {

    if (!content) return null;

    const section = document.createElement("div");
    section.className = "detail-section";

    const heading = document.createElement("h4");
    heading.textContent = title;

    const paragraph = document.createElement("p");
    paragraph.textContent = content;

    section.append(heading, paragraph);

    return section;
}

// Display tags
function createTags(tags) {

    if (!Array.isArray(tags) || tags.length === 0) return null;

    const section = document.createElement("div");
    section.className = "detail-section";

    const heading = document.createElement("h4");
    heading.textContent = "Tags";

    const tagContainer = document.createElement("div");
    tagContainer.className = "tag-container";

    tags.forEach(tag => {
        const badge = document.createElement("span");
        badge.className = "tag-badge";
        badge.textContent = tag;

        tagContainer.appendChild(badge);
    });

    section.append(heading, tagContainer);

    return section;
}

// Display follow-up questions
function createFollowUps(questions) {

    if (!Array.isArray(questions) || questions.length === 0) return null;

    const section = document.createElement("div");
    section.className = "detail-section";

    const heading = document.createElement("h4");
    heading.textContent = "Follow-up Questions";

    const list = document.createElement("ol");
    list.className = "followup-list";

    questions.forEach(question => {
        const item = document.createElement("li");
        item.textContent = question;
        list.appendChild(item);
    });

    section.append(heading, list);

    return section;
}

// Display source links
function createSources(sources) {

    if (!Array.isArray(sources) || sources.length === 0) return null;

    const section = document.createElement("div");
    section.className = "detail-section";

    const heading = document.createElement("h4");
    heading.textContent = "Reference Sources";

    const list = document.createElement("ul");
    list.className = "source-list";

    sources.forEach(source => {

        if (!source.name || !source.url) return;

        let url;

        try {
            url = new URL(source.url);
        } catch {
            return;
        }

        if (!["http:", "https:"].includes(url.protocol)) return;

        const item = document.createElement("li");
        const link = document.createElement("a");

        link.textContent = source.name;
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        item.appendChild(link);
        list.appendChild(item);
    });

    if (list.children.length === 0) return null;

    section.append(heading, list);

    return section;
}

// Display all questions
function displayQuestions(questions) {

    questionContainer.innerHTML = "";

    if (!questions || questions.length === 0) {
        questionContainer.textContent = "No questions added yet.";
        return;
    }

    questions.forEach((item, index) => {

        const card = document.createElement("details");
        card.className = "question-card";

        // Question heading
        const summary = document.createElement("summary");

        const questionText = document.createElement("span");
        questionText.className = "question-text";

        questionText.textContent =
            `${item.id || index + 1}. ${item.question}`;

        const difficulty = document.createElement("small");
        difficulty.className = "difficulty-badge";
        difficulty.textContent = item.level || item.difficulty || "General";

        summary.append(questionText, difficulty);

        // Expanded answer content
        const answerSection = document.createElement("div");
        answerSection.className = "answer-section";

        const answer = createSection("Answer", item.answer);
        const explanation = createSection("Explanation", item.explanation);
        const example = createSection(
            "Real-Time Example",
            item.realTimeExample || item.example
        );

        if (answer) answerSection.appendChild(answer);
        if (explanation) answerSection.appendChild(explanation);
        if (example) answerSection.appendChild(example);

        const tags = createTags(item.tags);
        const followUps = createFollowUps(item.followUpQuestions);
        const sources = createSources(item.sources);

        if (tags) answerSection.appendChild(tags);
        if (followUps) answerSection.appendChild(followUps);
        if (sources) answerSection.appendChild(sources);

        card.append(summary, answerSection);

        questionContainer.appendChild(card);
    });
}
