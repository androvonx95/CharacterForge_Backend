import { InferenceClient } from "@huggingface/inference";
import dotenv from "dotenv";
dotenv.config();

const client = new InferenceClient(process.env.HF_TOKEN);

async function chat( messages ) {
  const chatCompletion = await client.chatCompletion({
    // provider: "featherless-ai", // Optional, can omit this
    model: "HuggingFaceH4/zephyr-7b-beta",
    messages,
    temperature: 0.9,
    max_tokens: 200,
  });

  //   console.log("🤖 Luna:", chatCompletion.choices[0].message.content);
  return chatCompletion.choices[0].message.content;
}

export default chat;
