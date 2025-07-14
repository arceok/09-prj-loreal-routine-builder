// --- L'Oréal Routine Builder Main Script ---

// Get references to DOM elements
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Set chat input text color to white for better visibility
if (userInput) userInput.style.color = "#fff";

// Store all products and selected product IDs
let allProducts = [];
let selectedProductIds = [];

// Store chat history as an array of message objects
let chatHistory = [
  {
    role: "system",
    content:
      "You are a skincare and beauty routine expert. Given a list of products, generate a personalized routine using the provided product data.",
  },
];

// Show initial placeholder until user selects a category
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

// Load product data from JSON file
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  // If the JSON is an array, return it directly
  if (Array.isArray(data)) {
    return data;
  }
  // If the JSON is an object with a 'products' property, return that
  if (data.products && Array.isArray(data.products)) {
    return data.products;
  }
  return [];
}

// Render product cards and add selection logic
function renderProducts(products) {
  productsContainer.innerHTML = "";
  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.productId = product.id;
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}" />
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.description || product.brand || ""}</p>
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

// Update the selected products list UI
function updateSelectedProductsList() {
  selectedProductsList.innerHTML = "";
  const selected = allProducts.filter((p) => selectedProductIds.includes(p.id));
  selected.forEach((product) => {
    const item = document.createElement("div");
    item.textContent = product.name;
    item.className = "selected-product-item";
    selectedProductsList.appendChild(item);
  });
}

// Filter and display products when category changes
categoryFilter.addEventListener("change", async (e) => {
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }
  const selectedCategory = e.target.value;
  const filtered = allProducts.filter(
    (product) => product.category === selectedCategory
  );
  renderProducts(filtered);
  updateSelectedProductsList();
});

// Helper function to generate routine using selected products and optional user message
async function generateRoutine(userMessage = "") {
  const selectedProducts = allProducts.filter((p) =>
    selectedProductIds.includes(p.id)
  );
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      '<div style="color:red">Please select at least one product to generate a routine.</div>';
    return;
  }

  // Add the user's message to the chat history
  if (userMessage.trim() !== "") {
    chatHistory.push({
      role: "user",
      content: `User message: ${userMessage}\nSelected products: ${JSON.stringify(
        selectedProducts
      )}`,
    });
  } else {
    // If no user message, just send selected products
    chatHistory.push({
      role: "user",
      content: `Selected products: ${JSON.stringify(selectedProducts)}`,
    });
  }

  const openaiPayload = {
    model: "gpt-3.5-turbo",
    messages: chatHistory,
    temperature: 0.7,
  };
  try {
    chatWindow.innerHTML =
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

    // Add the assistant's reply to the chat history
    chatHistory.push({
      role: "assistant",
      content: aiMessage,
    });

    // Display the conversation history in the chat window
    const filteredHistory = chatHistory.filter((msg) => msg.role !== "system");
    chatWindow.innerHTML = filteredHistory
      .map((msg, idx) => {
        let style = "";
        if (msg.role === "user") {
          const userText = msg.content
            .split("\n")[0]
            .replace("User message: ", "");
          if (idx === 0) {
            style = "color:#111;margin:0;padding:0;";
          } else {
            style = "color:#111;margin:0 0 8px 0;";
          }
          return `<div style='${style}'><b>You:</b> ${userText}</div>`;
        } else {
          const botText = msg.content.trim();
          if (idx === 0) {
            style = "white-space:pre-line;color:#111;margin:0;padding:0;";
          } else {
            style = "white-space:pre-line;color:#111;margin:0 0 16px 0;";
          }
          return `<div style='${style}'><b>RoutineBot:</b> ${botText}</div>`;
        }
      })
      .join("");

    chatWindow.style.padding = "0";
    chatWindow.style.margin = "0";
    chatWindow.style.boxSizing = "border-box";
    chatWindow.style.minHeight = "";
    chatWindow.style.maxHeight = "600px";
    chatWindow.style.overflowY = "auto";
  } catch (err) {
    chatWindow.innerHTML = `<div style=\"color:red\">Error: ${err.message}</div>`;
  }
  userInput.value = "";
}

// Chat form submission handler - uses generateRoutine with user message
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await generateRoutine(userInput.value);
});

// Generate Routine button handler - uses generateRoutine with no user message
const generateBtn = document.getElementById("generateRoutine");
if (generateBtn) {
  generateBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await generateRoutine("");
  });
}

// Load all products on page load for filtering
window.addEventListener("DOMContentLoaded", async () => {
  allProducts = await loadProducts();
});
