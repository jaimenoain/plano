import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, DeleteObjectsCommand } from 'https://esm.sh/@aws-sdk/client-s3@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { fileKeys } = await req.json()

    if (!fileKeys || !Array.isArray(fileKeys) || fileKeys.length === 0) {
       return new Response(JSON.stringify({ message: 'No keys to delete' }), { status: 200, headers: corsHeaders })
    }

    // Security: Ensure all keys belong to the user
    // We check if the key starts with the user ID followed by a slash.
    const invalidKeys = fileKeys.filter((key: string) => !key.startsWith(`${user.id}/`))

    if (invalidKeys.length > 0) {
        return new Response(
            JSON.stringify({
                error: 'Unauthorized access',
                message: 'You can only delete files that belong to your user account.',
                invalidKeys
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      throw new Error('AWS_S3_BUCKET environment variable is not set')
    }

    const command = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: fileKeys.map((key: string) => ({ Key: key })),
        Quiet: true
      },
    })

    await s3Client.send(command)

    return new Response(
      JSON.stringify({ message: 'Deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error deleting files:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
