import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import React from 'https://esm.sh/react@18.3.1'
import { EntityClaimedEmail } from '../_shared/emails/EntityClaimedEmail.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

  let body: { personId?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const personId = typeof body.personId === 'string' ? body.personId.trim() : ''
  if (!personId) {
    return new Response(JSON.stringify({ error: 'Invalid person' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  const { data: personRow, error: personErr } = await admin
    .from('people')
    .select('id, name, claimed_by_user_id, claim_status')
    .eq('id', personId)
    .maybeSingle()

  if (personErr || !personRow) {
    return new Response(JSON.stringify({ error: 'Person not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (personRow.claimed_by_user_id !== user.id || personRow.claim_status !== 'claimed') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: creditRows, error: crErr } = await admin
    .from('building_credits')
    .select('added_by_user_id')
    .eq('person_id', personId)
    .neq('status', 'hidden')

  if (crErr) {
    return new Response(JSON.stringify({ error: 'Could not load credits' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const contributorIds = new Set<string>()
  for (const row of creditRows ?? []) {
    const uid = row.added_by_user_id as string | null
    if (uid && uid !== user.id) {
      contributorIds.add(uid)
    }
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'Email is not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://plano.app').replace(/\/$/, '')
  const personName = (personRow.name as string) || 'this person'
  const resend = new Resend(resendKey)
  const subject = `Profile claimed: ${personName} — Plano`

  let sent = 0
  for (const uid of contributorIds) {
    const { data: adminUser, error: adminErr } = await admin.auth.admin.getUserById(uid)
    if (adminErr || !adminUser?.user?.email?.trim()) {
      continue
    }
    const to = adminUser.user.email.trim()

    try {
      await resend.emails.send({
        from: 'PLANO <hello@plano.app>',
        to: [to],
        subject,
        react: React.createElement(EntityClaimedEmail, {
          personName,
          siteUrl,
        }),
      })
      sent += 1
    } catch (e) {
      console.error('notify-entity-claimed resend failed', e)
      return new Response(JSON.stringify({ error: 'Could not send email' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  console.log('notify_entity_claimed', { personId, contributorCount: contributorIds.size, sent })

  return new Response(JSON.stringify({ ok: true, notified: sent }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
