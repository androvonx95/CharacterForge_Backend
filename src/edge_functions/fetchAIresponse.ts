import { createClient } from 'jsr:@supabase/supabase-js@^2';
import { BedrockRuntimeClient, InvokeModelCommand } from "npm:@aws-sdk/client-bedrock-runtime@3.513.0";
// AWS Bedrock Setup
const AWS_ACCESS_KEY_ID = Deno.env.get("aws_access_key_id");
const AWS_SECRET_ACCESS_KEY = Deno.env.get("aws_secret_access_key");
const AWS_REGION = "us-east-2";
const DEFAULT_MODEL_ID = Deno.env.get("NOVA_MICRO_INFERENCE_PROFILE");
// Nova Micro invocation
async function invokeNovaMicro(systemPrompt, messages, modelId = DEFAULT_MODEL_ID) {
  const client = new BedrockRuntimeClient({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY
    }
  });
  // Prepend system prompt as a user message
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
  console.log(messages);
  const command = new InvokeModelCommand({
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
    modelId
  });
  const res = await client.send(command);
  const decoded = new TextDecoder().decode(res.body);
  console.log(decoded);
  const parsed = JSON.parse(decoded);
  console.log(parsed);
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

// CORS headers
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
    const { messageContent, conversationId } = await req.json();
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
    // Step 1: Verify conversation & get characterId
    const { data: conversation, error: accessError } = await supabaseClient.from('Conversation').select('id, characterId').eq('id', conversationId).single();
    if (accessError || !conversation) {
      return new Response(JSON.stringify({
        success: false,
        error: "Unauthorized: You do not have access to this conversation",
        details: {
          conversation,
          accessError
        }
      }), {
        status: 403,
        headers: corsHeaders
      });
    }
    // verify conversation isnt deleted
    let { data, error } = await supabaseClient.rpc('get_entity_deletion_details', {
      p_entity_id: conversationId,
      p_entity_type: 'conversation'
    });
    if (error) {
      return new Response(JSON.stringify({
        success: false,
        error: "This conversation is Deleted!",
        details: {
          conversation,
          accessError
        }
      }), {
        status: 403,
        headers: corsHeaders
      });
    }
    // Step 2: Fetch character info
    const { data: characterInfo, error: charError } = await supabaseClient.rpc('get_character_info', {
      p_character_id: conversation.characterId
    });
    if (charError || !characterInfo || characterInfo.length === 0) {
      throw new Error(`Failed to load character info: ${charError?.message}`);
    }
    // verify Chatacter isnt deleted
    let { data2, error2 } = await supabaseClient.rpc('get_entity_deletion_details', {
      p_entity_id: conversationId,
      p_entity_type: 'character'
    });
    if (error2) {
      return new Response(JSON.stringify({
        success: false,
        error: "This character is Deleted!",
        details: {
          conversation,
          accessError
        }
      }), {
        status: 403,
        headers: corsHeaders
      });
    }
    const systemPrompt = `You are ${characterInfo[0].name}. ${characterInfo[0].prompt}

ROLEPLAY RULES (hard):
- Stay strictly in-character.
- Do NOT write or simulate the user's thoughts, actions, or dialogue.
- Produce ONLY your character's words/actions and environmental narration.
- Never include lines starting with "User:".
- If user action is needed, ask or wait — do not assume.
`;
    // Step 3: Get last message index
    const { data: lastMessage } = await supabaseClient.from('Message').select('idx').eq('conversationId', conversationId).order('idx', {
      ascending: false
    }).limit(1).maybeSingle();
    const newIdx = (lastMessage?.idx ?? -1) + 1;
    // Step 4: Fetch recent messages
    const { data: messages, error: fetchError } = await supabaseClient.from('Message').select('*').eq('conversationId', conversationId).order('createdAt', {
      ascending: false
    }).limit(400);
    if (fetchError) throw new Error(`Failed to fetch messages: ${fetchError.message}`);
    // Step 5: Format messages for Nova Micro
    const formattedMessages = messages.reverse().map((msg)=>({
        role: msg.role.toLowerCase() === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
    // Add the new user message
    formattedMessages.push({
      role: 'user',
      content: messageContent
    });
    // console.log(formattedMessages);
    // Step 6: Invoke Nova Micro
    const aiMessageContent = await invokeNovaMicro(systemPrompt, formattedMessages);
    // Step 7: Store user message
    const { error: addUserMessageError } = await supabaseClient.rpc('add_message', {
      p_content: messageContent,
      p_conversation_id: conversationId,
      p_idx: newIdx,
      p_role: 'user'
    });
    if (addUserMessageError) throw new Error(`Failed to add user message: ${addUserMessageError.message}`);
    // Step 8: Store AI/character message
    const { error: addAiMessageError } = await supabaseClient.rpc('add_message', {
      p_content: aiMessageContent,
      p_conversation_id: conversationId,
      p_idx: newIdx + 1,
      p_role: 'character'
    });
    if (addAiMessageError) {
      // Rollback user message if AI message fails
      await supabaseClient.from('Message').delete().eq('conversationId', conversationId).eq('idx', newIdx);
      throw new Error(`Failed to add AI message: ${addAiMessageError.message}`);
    }
    return new Response(JSON.stringify({
      success: true,
      message: aiMessageContent
    }), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error in AI chat function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
