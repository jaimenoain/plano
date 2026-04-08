import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

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

  let body: { disputeId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const disputeId = typeof body.disputeId === 'string' ? body.disputeId.trim() : ''
  if (!disputeId) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  const { data: dRow, error: dErr } = await admin
    .from('company_claim_disputes')
    .select('id, company_id, disputed_by_user_id, reason, evidence_url, status, created_at')
    .eq('id', disputeId)
    .maybeSingle()

  if (dErr || !dRow) {
    return new Response(JSON.stringify({ error: 'Dispute not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (dRow.disputed_by_user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (dRow.status !== 'open') {
    return new Response(JSON.stringify({ error: 'Dispute is not open' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: companyRow, error: coErr } = await admin
    .from('companies')
    .select('name, slug')
    .eq('id', dRow.company_id as string)
    .single()

  if (coErr || !companyRow) {
    return new Response(JSON.stringify({ error: 'Company not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://plano.app').replace(/\/$/, '')
  const companyUrl = `${siteUrl}/company/${companyRow.slug as string}`

  const notifyTo =
    (Deno.env.get('PLANO_ADMIN_NOTIFY_EMAIL') ?? Deno.env.get('COMPANY_CLAIM_DISPUTE_NOTIFY_EMAIL') ?? '')
      .trim() || 'hello@plano.app'

  const reasonText = typeof dRow.reason === 'string' ? dRow.reason.trim() : ''
  const evidence =
    typeof dRow.evidence_url === 'string' && dRow.evidence_url.trim().length > 0
      ? `\nEvidence URL:\n${dRow.evidence_url.trim()}\n`
      : '\n(No evidence URL provided.)\n'

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const resend = resendKey ? new Resend(resendKey) : null

  console.log('company_claim_dispute_notify_admin', {
    disputeId,
    companyId: dRow.company_id,
    disputantId: user.id,
    notifyTo,
    hasResend: Boolean(resend),
  })

  if (resend) {
    try {
      await resend.emails.send({
        from: 'PLANO <hello@plano.app>',
        to: [notifyTo],
        subject: `Company claim dispute: ${companyRow.name as string}`,
        text: `A Plano member disputed the claim on a company profile.\n\nCompany: ${companyRow.name as string}\nProfile: ${companyUrl}\nDispute ID: ${disputeId}\nSubmitted: ${dRow.created_at as string}\n\nReason:\n${reasonText}\n${evidence}\nReview in the admin panel when available (Phase 8).`,
      })
    } catch (e) {
      console.error('Resend send failed (company claim dispute)', e)
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
