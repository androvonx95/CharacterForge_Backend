import { createClient } from 'jsr:@supabase/supabase-js@^2';
Deno.serve(async (req)=>{
  // 1. Handle CORS preflight (OPTIONS requests)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      }
    });
  }
  try {
    // Parse request body
    const { conversationId, startingIdx } = await req.json();
    if (!conversationId || startingIdx === undefined) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing conversationId or startingIdx in request body'
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: Missing authentication token'
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    // Initialize Supabase client with user's auth token for RLS
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    // Verify user access to this conversation
    const { data: conversationAccess, error: accessError } = await supabaseClient.from('Conversation').select('id').eq('id', conversationId).single();
    if (accessError || !conversationAccess) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: You do not have access to this conversation'
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    // Build message query
    let query = supabaseClient.from('Message').select('*').eq('conversationId', conversationId).order('idx', {
      ascending: false
    }).limit(20);
    if (startingIdx > 0) {
      query = query.lt('idx', startingIdx);
    }
    // Fetch messages
    const { data: messages, error: fetchError } = await query;
    if (fetchError) {
      throw new Error(`Failed to fetch messages: ${fetchError.message}`);
    }
    // Reverse to chronological order
    const orderedMessages = messages.reverse();
    // Return messages
    return new Response(JSON.stringify({
      success: true,
      messages: orderedMessages,
      hasMore: messages.length === 20
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error('Error fetching paginated messages:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
});
