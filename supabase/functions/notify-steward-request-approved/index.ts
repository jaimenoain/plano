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
    .select('id, company_id, requester_user_id, status, requester_notified_at')
    .eq('id', requestId)
    .maybeSingle()

  if (reqErr || !reqRow) {
    return new Response(JSON.stringify({ error: 'Request not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (reqRow.status !== 'approved') {
    return new Response(JSON.stringify({ error: 'Request is not approved' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: ownerRow, error: ownErr } = await admin
    .from('company_stewards')
    .select('id')
    .eq('company_id', reqRow.company_id)
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  if (ownErr || !ownerRow) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (reqRow.requester_notified_at) {
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

  const requesterId = reqRow.requester_user_id as string
  const { data: uwrap, error: gErr } = await admin.auth.admin.getUserById(requesterId)
  const requesterEmail =
    gErr || !uwrap?.user?.email ? null : uwrap.user.email.trim().toLowerCase()

  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://plano.app').replace(/\/$/, '')
  const companyUrl = `${siteUrl}/company/${companyRow.slug}`

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey && requesterEmail) {
    try {
      const resend = new Resend(resendKey)
      await resend.emails.send({
        from: 'PLANO <hello@plano.app>',
        to: [requesterEmail],
        subject: `You're now a steward of ${companyRow.name} on Plano`,
        text: `Your request to help manage ${companyRow.name} was approved.\n\nOpen the company page:\n${companyUrl}\n`,
      })
    } catch (e) {
      console.error('Resend send failed (steward approved)', e)
      return new Response(JSON.stringify({ error: 'Could not send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } else if (!requesterEmail) {
    console.log('steward_approved_skip_email_no_address', { requestId, requesterId: requesterId })
  }

  const { error: updErr } = await admin
    .from('company_steward_requests')
    .update({ requester_notified_at: new Date().toISOString() })
    .eq('id', requestId)
    .is('requester_notified_at', null)

  if (updErr) {
    return new Response(JSON.stringify({ error: 'Could not update request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
