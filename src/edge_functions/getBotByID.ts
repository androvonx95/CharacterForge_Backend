import { createClient } from 'jsr:@supabase/supabase-js@^2';
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
    const { characterId } = await req.json();
    if (!characterId) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required field: characterId"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"), {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    // Call the RPC function
    const { data, error } = await supabaseClient.rpc('get_character_by_id', {
      p_character_id: characterId
    });
    if (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    if (!data || data.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Character not found"
      }), {
        status: 404,
        headers: corsHeaders
      });
    }
    return new Response(JSON.stringify({
      success: true,
      character: data[0]
    }), {
      headers: corsHeaders
    });
  } catch (err) {
    console.error("Error in get_character edge function:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
