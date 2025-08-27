import { createClient } from 'jsr:@supabase/supabase-js@^2';
import { BedrockRuntimeClient, InvokeModelCommand } from "npm:@aws-sdk/client-bedrock-runtime@3.513.0";
const AWS_ACCESS_KEY_ID = Deno.env.get("aws_access_key_id");
const AWS_SECRET_ACCESS_KEY = Deno.env.get("aws_secret_access_key");
const AWS_REGION = Deno.env.get("aws_region");
const DEFAULT_MODEL_ID = Deno.env.get("NOVA_MICRO_INFERENCE_PROFILE");
// --- Nova Micro invocation ---
async function invokeNovaMicro(systemPrompt, messages, modelId = DEFAULT_MODEL_ID) {
  const client = new BedrockRuntimeClient({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY
    }
  });
  const payload = {
    messages: [
      {
        role: "user",
        content: [
          {
            text: systemPrompt
          }
        ]
      },
      ...messages.map((m)=>({
          role: m.role === "user" ? "user" : "assistant",
          content: [
            {
              text: m.content
            }
          ]
        }))
    ]
  };
  const command = new InvokeModelCommand({
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
    modelId
  });
  const res = await client.send(command);
  const decoded = new TextDecoder().decode(res.body);
  const parsed = JSON.parse(decoded);
  return parsed?.output?.message?.content?.[0]?.text ?? "";
}
async function invokeClaudeStructured(systemPrompt, messages, modelId = Deno.env.get("CLAUDE_INFERENCE_PROFILE")) {
  const client = new BedrockRuntimeClient({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY
    }
  });
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1000,
    temperature: 0.7,
    stop_sequences: [
      "\nUser:",
      "\nuser:",
      "\nUSER:"
    ],
    system: systemPrompt,
    messages
  };
  const command = new InvokeModelCommand({
    contentType: "application/json",
    body: JSON.stringify(payload),
    modelId
  });
  const res = await client.send(command);
  const decoded = new TextDecoder().decode(res.body);
  const parsed = JSON.parse(decoded);
  const text = parsed?.content?.[0]?.text ?? "";
  return text.replace(/(^|\n)\s*User:\s.*$/gi, "").replace(/(^|\n)\s*\*\*User:\*\*\s.*$/gi, "").trim() || "…";
}
// --- CORS headers ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type"
};
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { conversationId, regenerationInstruction = "" } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: "Unauthorized: Missing authentication token"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    // --- Step 1: Fetch conversation & character ---
    const { data: conversation, error: accessError } = await supabaseClient.from("Conversation").select("id, characterId").eq("id", conversationId).single();
    if (accessError || !conversation) throw new Error("Unauthorized: You do not have access to this conversation");
    // --- Step 2: Fetch character info ---
    const { data: characterInfo, error: charError } = await supabaseClient.rpc("get_character_info", {
      p_character_id: conversation.characterId
    });
    if (charError || !characterInfo || characterInfo.length === 0) throw new Error(`Failed to load character info: ${charError?.message}`);
    const systemPrompt = `You are ${characterInfo[0].name}. ${characterInfo[0].prompt}

ROLEPLAY RULES (hard):
- Stay strictly in-character.
- Do NOT write or simulate the user's dialogue, thoughts, or actions.
- Only describe your character's words, actions, and the environment.
- Never include lines starting with "User:".
- If the user’s part is needed, ask or wait — do not invent it.
`;
    // --- Step 3: Get last two messages (user + AI) ---
    const { data: lastTwo, error: fetchError } = await supabaseClient.from("Message").select("*").eq("conversationId", conversationId).order("idx", {
      ascending: false
    }).limit(2);
    if (fetchError || !lastTwo || lastTwo.length < 2) throw new Error("Could not fetch the last message pair.");
    const aiMessage = lastTwo[0];
    const userMessage = lastTwo[1];
    // --- Step 4: Delete user message (cascades AI message) ---
    const { error: deleteError } = await supabaseClient.rpc("delete_message_by_idx_and_convo", {
      p_conversation_id: conversationId,
      p_idx: userMessage.idx
    });
    if (deleteError) throw new Error(`Failed to delete message: ${deleteError.message}`);
    // --- Step 5: Fetch context messages after deletion ---
    const { data: contextMessagesData, error: contextError } = await supabaseClient.from("Message").select("*").eq("conversationId", conversationId).order("createdAt", {
      ascending: false
    }) // fetch newest first
    .limit(400); // same limit as AI chat
    if (contextError) throw new Error(`Failed to fetch message context: ${contextError.message}`);
    const contextMessages = (contextMessagesData ?? []).reverse(); // reverse to oldest first
    const formattedMessages = contextMessages.map((msg)=>({
        role: msg.role.toLowerCase() === "user" ? "user" : "assistant",
        content: msg.content
      }));
    const regenNote = regenerationInstruction.trim() ? `\n\nInstruction: ${regenerationInstruction}` : "";
    // Add the user message last
    formattedMessages.push({
      role: "user",
      content: userMessage.content + regenNote
    });
    // --- Step 7: Invoke Nova Micro ---
    const aiMessageContent = await invokeNovaMicro(systemPrompt, formattedMessages);
    // --- Step 8: Determine new idx ---
    const { data: lastMessage } = await supabaseClient.from("Message").select("idx").eq("conversationId", conversationId).order("idx", {
      ascending: false
    }).limit(1).maybeSingle();
    const newIdx = (lastMessage?.idx ?? -1) + 1;
    // --- Step 9: Add user message back ---
    const { error: addUserMessageError } = await supabaseClient.rpc("add_message", {
      p_content: userMessage.content,
      p_conversation_id: conversationId,
      p_idx: newIdx,
      p_role: "user"
    });
    if (addUserMessageError) throw new Error(`Failed to re-add user message: ${addUserMessageError.message}`);
    // --- Step 10: Add regenerated AI message ---
    const { error: addAiMessageError } = await supabaseClient.rpc("add_message", {
      p_content: aiMessageContent,
      p_conversation_id: conversationId,
      p_idx: newIdx + 1,
      p_role: "character"
    });
    if (addAiMessageError) {
      await supabaseClient.from("Message").delete().eq("conversationId", conversationId).eq("idx", newIdx);
      throw new Error(`Failed to add regenerated AI message: ${addAiMessageError.message}`);
    }
    return new Response(JSON.stringify({
      success: true,
      message: aiMessageContent
    }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in regenerate-messages function:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
