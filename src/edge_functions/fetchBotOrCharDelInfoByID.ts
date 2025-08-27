import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
Deno.serve(async (req)=>{
  // Handle CORS for browser requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type'
      }
    });
  }
  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Authorization header required'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    // Extract the token from the authorization header
    const token = authHeader.split(' ')[1];
    if (!token) {
      return new Response(JSON.stringify({
        error: 'Authorization token missing'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    // Create a Supabase client with the user's token
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    // Get the authenticated user from the token
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized or invalid token'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    const userId = userData.user.id;
    if (!userId) {
      return new Response(JSON.stringify({
        error: 'User ID not found'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    // Parse the JSON body for entity_id and entity_type (conversation or character)
    const requestBody = await req.json();
    const { p_entity_id, p_entity_type } = requestBody;
    if (!p_entity_id || !p_entity_type) {
      return new Response(JSON.stringify({
        error: 'p_entity_id and p_entity_type are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    // Call the Supabase RPC function to get the entity deletion details
    const { data, error: getError } = await supabaseClient.rpc('get_entity_deletion_details', {
      p_entity_id,
      p_entity_type
    });
    if (getError) {
      return new Response(JSON.stringify({
        error: getError.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    // Return the success response
    return new Response(JSON.stringify({
      message: 'Entity deletion details fetched successfully',
      data
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    // Catch any errors and send them as a response
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});
