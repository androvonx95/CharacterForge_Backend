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
    const { entity_id, entity_type } = requestBody;
    if (!entity_id || !entity_type) {
      return new Response(JSON.stringify({
        error: 'entity_id and entity_type are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    // Call the Supabase RPC function to delete the entity
    const { data, error: deleteError } = await supabaseClient.rpc('delete_entity', {
      entity_id,
      user_id: userId,
      entity_type: entity_type
    });
    if (deleteError) {
      return new Response(JSON.stringify({
        error: deleteError.message
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
      message: 'Entity deleted successfully',
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
