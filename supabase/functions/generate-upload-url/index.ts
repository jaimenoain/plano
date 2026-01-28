import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Request received")

    // 1. Validate Environment Variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("CRITICAL: Missing SUPABASE_URL or SUPABASE_ANON_KEY")
      throw new Error("Server misconfiguration: Missing Supabase Env Vars")
    }

    // 2. Validate Authorization Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error("Error: Missing Authorization header")
      throw new Error('Missing Authorization header')
    }

    // 3. Initialize Client
    // We use persistSession: false because Edge Functions should be stateless.
    // However, this means we must explicitly pass the token to getUser().
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    )

    // 4. Debug User Token Verification
    console.log("Verifying user token")

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      console.error("Auth Failed:", JSON.stringify(userError))
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          details: userError ? userError.message : 'No user found',
          hint: 'Check Edge Function logs for details'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`User authenticated: ${user.id}`)

    // 5. Parse Body & S3 Logic
    const { fileName, contentType, folderName } = await req.json()

    if (!fileName || !contentType) {
      return new Response(
        JSON.stringify({ error: 'Missing fileName or contentType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const s3Client = new S3Client({
      region: Deno.env.get('AWS_REGION') ?? 'us-east-1',
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    })

    const bucketName = Deno.env.get('AWS_S3_BUCKET')
    if (!bucketName) {
      console.error("Error: AWS_S3_BUCKET not set")
      throw new Error('AWS_S3_BUCKET environment variable is not set')
    }

    const fileKey = folderName
      ? `${user.id}/${folderName}/${crypto.randomUUID()}-${fileName}`
      : `${user.id}/${crypto.randomUUID()}-${fileName}`
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return new Response(
      JSON.stringify({ uploadUrl, key: fileKey }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Unhandled Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
