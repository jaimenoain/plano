import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  const FUNCTION_TIMEOUT_MS = 50 * 1000 // 50 seconds safety margin
  let record: any = null;

  try {
    const payload = await req.json()
    record = payload.record
    const currentPath = payload.currentPath // Optional, for resuming

    if (!record || !record.id || !record.user_id) {
      throw new Error('Invalid payload: Missing record or user_id')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const bucketName = record.bucket_name || 'review_images'
    const userId = record.user_id
    // If no currentPath, start at userId root.
    // Ensure path ends with / if it's a folder, but list() handles it.
    let targetPath = currentPath || `${userId}/`

    console.log(`Processing job ${record.id} for user ${userId} at path ${targetPath}`)

    // Update status to processing if not already
    if (record.status !== 'processing') {
      await supabase
        .from('deletion_jobs')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', record.id)
    }

    // Helper to log
    const appendLog = async (msg: string) => {
      console.log(msg)
      // We assume logs is an array. We fetch current, append, update.
      // Or we can just push via SQL if we had a stored proc, but here we read-modify-write or just overwrite.
      // For simplicity/perf, we might skip frequent DB log updates and just do it at the end or on timeout.
    }

    // Recursive Deletion Logic (Iterative with Depth Descent)
    // actually, we just need to list items in targetPath.
    // If files, delete.
    // If limit hit, we will be called again (or we loop).
    // If folders, we dive.

    // We use a loop to process as much as possible within timeout.
    // We maintain a stack if we want true DFS, but here we can just "Dive and Resume".
    // "Greedy Descent": Always work on `targetPath`.
    // If `targetPath` has files, delete them.
    // If `targetPath` has only folders, pick first folder, set `targetPath` = folder, and Continue.
    // If `targetPath` is empty:
    //    If `targetPath` == root (`userId/`), we are DONE.
    //    If `targetPath` != root, it means we finished a subfolder.
    //    We must go back up. But we don't know the parent easily.
    //    So we RESTART at root (`userId/`). The empty subfolder will be gone (or we will find the next one).

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
                'Authorization': req.headers.get('Authorization') || '',
            },
            body: JSON.stringify({
                record: record,
                currentPath: targetPath
            })
        })

        return new Response(JSON.stringify({ message: 'Re-invoked', path: targetPath }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // List items
      // Supabase list limit is 100 by default, max 100.
      const { data: items, error: listError } = await supabase.storage
        .from(bucketName)
        .list(targetPath, {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' }
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
                    logs: JSON.stringify([...(record.logs || []), `Completed. Deleted ${filesDeleted} files (in this run).`]),
                    updated_at: new Date().toISOString()
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

      const files = items.filter(i => i.id) // Files have IDs
      const folders = items.filter(i => !i.id) // Folders don't

      if (files.length > 0) {
        const pathsToDelete = files.map(f => `${targetPath}${f.name}`) // targetPath should end with /
        // Just in case targetPath doesn't end with /
        const cleanPath = targetPath.endsWith('/') ? targetPath : `${targetPath}/`
        const finalPaths = files.map(f => `${cleanPath}${f.name}`)

        const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove(finalPaths)

        if (deleteError) throw deleteError

        filesDeleted += files.length
        console.log(`Deleted ${files.length} files in ${cleanPath}`)

        // Loop again (same path) to see if more files exist (pagination)
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

      // Should not reach here if items > 0 but no files and no folders?
      // Maybe weird state. Restart from root.
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
                updated_at: new Date().toISOString()
            })
            .eq('id', record.id)
        }
    } catch (e) {
        console.error("Failed to update job status:", e)
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
