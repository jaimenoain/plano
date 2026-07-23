import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import React from 'https://esm.sh/react@18.3.1'
import { CollectionCollaboratorEmail } from '../_shared/emails/CollectionCollaboratorEmail.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Email a user that they were added as a collaborator (editor) on a collection.
// Called (best-effort) from the client after either add path: an owner adding a
// contributor directly, or an owner approving a request-to-collaborate. The in-app
// notification is written separately; this only sends the email.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const jwt = authHeader.replace('Bearer ', '')
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(jwt)

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { collectionId?: unknown; recipientId?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const collectionId = typeof body.collectionId === 'string' ? body.collectionId.trim() : ''
  const recipientId = typeof body.recipientId === 'string' ? body.recipientId.trim() : ''
  if (!collectionId || !recipientId) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  // Only the collection owner may trigger this email.
  const { data: collection, error: colErr } = await admin
    .from('collections')
    .select('id, name, slug, owner_id')
    .eq('id', collectionId)
    .maybeSingle()

  if (colErr || !collection) {
    return new Response(JSON.stringify({ error: 'Collection not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (collection.owner_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Respect the recipient's opt-out for collaborator-add notifications.
  const { data: recipientProfile } = await admin
    .from('profiles')
    .select('username, notification_preferences')
    .eq('id', recipientId)
    .maybeSingle()

  const prefs = (recipientProfile?.notification_preferences ?? null) as Record<string, unknown> | null
  if (prefs && prefs['collection_collab_added'] === false) {
    return new Response(JSON.stringify({ ok: true, skipped: 'opted_out' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Resolve the recipient's email (auth.users, service-role only).
  const { data: adminUser, error: adminErr } = await admin.auth.admin.getUserById(recipientId)
  const to = adminUser?.user?.email?.trim()
  if (adminErr || !to) {
    return new Response(JSON.stringify({ error: 'Recipient email not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Inviter is the owner (== caller).
  const { data: inviterProfile } = await admin
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'Email is not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://plano.app').replace(/\/$/, '')
  const ownerUsername = (inviterProfile?.username as string | null) ?? ''
  const inviterName = ownerUsername || 'Someone'
  const collectionName = (collection.name as string) || 'a collection'
  const collectionSlug = collection.slug as string | null
  const collectionUrl =
    ownerUsername && collectionSlug
      ? `${siteUrl}/${ownerUsername}/map/${collectionSlug}`
      : siteUrl

  const resend = new Resend(resendKey)
  try {
    await resend.emails.send({
      from: 'PLANO <hello@plano.app>',
      to: [to],
      subject: `You're now a collaborator on ${collectionName} — Plano`,
      react: React.createElement(CollectionCollaboratorEmail, {
        inviterName,
        collectionName,
        collectionUrl,
        siteUrl,
      }),
    })
  } catch (e) {
    console.error('notify-collection-collaborator resend failed', e)
    return new Response(JSON.stringify({ error: 'Could not send email' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('notify_collection_collaborator', { collectionId, recipientId, sent: 1 })

  return new Response(JSON.stringify({ ok: true, notified: 1 }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
