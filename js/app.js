const categories = [
    {
        id: "selenium",
        name: "Selenium",
        icon: "🌐",
        description: "Web browser automation"
    },
    {
        id: "java",
        name: "Java",
        icon: "☕",
        description: "Core Java programming"
    },
    {
        id: "playwright",
        name: "Playwright",
        icon: "🎭",
        description: "Modern browser automation"
    },
    {
        id: "qa",
        name: "What is QA?",
        icon: "🧪",
        description: "Manual testing fundamentals"
    }
];

const categoryContainer = document.getElementById("category-container");
const questionContainer = document.getElementById("question-container");

function displayCategories() {
    categoryContainer.innerHTML = "";

    categories.forEach(category => {
        const card = document.createElement("div");
        card.className = "category-card";

        card.innerHTML = `
            <h2>${category.icon}</h2>
            <h3>${category.name}</h3>
            <p>${category.description}</p>
            <small>Explore Questions →</small>
        `;

        card.addEventListener("click", () => {
            loadCategoryQuestions(category);
        });

        categoryContainer.appendChild(card);
    });
}

async function loadCategoryQuestions(category) {
    questionContainer.innerHTML = "<p>Loading questions...</p>";

    try {
        const response = await fetch(`./data/${category.id}.json`);

        if (!response.ok) {
            throw new Error("Unable to load questions.");
        }

        const data = await response.json();

        displayQuestions(category, data.questions);

    } catch (error) {
        questionContainer.textContent = "Unable to load questions. Please try again.";
        console.error(error);
    }
}

function displayQuestions(category, questions) {
    questionContainer.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = `${category.name} – ${questions.length} Questions`;
    questionContainer.appendChild(heading);

    questions.forEach(item => {
        const card = document.createElement("details");
        card.className = "question-card";

        const question = document.createElement("summary");
        question.textContent = item.question;

        const answer = document.createElement("p");
        answer.textContent = item.answer;

        card.append(question, answer);

        if (item.example) {
            const code = document.createElement("pre");
            const codeText = document.createElement("code");

            codeText.textContent = item.example;
            code.appendChild(codeText);
            card.appendChild(code);
        }

        questionContainer.appendChild(card);
    });
}

displayCategories();