import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // 1. CORS Handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  const FUNCTION_TIMEOUT_MS = 50 * 1000 // 50 seconds safety margin
  let record: any = null

  try {
    // 2. Manual Auth Verification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    let user = null
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const isServiceRole = serviceRoleKey && token === serviceRoleKey

    if (isServiceRole) {
      console.log('Admin bypass: Service Role Key detected')
    } else {
      const authClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { auth: { persistSession: false } }
      )
      const {
        data: { user: authUser },
        error: userError,
      } = await authClient.auth.getUser(token)

      if (userError || !authUser) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized', details: userError }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      user = authUser
    }

    // 3. Business Logic
    const payload = await req.json()
    record = payload.record
    const currentPath = payload.currentPath // Optional, for resuming

    if (!record || !record.id || !record.user_id) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: Missing record or user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Authorization Check: User ID mismatch
    if (!isServiceRole && user && user.id !== record.user_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const bucketName = record.bucket_name || 'review_images'
    const userId = record.user_id
    // If no currentPath, start at userId root.
    let targetPath = currentPath || `${userId}/`

    console.log(`Processing job ${record.id} for user ${userId} at path ${targetPath}`)

    // Update status to processing if not already
    if (record.status !== 'processing') {
      await supabase
        .from('deletion_jobs')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', record.id)
    }

    const appendLog = async (msg: string) => {
      console.log(msg)
    }

    let iterations = 0
    let filesDeleted = 0

    while (true) {
      iterations++

      // Check timeout
      if (Date.now() - startTime > FUNCTION_TIMEOUT_MS) {
        console.log('Timeout approaching. Re-invoking.')
        await appendLog(`Timeout approaching at path ${targetPath}. Re-invoking.`)

        // Re-invoke
        await fetch(req.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers.get('Authorization') || '',
          },
          body: JSON.stringify({
            record: record,
            currentPath: targetPath,
          }),
        })

        return new Response(JSON.stringify({ message: 'Re-invoked', path: targetPath }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // List items
      const { data: items, error: listError } = await supabase.storage
        .from(bucketName)
        .list(targetPath, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' },
        })

      if (listError) throw listError

      if (!items || items.length === 0) {
        // Path is empty.
        if (targetPath === `${userId}/` || targetPath === userId) {
          // Root is empty. We are done.
          await supabase
            .from('deletion_jobs')
            .update({
              status: 'completed',
              logs: JSON.stringify([
                ...(record.logs || []),
                `Completed. Deleted ${filesDeleted} files (in this run).`,
              ]),
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id)

          return new Response(JSON.stringify({ message: 'Job Completed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } else {
          // Subfolder is empty. Restart from root.
          console.log(`Subfolder ${targetPath} empty. Restarting from root.`)
          targetPath = `${userId}/`
          continue
        }
      }

      // Separate files and folders
      const files = items.filter((i) => i.id) // Files have IDs
      const folders = items.filter((i) => !i.id) // Folders don't

      if (files.length > 0) {
        const cleanPath = targetPath.endsWith('/') ? targetPath : `${targetPath}/`
        const finalPaths = files.map((f) => `${cleanPath}${f.name}`)

        const { error: deleteError } = await supabase.storage.from(bucketName).remove(finalPaths)

        if (deleteError) throw deleteError

        filesDeleted += files.length
        console.log(`Deleted ${files.length} files in ${cleanPath}`)
        continue
      }

      if (folders.length > 0) {
        // Dive into first folder
        const folder = folders[0]
        const cleanPath = targetPath.endsWith('/') ? targetPath : `${targetPath}/`
        targetPath = `${cleanPath}${folder.name}/` // Dive
        console.log(`Diving into ${targetPath}`)
        continue
      }

      targetPath = `${userId}/`
    }
  } catch (error: any) {
    console.error(error)

    // Try to update the job status to failed
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      if (record && record.id) {
        const currentLogs = record.logs && Array.isArray(record.logs) ? record.logs : []
        await supabase
          .from('deletion_jobs')
          .update({
            status: 'failed',
            logs: JSON.stringify([...currentLogs, `Error: ${error.message}`]),
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id)
      }
    } catch (e) {
      console.error('Failed to update job status:', e)
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
