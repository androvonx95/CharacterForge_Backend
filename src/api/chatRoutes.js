const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const chat = require('./chat.js');
const { requireAuth } = require('../auth/authMiddleware');
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

// Store contexts for different bots by their ID
const contexts = {};


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// // Create a new bot instance
// Create a new bot instance
router.post("/create_bot", requireAuth, async (req, res) => {
  try {
    console.log( req.body );
    const { name, prompt, private: isPrivate = false } = req.body;
    
    // Validate required fields
    if (!name || !prompt) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Both name and prompt are required'
      });
    }

    // Get the user's access token from the request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create Supabase client with the user's JWT

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // If you have access to the request with the auth token
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
        return res.status(401).json({ 
        error: 'Authentication error',
        details: userError?.message || 'User not found'
        });
    }
    const userId = userData.user.id;
    console.log("USERID : " , userId);

    // Then use it in your function call
    const { data, error: supabaseError } = await supabase.rpc('add_character', {
      p_name: name,
      p_private: isPrivate,
      p_prompt: prompt,
      p_user_id: userId
    });

    console.log( name , isPrivate , prompt , userId );
    if (supabaseError) {
      console.error('Error creating character:', supabaseError);
      return res.status(500).json({
        error: 'Failed to create character',
        details: supabaseError.message
      });
    }

    // Create local context
    // const botID = character.id.toString();
    // const context = [
    //   {
    //     role: "system",
    //     content: prompt
    //   }
    // ];

    // contexts[botID] = context;

    res.status(201).json({
      botID : data,
      message: "Bot created successfully.",
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err.message || 'Unknown error'
    });
  }
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


