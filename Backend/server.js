require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(cors());
app.use(express.json());

// =====================
// CHECK API KEYS
// =====================

if (!process.env.GEMINI_API_KEY) {
  console.log("❌ GEMINI_API_KEY missing in .env");
  process.exit(1);
}

if (!process.env.TAVILY_API_KEY) {
  console.log("❌ TAVILY_API_KEY missing in .env");
  process.exit(1);
}

console.log("✅ Gemini Key Found");
console.log("✅ Tavily Key Found");

// =====================
// GEMINI SETUP
// =====================

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
});

// =====================
// CHAT ROUTE
// =====================

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        reply: "Message is required"
      });
    }

    console.log("📨 User:", message);

    // Search query
    const searchQuery = `${message} official website college`;

    // Tavily Search
    const searchResponse = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: process.env.TAVILY_API_KEY,
        query: searchQuery,
        search_depth: "basic",
        max_results: 5
      }
    );

    const results = searchResponse.data.results || [];

    let searchData = "";

    results.forEach((item, index) => {
      searchData += `
Result ${index + 1}

Title: ${item.title}
URL: ${item.url}
Content: ${item.content}

`;
    });

    const prompt = `
You are a College Information Assistant.

Rules:

1. Use ONLY the search results.
2. Never invent information.
3. If data is unavailable, say "Information not available".
4. Use clean formatting.
5. Mention official website if found.
6. Give concise but useful answers.

Question:
${message}

Search Results:
${searchData}

Answer format:

🎓 College Name
📍 Location
📚 Courses
💰 Fees
📈 Placements
🌐 Website
`;

    const result = await model.generateContent(prompt);

    const reply = result.response.text();

    res.json({
      reply
    });

  } catch (error) {

    console.log("========== ERROR ==========");

    console.log(error.message);

    if (error.response) {
      console.log(error.response.data);
    }

    console.log("===========================");

    res.status(500).json({
      reply: error.message
    });
  }
});

// =====================
// SUGGESTIONS
// =====================

app.post("/suggest", (req, res) => {

  const { query } = req.body;

  if (!query) {
    return res.json({
      suggestions: []
    });
  }

  res.json({
    suggestions: [
      `${query} admission process`,
      `${query} fee structure`,
      `${query} placements`,
      `${query} cutoff rank`,
      `${query} hostel facilities`
    ]
  });
});

// =====================
// START SERVER
// =====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});