
const categories = [
    {
        name: "Selenium",
        description: "Web browser automation",
        icon: "🌐",
        count: "Coming soon"
    },
    {
        name: "Java",
        description: "Core Java programming",
        icon: "☕",
        count: "Coming soon"
    },
    {
        name: "Playwright",
        description: "Modern browser automation",
        icon: "🎭",
        count: "Coming soon"
    },
    {
        name: "What is QA?",
        description: "Manual testing fundamentals",
        icon: "🧪",
        count: "Coming soon"
    }
];

const categoryContainer = document.getElementById("category-container");

function displayCategories() {
    categoryContainer.innerHTML = "";

    categories.forEach(category => {
        const card = document.createElement("div");

        card.className = "category-card";

        card.innerHTML = `
            <h2>${category.icon}</h2>
            <h3>${category.name}</h3>
            <p>${category.description}</p>
            <small>${category.count}</small>
        `;

        categoryContainer.appendChild(card);
    });
}

displayCategories();