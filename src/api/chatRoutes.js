const express = require('express');
const chat = require('./chat.js');
const { requireAuth } = require('../auth/authMiddleware');

const router = express.Router();

// Store contexts for different bots by their ID
const contexts = {};
let botCounter = 0; // Counter to assign incremental bot IDs

// Create a new bot instance
router.post("/create_bot", requireAuth, (req, res) => {
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
router.post("/chat", requireAuth, async (req, res) => {
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

  const messages = [...context, { role: "user", content: message }];
  const response = await chat(messages);

  // Add the response to the context
  context.push({ role: "assistant", content: response });

  res.json({ response });
});

// General chat endpoint
router.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    const response = await chat(messages);
    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

module.exports = router;
