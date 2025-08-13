const { InferenceClient } = require("@huggingface/inference");
const dotenv = require("dotenv");

dotenv.config();

const client = new InferenceClient(process.env.HF_TOKEN);

async function chat( messages ) {
  const chatCompletion = await client.chatCompletion({
    // provider: "featherless-ai", // Optional, can omit this
    model: "HuggingFaceH4/zephyr-7b-beta",
    messages,
    temperature: 0.9,
    max_tokens: 200,
    // stream: true // Enable streaming

  });

  //   console.log("🤖 Luna:", chatCompletion.choices[0].message.content);
  return chatCompletion.choices[0].message.content;
}

async function testChat() {
  try {
    const messages = [
      { role: 'assistant', content: 'Hello, how can I be of service?' },
      { role: 'user', content: 'Can you write a story about a robot who discovers he is a human?' }
    ];
    
    const response = await chat(messages);
    console.log('Bot response:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

// testChat();
module.exports = chat;

