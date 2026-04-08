import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function randomHex64(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexStringToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
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

  let body: { requestId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : ''
  if (!requestId) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  const { data: reqRow, error: reqErr } = await admin
    .from('company_steward_requests')
    .select('id, company_id, requester_user_id, message, status, created_at')
    .eq('id', requestId)
    .maybeSingle()

  if (reqErr || !reqRow) {
    return new Response(JSON.stringify({ error: 'Request not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (reqRow.requester_user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (reqRow.status !== 'pending') {
    return new Response(JSON.stringify({ error: 'Request is not pending' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { count: existingTokenCount, error: cntErr } = await admin
    .from('company_steward_request_approval_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', requestId)

  if (cntErr) {
    return new Response(JSON.stringify({ error: 'Could not verify request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if ((existingTokenCount ?? 0) > 0) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: companyRow, error: coErr } = await admin
    .from('companies')
    .select('name, slug')
    .eq('id', reqRow.company_id)
    .single()

  if (coErr || !companyRow) {
    return new Response(JSON.stringify({ error: 'Company not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: owners, error: ownErr } = await admin
    .from('company_stewards')
    .select('user_id')
    .eq('company_id', reqRow.company_id)
    .eq('role', 'owner')

  if (ownErr || !owners?.length) {
    return new Response(JSON.stringify({ error: 'No owners found for company' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://plano.app').replace(/\/$/, '')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const messageText =
    typeof reqRow.message === 'string' && reqRow.message.trim().length > 0
      ? `\n\nTheir message:\n${reqRow.message.trim()}\n`
      : ''

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const resend = resendKey ? new Resend(resendKey) : null

  for (const row of owners) {
    const ownerId = row.user_id as string
    const tokenHex = randomHex64()
    const tokenBytes = hexStringToBytes(tokenHex)
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenBytes)
    const tokenHash = new Uint8Array(hashBuffer)

    const { error: insErr } = await admin.from('company_steward_request_approval_tokens').insert({
      request_id: requestId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    })

    if (insErr) {
      return new Response(JSON.stringify({ error: 'Could not create approval link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const approveUrl = `${siteUrl}/approve-steward-request/${tokenHex}`

    const { data: uwrap, error: gErr } = await admin.auth.admin.getUserById(ownerId)
    const ownerEmail = gErr || !uwrap?.user?.email ? null : uwrap.user.email.trim().toLowerCase()

    console.log('company_steward_request_notify_owner', {
      requestId,
      companyId: reqRow.company_id,
      ownerId,
      approveUrl,
      hasEmail: Boolean(ownerEmail),
    })

    if (resend && ownerEmail) {
      try {
        await resend.emails.send({
          from: 'PLANO <hello@plano.app>',
          to: [ownerEmail],
          subject: `Someone asked to help manage ${companyRow.name} on Plano`,
          text: `A Plano member requested access to help manage ${companyRow.name} (${companyRow.slug}).${messageText}\nIf you approve, sign in as a company owner and open:\n${approveUrl}\n\nThis link expires in 7 days. If you do not recognize this request, you can ignore this email.`,
        })
      } catch (e) {
        console.error('Resend send failed (steward request)', e)
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
