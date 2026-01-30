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
    let user = null;
    let isAdmin = false;

    // JULES-MAINTAIN: Service Role bypass for admin processes
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (serviceRoleKey && token === serviceRoleKey) {
        console.log("Admin bypass: Service Role Key detected");
        isAdmin = true;
        user = { id: 'admin_delete' };
    } else {
        // Manual verification for verify_jwt: false
        const {
            data: { user: authUser },
            error: userError,
        } = await supabaseClient.auth.getUser(token)

        if (userError || !authUser) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized', details: userError }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }
        user = authUser;
    }

    const { fileKeys } = await req.json()

    if (!fileKeys || !Array.isArray(fileKeys) || fileKeys.length === 0) {
       return new Response(JSON.stringify({ message: 'No keys to delete' }), { status: 200, headers: corsHeaders })
    }

    // Security: Ensure all keys belong to the user (unless admin)
    // We check if the key starts with the user ID followed by a slash.
    // Note: If new keys start with review-images/, this check needs to be smarter?
    // User ID is in the path. e.g. review-images/USER_ID/file
    // The original check was: !key.startsWith(`${user.id}/`)
    // If key is review-images/USER_ID/file, this check will FAIL.

    // So I MUST update the security check to handle the new prefix OR valid legacy prefix.

    // Let's analyze the check.
    let invalidKeys: string[] = [];
    if (!isAdmin) {
        invalidKeys = fileKeys.filter((key: string) => {
            // Allow if starts with user.id/ (legacy)
            if (key.startsWith(`${user.id}/`)) return false;
            // Allow if starts with review-images/user.id/ (new)
            if (key.startsWith(`review-images/${user.id}/`)) return false;

            return true;
        })
    }

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
