import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";
import { createClient } from "npm:@supabase/supabase-js@2";
import { v4 as uuidv4 } from "npm:uuid";
const AWS_REGION = Deno.env.get("aws_region");
const BUCKET_NAME = (Deno.env.get("S3_BUCKET_NAME") ?? "your-bucket-name").trim();
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: Deno.env.get("aws_access_key_id") ?? "",
    secretAccessKey: Deno.env.get("aws_secret_access_key") ?? ""
  }
});
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type"
};
// Allowed MIME types
const allowedImageTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif"
]);
// Sanitize file name
function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}
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
        error: "Unauthorized: Missing Authorization header"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: "Authentication failed",
        details: authError?.message
      }), {
        status: 403,
        headers: corsHeaders
      });
    }
    const { fileName, fileType } = await req.json();
    if (!fileName || !fileType) {
      return new Response(JSON.stringify({
        error: "Missing fileName or fileType in request"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    // ✅ Only allow safe image types
    if (!allowedImageTypes.has(fileType.toLowerCase())) {
      return new Response(JSON.stringify({
        error: `File type ${fileType} not allowed.`
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    // ✅ Sanitize filename
    const safeFileName = sanitizeFileName(fileName);
    const uniqueId = uuidv4();
    const key = `uploads/${user.id}/${Date.now()}-${uniqueId}-${safeFileName}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType
    });
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60 * 5
    });
    const fileUrl = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
    return new Response(JSON.stringify({
      signedUrl,
      fileUrl
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return new Response(JSON.stringify({
      error: "Internal Server Error",
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
