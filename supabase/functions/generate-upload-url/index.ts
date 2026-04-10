import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'

/**
 * Presigned PUT URLs use SigV4 query signing only (no AWS SDK v3 flexible checksums).
 * If the browser still reports CORS on PUT, configure the S3 bucket (AWS_S3_BUCKET) CORS:
 * AllowedOrigins: https://www.plano.app, https://plano.app — AllowedMethods: PUT, HEAD, GET —
 * AllowedHeaders: * (or include content-type).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function s3PathStyleObjectUrl(region: string, bucket: string, objectKey: string): string {
  const host = region === 'us-east-1' ? 's3.amazonaws.com' : `s3.${region}.amazonaws.com`
  const encodedKey = objectKey.split('/').map((p) => encodeURIComponent(p)).join('/')
  return `https://${host}/${encodeURIComponent(bucket)}/${encodedKey}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('CRITICAL: Missing SUPABASE_URL or SUPABASE_ANON_KEY')
      throw new Error('Server misconfiguration: Missing Supabase Env Vars')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    let user = null
    let body = null

    if (serviceRoleKey && token === serviceRoleKey) {
      console.log('Admin bypass: Service Role Key detected')
      body = await req.json()
      const { userId } = body
      user = { id: userId || 'admin_upload' }
    } else {
      const supabaseClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        { auth: { persistSession: false } },
      )
      const {
        data: { user: authUser },
        error: userError,
      } = await supabaseClient.auth.getUser(token)

      if (userError || !authUser) {
        console.error('Auth Failed:', JSON.stringify(userError))
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            details: userError ? userError.message : 'No user found',
            hint: 'Check Edge Function logs for details',
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      user = authUser
      body = await req.json()
    }

    console.log(`User authenticated: ${user.id}`)

    const { fileName, contentType, folderName } = body

    if (!fileName || !contentType) {
      return new Response(
        JSON.stringify({ error: 'Missing fileName or contentType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const pathTraversalPattern = /[\\/]/
    if (pathTraversalPattern.test(fileName) || (folderName && pathTraversalPattern.test(folderName))) {
      return new Response(
        JSON.stringify({ error: 'Invalid characters in fileName or folderName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (fileName.includes('..') || (folderName && folderName.includes('..'))) {
      return new Response(
        JSON.stringify({ error: 'Path traversal detected in fileName or folderName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const mimeToExt: Record<string, string[]> = {
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'video/quicktime': ['.mov', '.qt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'image/heic': ['.heic'],
    }

    const allowedExts = mimeToExt[contentType]
    if (allowedExts) {
      const hasValidExt = allowedExts.some((ext) => fileName.toLowerCase().endsWith(ext))
      if (!hasValidExt) {
        return new Response(
          JSON.stringify({ error: `Invalid file extension for content type ${contentType}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    } else if (contentType.startsWith('video/') || contentType.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: `Unsupported content type: ${contentType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID') ?? ''
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? ''
    const sessionToken = Deno.env.get('AWS_SESSION_TOKEN') ?? ''

    const bucketName = Deno.env.get('AWS_S3_BUCKET')
    if (!bucketName) {
      console.error('Error: AWS_S3_BUCKET not set')
      throw new Error('AWS_S3_BUCKET environment variable is not set')
    }

    const region = Deno.env.get('AWS_REGION') ?? 'us-east-1'

    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime']
    let folderPrefix = 'review-images'

    if (allowedVideoTypes.includes(contentType)) {
      folderPrefix = 'review-videos'
    }

    const fileKey = folderName
      ? `${folderPrefix}/${user.id}/${folderName}/${crypto.randomUUID()}-${fileName}`
      : `${folderPrefix}/${user.id}/${crypto.randomUUID()}-${fileName}`

    const objectUrl = s3PathStyleObjectUrl(region, bucketName, fileKey)
    const url = new URL(objectUrl)
    url.searchParams.set('X-Amz-Expires', '3600')
    url.searchParams.set('X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD')

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
      service: 's3',
      region,
      retries: 0,
    })

    const signed = await aws.sign(url.toString(), {
      method: 'PUT',
      aws: { signQuery: true, service: 's3', region },
    })

    const uploadUrl = signed.url

    return new Response(
      JSON.stringify({
        uploadUrl,
        key: fileKey,
        /** Present only on aws4fetch builds; if missing in Network, the wrong Supabase project is deployed. */
        presignEngine: 'aws4fetch-v1',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-plano-presign-engine': 'aws4fetch-v1',
        },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Unhandled Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
