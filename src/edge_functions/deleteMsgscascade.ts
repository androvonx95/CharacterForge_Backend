import { createClient } from 'jsr:@supabase/supabase-js@^2';
Deno.serve(async (req)=>{
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type'
  };
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Parse request body
    const { conversationId, idx } = await req.json();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: Missing authentication token'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Create Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication Failed',
        details: authError?.message || 'Invalid or expired authentication'
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Validate input
    if (!conversationId || typeof idx !== 'number') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid input. Requires conversationId and idx'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Call the delete_message_by_idx_and_convo RPC function
    const { data, error: rpcError } = await supabaseClient.rpc('delete_message_by_idx_and_convo', {
      p_conversation_id: conversationId,
      p_idx: idx
    });
    if (rpcError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to delete message',
        details: rpcError.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Return successful response
    return new Response(JSON.stringify({
      success: true,
      message: 'Messages deleted successfully',
      deletedMessagesCount: data.rows_deleted
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error in delete messages function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});
