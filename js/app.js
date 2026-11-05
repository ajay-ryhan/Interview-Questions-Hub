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


startButton.addEventListener("click", () => {
    homePage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");

    displayTopics();
    loadQuestions(categories[0]);
});

homeButton.addEventListener("click", () => {
    dashboardPage.classList.add("hidden");
    homePage.classList.remove("hidden");
});


function displayTopics() {
    topicList.innerHTML = "";

    categories.forEach(category => {
        const button = document.createElement("button");

        button.className = "topic-button";
        button.textContent = `${category.icon}  ${category.name}`;

        button.addEventListener("click", () => {
            loadQuestions(category);
        });

        topicList.appendChild(button);
    });
}


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


function displayQuestions(questions) {

    questionContainer.innerHTML = "";

    if (!questions || questions.length === 0) {
        questionContainer.textContent = "No questions added yet.";
        return;
    }

    questions.forEach((item, index) => {

        const card = document.createElement("details");
        card.className = "question-card";

        const summary = document.createElement("summary");

        const questionText = document.createElement("span");
        questionText.textContent = `${index + 1}. ${item.question}`;

        const difficulty = document.createElement("small");
        difficulty.textContent = item.difficulty || "General";

        summary.append(questionText, difficulty);

        const answerSection = document.createElement("div");
        answerSection.className = "answer-section";

        const answer = document.createElement("p");
        answer.textContent = item.answer;

        answerSection.appendChild(answer);

        if (item.example) {
            const code = document.createElement("pre");
            const codeText = document.createElement("code");

            codeText.textContent = item.example;

            code.appendChild(codeText);
            answerSection.appendChild(code);
        }

        card.append(summary, answerSection);
        questionContainer.appendChild(card);
    });
}