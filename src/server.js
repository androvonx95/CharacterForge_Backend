import express from "express";
import chat from "./api/chat.js";
import dotenv from "dotenv";
 
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Store contexts for different bots by their ID
const contexts = {};
let botCounter = 0; // Counter to assign incremental bot IDs

// Create a new bot instance
app.post("/create_bot", (req, res) => {
  const botID = botCounter.toString();
  const bot = req.body.prompt;
  botCounter++;

  const context = [
    {
      role: "system",
      content: bot
    }
  ];

  contexts[botID] = context;

  res.json({ botID, message: "Bot created successfully." });
});

// Chat with a specific bot by ID
app.post("/chat", async (req, res) => {
  const { botID, message } = req.body;

  if (!botID || !message) {
    return res
      .status(400)
      .json({ error: "Both botID and message are required." });
  }

  const context = contexts[botID];
  if (!context) {
    return res.status(404).json({ error: "Bot ID not found." });
  }

  try {
    context.push({ role: "user", content: message });
    const botReply = await chat([...context]); // clone to avoid mutations
    context.push({ role: "assistant", content: botReply });

    res.json({ response: botReply });
  } catch (error) {
    console.error("Error during API call:", error);
    res.status(500).json({ error: "Failed to get response from the model." });
  }
});

console.log( contexts );
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
