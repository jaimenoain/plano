import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import React from 'https://esm.sh/react@18.3.1'
import {
  CreditOutcomeEmail,
  type CreditModerationOutcome,
} from '../_shared/emails/CreditOutcomeEmail.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildEntityLine(
  person: { name: string } | null,
  company: { name: string } | null,
): string {
  const p = person?.name?.trim()
  const c = company?.name?.trim()
  if (p && c) return `${p} (${c})`
  if (p) return p
  if (c) return c
  return 'the credited party'
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

  const { data: isAdmin, error: adminRpcErr } = await userClient.rpc('is_admin')
  if (adminRpcErr || !isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { creditId?: unknown; outcome?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const creditId = typeof body.creditId === 'string' ? body.creditId.trim() : ''
  const outcome = body.outcome === 'verified' || body.outcome === 'hidden' ? body.outcome : null

  if (!creditId || !outcome) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  const { data: row, error: rowErr } = await admin
    .from('building_credits')
    .select(
      `
      id,
      status,
      added_by_user_id,
      person:people(name),
      company:companies(name),
      building:buildings!building_credits_building_id_fkey(id, name, slug, short_id)
    `,
    )
    .eq('id', creditId)
    .maybeSingle()

  if (rowErr || !row) {
    return new Response(JSON.stringify({ error: 'Credit not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const status = row.status as string
  if (status !== outcome) {
    return new Response(JSON.stringify({ error: 'Credit status does not match outcome' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const addedBy = row.added_by_user_id as string | null
  if (!addedBy) {
    return new Response(JSON.stringify({ ok: true, emailed: false }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const building = row.building as {
    id: string
    name: string
    slug: string | null
    short_id: number | null
  } | null
  const buildingName = building?.name?.trim() || 'a building'
  const slug = building?.slug?.trim() ?? null
  const shortId = building?.short_id ?? null
  const buildingId = building?.id ?? ''
  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://plano.app').replace(/\/$/, '')
  let buildingPath = buildingId
    ? slug
      ? `/building/${buildingId}/${slug}`
      : `/building/${buildingId}`
    : '/'
  if (shortId != null) {
    buildingPath = slug ? `/building/${shortId}/${slug}` : `/building/${shortId}`
  }
  const buildingPageUrl = `${siteUrl}${buildingPath}`

  const person = row.person as { name: string } | null
  const company = row.company as { name: string } | null
  const entityLine = buildEntityLine(person, company)

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return new Response(JSON.stringify({ ok: true, emailed: false }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: addedProfile, error: profErr } = await admin.auth.admin.getUserById(addedBy)
  const to = addedProfile?.user?.email?.trim()
  if (profErr || !to) {
    return new Response(JSON.stringify({ ok: true, emailed: false }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const resend = new Resend(resendKey)
  const subject =
    outcome === 'verified'
      ? `Your credit on ${buildingName} was verified — Plano`
      : `Update on your credit for ${buildingName} — Plano`

  try {
    await resend.emails.send({
      from: 'PLANO <hello@plano.app>',
      to: [to],
      subject,
      react: React.createElement(CreditOutcomeEmail, {
        outcome: outcome as CreditModerationOutcome,
        buildingName,
        entityLine,
        buildingPageUrl,
        siteUrl,
      }),
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Could not send email' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true, emailed: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
