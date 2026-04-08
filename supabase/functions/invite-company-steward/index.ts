import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  if (email.length < 3 || email.length > 320) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

  let body: { companyId?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const companyId = typeof body.companyId === 'string' ? body.companyId.trim() : ''
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '')

  if (!companyId || !email || !isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Invalid company or email' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: ownerRow, error: ownerErr } = await userClient
    .from('company_stewards')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  if (ownerErr) {
    return new Response(JSON.stringify({ error: 'Could not verify permissions' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!ownerRow) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  const { data: stewList } = await admin.from('company_stewards').select('user_id').eq('company_id', companyId)

  const uids = [...new Set((stewList ?? []).map((r) => r.user_id as string))]
  const emailNorm = email
  for (const uid of uids) {
    const { data: uwrap, error: gErr } = await admin.auth.admin.getUserById(uid)
    if (gErr || !uwrap?.user?.email) continue
    if (normalizeEmail(uwrap.user.email) === emailNorm) {
      return new Response(JSON.stringify({ error: 'User is already a steward' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const { data: companyRow, error: coErr } = await admin.from('companies').select('name, slug').eq('id', companyId).single()

  if (coErr || !companyRow) {
    return new Response(JSON.stringify({ error: 'Company not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const tokenHex = randomHex64()
  const tokenBytes = hexStringToBytes(tokenHex)
  const hashBuffer = await crypto.subtle.digest('SHA-256', tokenBytes)
  const tokenHash = new Uint8Array(hashBuffer)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 14)

  const { data: inviteRow, error: insErr } = await admin
    .from('company_steward_invites')
    .insert({
      company_id: companyId,
      email_normalized: email,
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (insErr || !inviteRow) {
    return new Response(JSON.stringify({ error: 'Could not create invite' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://plano.app').replace(/\/$/, '')
  const acceptUrl = `${siteUrl}/accept-company-steward?token=${tokenHex}`

  console.log('company_steward_invite_created', {
    inviteId: inviteRow.id,
    companyId,
    email,
    companyName: companyRow.name,
  })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey) {
    try {
      const resend = new Resend(resendKey)
      await resend.emails.send({
        from: 'PLANO <hello@plano.app>',
        to: [email],
        subject: `You're invited to help manage ${companyRow.name} on Plano`,
        text: `You've been invited to join ${companyRow.name} as a steward on Plano.\n\nAccept the invite (sign in with this email if prompted):\n${acceptUrl}\n\nThis link expires in 14 days.`,
      })
    } catch (e) {
      console.error('Resend send failed', e)
    }
  }

  return new Response(JSON.stringify({ ok: true, inviteId: inviteRow.id }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
