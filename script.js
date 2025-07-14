/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

// Track selected product IDs
let allProducts = [];
let selectedProductIds = [];

// Load selected products from localStorage if available
function loadSelectedProductIds() {
  const saved = localStorage.getItem("lorealSelectedProductIds");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {}
  }
  return [];
}

// Save selected products to localStorage
function saveSelectedProductIds() {
  localStorage.setItem(
    "lorealSelectedProductIds",
    JSON.stringify(selectedProductIds)
  );
}

selectedProductIds = loadSelectedProductIds();

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Render product cards and add selection logic */
function displayProducts(products) {
  productsContainer.innerHTML = "";
  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.productId = product.id;
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${
          product.description
            ? product.description
            : "No description available."
        }</p>
      </div>
    `;
    // Add selected class if already selected
    if (selectedProductIds.includes(product.id)) {
      card.classList.add("selected");
    }
    // Toggle selection on click
    card.addEventListener("click", () => {
      if (selectedProductIds.includes(product.id)) {
        selectedProductIds = selectedProductIds.filter(
          (id) => id !== product.id
        );
        card.classList.remove("selected");
      } else {
        selectedProductIds.push(product.id);
        card.classList.add("selected");
      }
      updateSelectedProductsList();
    });
    productsContainer.appendChild(card);
  });
}

// Show selected products by the generate routine button
function updateSelectedProductsList() {
  if (!selectedProductsList) return;
  selectedProductsList.innerHTML = "";
  const selected = allProducts.filter((p) => selectedProductIds.includes(p.id));
  selected.forEach((product) => {
    const item = document.createElement("div");
    item.textContent = product.name;
    item.className = "selected-product-item";
    selectedProductsList.appendChild(item);
  });
  saveSelectedProductIds();
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  allProducts = await loadProducts();
  const selectedCategory = e.target.value;
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory
  );
  displayProducts(filteredProducts);
  updateSelectedProductsList();
});

// Store chat history as an array of message objects
let chatHistory = [];
const defaultSystemMessage = {
  role: "system",
  content:
    "You are a skincare and beauty routine expert. Given a list of products, answer user questions and generate routines using the provided product data.",
};

// Load chat history from localStorage if available
function loadChatHistory() {
  const saved = localStorage.getItem("lorealChatHistory");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed[0].role === "system"
      ) {
        return parsed;
      }
    } catch (e) {}
  }
  return [defaultSystemMessage];
}

// Save chat history to localStorage
function saveChatHistory() {
  localStorage.setItem("lorealChatHistory", JSON.stringify(chatHistory));
}

chatHistory = loadChatHistory();

// Helper to render all chat history in the chat window
function renderChatHistory() {
  chatWindow.innerHTML = "";
  for (let i = 1; i < chatHistory.length; i++) {
    const msg = chatHistory[i];
    if (msg.role === "user") {
      chatWindow.innerHTML += `<div style='color:#111;margin:0 0 8px 0;text-align:right;max-width:70%;margin-left:auto;word-break:break-word;white-space:pre-line;'><b>You:</b> ${msg.content}</div>`;
    } else if (msg.role === "assistant") {
      chatWindow.innerHTML += `<div style='white-space:pre-line;color:#111;margin:0 0 16px 0;text-align:left;max-width:70%;word-break:break-word;'><b>RoutineBot:</b> ${msg.content}</div>`;
    }
  }
  saveChatHistory();
}

/* Chat form submission handler - now connects to OpenAI API and keeps history */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInput = document.getElementById("userInput");
  const userMessage = userInput ? userInput.value.trim() : "";
  if (!userMessage) return;

  // Get selected products
  const selected = allProducts.filter((p) => selectedProductIds.includes(p.id));
  let userMsgContent = userMessage;
  if (selected.length > 0) {
    const productNames = selected.map((p) => p.name).join(", ");
    userMsgContent += `\nProducts selected: ${productNames}`;
  }
  // Add user message to chat history
  chatHistory.push({ role: "user", content: userMsgContent });
  renderChatHistory();

  // Prepare the message for the OpenAI API
  const messages = [...chatHistory];

  const openaiPayload = {
    model: "gpt-4o",
    messages: messages,
    temperature: 0.7,
  };

  try {
    chatWindow.innerHTML +=
      '<div style="color:var(--loreal-gold)">RoutineBot is thinking...</div>';
    const response = await fetch(
      "https://loreal-chatbot-products.arceok.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openaiPayload),
      }
    );
    const data = await response.json();
    const aiMessage =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content
        : "Sorry, I couldn't answer that.";
    // Add assistant reply to chat history
    chatHistory.push({ role: "assistant", content: aiMessage });
    renderChatHistory();
  } catch (err) {
    chatWindow.innerHTML += `<div style=\"color:red\">Error: ${err.message}</div>`;
  }
  if (userInput) userInput.value = "";
});

// Set chat window text color to black
if (chatWindow) chatWindow.style.color = "#111";
// Set user input textbox text color to white
const userInput = document.getElementById("userInput");
if (userInput) userInput.style.color = "#fff";

// Helper function to generate routine using selected products
async function generateRoutine() {
  // Get selected products
  const selected = allProducts.filter((p) => selectedProductIds.includes(p.id));
  if (selected.length === 0) {
    chatWindow.innerHTML =
      '<div style="color:red">Please select at least one product to generate a routine.</div>';
    return;
  }
  const productNames = selected.map((p) => p.name).join(", ");
  // Add user message to chat history
  chatHistory.push({
    role: "user",
    content: `Generate a routine for these products: ${productNames}`,
  });
  renderChatHistory();
  const messages = [...chatHistory];
  const openaiPayload = {
    model: "gpt-4o",
    messages: messages,
    temperature: 0.7,
  };
  try {
    chatWindow.innerHTML +=
      '<div style="color:var(--loreal-gold)">Generating routine...</div>';
    const response = await fetch(
      "https://loreal-chatbot-products.arceok.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openaiPayload),
      }
    );
    const data = await response.json();
    const aiMessage =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content
        : "Sorry, I couldn't generate a routine.";
    chatHistory.push({ role: "assistant", content: aiMessage });
    renderChatHistory();
  } catch (err) {
    chatWindow.innerHTML += `<div style=\"color:red\">Error: ${err.message}</div>`;
  }
}

// Add event listener for Generate Routine button
const generateBtn = document.getElementById("generateRoutine");
if (generateBtn) {
  generateBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await generateRoutine();
  });
}

// Add Clear All button under the Generate Routine button
const clearAllBtn = document.createElement("button");
clearAllBtn.id = "clearAllProducts";
clearAllBtn.textContent = "Clear All";
clearAllBtn.style.marginTop = "10px";
clearAllBtn.style.background = "var(--loreal-gold, gold)";
clearAllBtn.style.color = "#111";
clearAllBtn.style.border = "none";
clearAllBtn.style.padding = "8px 16px";
clearAllBtn.style.borderRadius = "4px";
clearAllBtn.style.cursor = "pointer";

// Add Start Over button under the Clear All button
const startOverBtn = document.createElement("button");
startOverBtn.id = "startOverBtn";
startOverBtn.textContent = "Start Over";
startOverBtn.style.marginTop = "10px";
startOverBtn.style.background = "#111";
startOverBtn.style.color = "var(--loreal-gold, gold)";
startOverBtn.style.border = "none";
startOverBtn.style.padding = "8px 16px";
startOverBtn.style.borderRadius = "4px";
startOverBtn.style.cursor = "pointer";

if (generateBtn && generateBtn.parentNode) {
  generateBtn.parentNode.insertBefore(clearAllBtn, generateBtn.nextSibling);
  clearAllBtn.parentNode.insertBefore(startOverBtn, clearAllBtn.nextSibling);
}

// Clear all selected products when Clear All is clicked
clearAllBtn.addEventListener("click", () => {
  selectedProductIds = [];
  updateSelectedProductsList();
  // Also update product card selection visuals
  const cards = document.querySelectorAll(".product-card.selected");
  cards.forEach((card) => card.classList.remove("selected"));
  saveSelectedProductIds();
});

// Start Over button clears both chat and selected products
startOverBtn.addEventListener("click", () => {
  // Clear selected products
  selectedProductIds = [];
  updateSelectedProductsList();
  const cards = document.querySelectorAll(".product-card.selected");
  cards.forEach((card) => card.classList.remove("selected"));
  saveSelectedProductIds();
  // Clear chat history
  chatHistory = [defaultSystemMessage];
  renderChatHistory();
  saveChatHistory();
});

// On page load, load all products for selection tracking and render chat history
window.addEventListener("DOMContentLoaded", async () => {
  allProducts = await loadProducts();
  renderChatHistory();
  // Always show selected products above the generate button, even if no category is selected
  updateSelectedProductsList();
  // If a category is selected, show filtered products and restore selection visuals
  const selectedCategory = categoryFilter && categoryFilter.value;
  if (selectedCategory) {
    const filteredProducts = allProducts.filter(
      (product) => product.category === selectedCategory
    );
    displayProducts(filteredProducts);
  }
});
