import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'
import { Resend } from 'https://esm.sh/resend@2.1.0'
import React from 'https://esm.sh/react@18.3.1'
import {
  CreditNotificationEmail,
  type CreditNotificationCreditLine,
} from '../_shared/emails/CreditNotificationEmail.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, Authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_CREDITS = 50
const MAX_EMAILS = 15

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  if (email.length < 3 || email.length > 320) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(buf)
}

async function sha256Utf8(s: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(s)
  return sha256(bytes)
}

function formatRoleLabel(role: string, roleCustom: string | null): string {
  if (role === 'other' && roleCustom?.trim()) return roleCustom.trim()
  return role
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

type EmbedName = { name: string } | null

function formatEntityLine(person: EmbedName, company: EmbedName): string {
  if (person && company) return `${person.name} @ ${company.name}`
  if (person) return person.name
  if (company) return company.name
  return 'Contributor'
}

function toPublicImageUrl(path: string | null | undefined, publicBase: string): string | undefined {
  if (!path?.trim()) return undefined
  const p = path.trim()
  if (p.startsWith('http') || p.startsWith('blob:') || p.startsWith('data:')) return p
  const cleanBase = publicBase.replace(/\/$/, '')
  const cleanPath = p.startsWith('/') ? p.slice(1) : p
  const finalPath = cleanPath.startsWith('review-images/') ? cleanPath : `review-images/${cleanPath}`
  return `${cleanBase}/${encodeURI(finalPath)}`
}

function buildingPagePath(shortId: number | null, slug: string | null): string {
  if (shortId != null) {
    const s = slug?.trim()
    if (s) return `/building/${shortId}/${s}`
    return `/building/${shortId}`
  }
  return '/'
}

type CreditRow = {
  id: string
  building_id: string
  added_by_user_id: string | null
  status: string
  role: string
  role_custom: string | null
  person: EmbedName | EmbedName[]
  company: EmbedName | EmbedName[]
}

function oneEmbed<T>(v: T | T[] | null): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('notify-credited-entities: request received', {
      method: req.method,
      url: req.url,
    })

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
      console.error('notify-credited-entities: missing env vars')
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('notify-credited-entities: missing or invalid auth header')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jwt = authHeader.replace('Bearer ', '')
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(jwt)

    if (userError || !user) {
      console.error('notify-credited-entities: auth verification failed', userError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('notify-credited-entities: auth success', { userId: user.id })

    let body: { creditIds?: unknown; emails?: unknown }
    try {
      body = await req.json()
      console.log('notify-credited-entities: body received', body)
    } catch (e) {
      console.error('notify-credited-entities: failed to parse JSON body', e)
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const creditIdsRaw = body.creditIds
    const emailsRaw = body.emails
    if (!Array.isArray(creditIdsRaw) || !Array.isArray(emailsRaw)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const creditIds = creditIdsRaw.filter((id): id is string => typeof id === 'string').map((id) => id.trim())
    const emailsIn = emailsRaw.filter((e): e is string => typeof e === 'string').map((e) => normalizeEmail(e))

    if (creditIds.length === 0 || creditIds.length > MAX_CREDITS) {
      return new Response(JSON.stringify({ error: 'Invalid credit list' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const emailSet = new Set<string>()
    const emails: string[] = []
    for (const e of emailsIn) {
      if (!e || !isValidEmail(e)) continue
      if (emailSet.has(e)) continue
      emailSet.add(e)
      emails.push(e)
      if (emails.length >= MAX_EMAILS) break
    }

    if (emails.length === 0) {
      return new Response(JSON.stringify({ error: 'Add at least one valid email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    console.log('notify-credited-entities: fetching credits', { count: creditIds.length })
    const { data: creditRows, error: crErr } = await admin
      .from('building_credits')
      .select(
        `
        id,
        building_id,
        added_by_user_id,
        status,
        role,
        role_custom,
        person:people(name),
        company:companies(name)
      `,
      )
      .in('id', creditIds)

    if (crErr || !creditRows || creditRows.length !== creditIds.length) {
      console.error('notify-credited-entities: credits not found or query failed', { crErr, count: creditRows?.length })
      return new Response(JSON.stringify({ error: 'Credits not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rows = creditRows as CreditRow[]
    const buildingId = rows[0]?.building_id
    for (const r of rows) {
      if (r.building_id !== buildingId) {
        return new Response(JSON.stringify({ error: 'Credits must belong to the same building' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (r.added_by_user_id !== user.id) {
        console.error('notify-credited-entities: ownership mismatch', { creditAddedBy: r.added_by_user_id, userId: user.id })
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (r.status === 'hidden') {
        return new Response(JSON.stringify({ error: 'Credit is no longer active' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { data: building, error: bErr } = await admin
      .from('buildings')
      .select('id, name, short_id, slug, main_image_url, community_preview_url')
      .eq('id', buildingId)
      .maybeSingle()

    if (bErr || !building) {
      console.error('notify-credited-entities: building not found', bErr)
      return new Response(JSON.stringify({ error: 'Building not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://plano.app').replace(/\/$/, '')
    const publicStorage =
      Deno.env.get('PUBLIC_STORAGE_URL')?.replace(/\/$/, '') ??
      `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public`

    const heroUrl =
      toPublicImageUrl(building.main_image_url, publicStorage) ??
      toPublicImageUrl(building.community_preview_url, publicStorage)

    const buildingPath = buildingPagePath(building.short_id, building.slug)
    const buildingPageUrl = `${siteUrl}${buildingPath}`

    type Minted = { creditId: string; tokenHex: string; tokenHash: Uint8Array }
    const minted: Minted[] = []

    for (const r of rows) {
      const { data: tokenHex, error: rpcErr } = await admin.rpc('generate_credit_removal_token', {
        credit_id: r.id,
      })

      if (rpcErr || typeof tokenHex !== 'string' || !/^[0-9a-f]{64}$/i.test(tokenHex)) {
        console.error('notify-credited-entities: rpc failed', rpcErr)
        return new Response(JSON.stringify({ error: 'Could not prepare notification' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const tokenBytes = hexToBytes(tokenHex.toLowerCase())
      const tokenHash = await sha256(tokenBytes)
      minted.push({ creditId: r.id, tokenHex: tokenHex.toLowerCase(), tokenHash })
    }

    const creditLines: CreditNotificationCreditLine[] = rows.map((r, i) => {
      const person = oneEmbed(r.person)
      const company = oneEmbed(r.company)
      return {
        roleLabel: formatRoleLabel(r.role, r.role_custom),
        entityLine: formatEntityLine(person, company),
        removeUrl: `${siteUrl}/remove-credit/${minted[i]!.tokenHex}`,
      }
    })

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('notify-credited-entities: missing RESEND_API_KEY')
      return new Response(JSON.stringify({ error: 'Email is not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resend = new Resend(resendKey)
    const subject = `You've been credited on ${building.name} — Plano`

    for (const email of emails) {
      const recipientHash = await sha256Utf8(email)

      try {
        console.log('notify-credited-entities: sending email to', email)
        const { error: sendErr } = await resend.emails.send({
          from: 'PLANO <hello@plano.app>',
          to: [email],
          subject,
          react: React.createElement(CreditNotificationEmail, {
            buildingName: building.name,
            buildingImageUrl: heroUrl ?? null,
            buildingPageUrl,
            claimProfileUrl: siteUrl,
            credits: creditLines,
          }),
        })

        if (sendErr) {
          console.error('notify-credited-entities: resend reported error', sendErr)
          throw new Error('Resend failed: ' + JSON.stringify(sendErr))
        }
      } catch (e) {
        console.error('notify-credited-entities: resend throw', e)
        return new Response(JSON.stringify({ error: 'Could not send email' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      for (let i = 0; i < minted.length; i++) {
        const m = minted[i]!
        const { error: insErr } = await admin.from('credit_notification_log').insert({
          credit_id: m.creditId,
          recipient_hash: recipientHash,
          token_hash: m.tokenHash,
        })
        if (insErr) {
          console.error('notify-credited-entities: log insert failed', insErr)
          return new Response(JSON.stringify({ error: 'Could not record notification' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    console.log('notify-credited-entities: success', {
      buildingId,
      creditCount: rows.length,
      recipientCount: emails.length,
    })

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-credited-entities: unexpected error', err)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred: ' + (err instanceof Error ? err.message : String(err)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
