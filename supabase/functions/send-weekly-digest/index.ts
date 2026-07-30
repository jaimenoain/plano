// Embassy weekly digest mailer (Roadmap 3.2).
//
// Invoked by public.run_weekly_digest() via pg_net, every Monday 09:00 UTC. Reads the
// un-emailed rows for a week from the ledger, mails each one, and stamps emailed_at per
// recipient so a mid-loop crash resumes with no double-send.
//
// AUTH: this function is deliberately absent from supabase/config.toml, so the platform's
// verify_jwt=true is the outer gate. That alone is NOT sufficient — verify_jwt accepts any
// logged-in user's JWT, not just the service role — so the bearer token is compared against
// SUPABASE_SERVICE_ROLE_KEY below. There is no browser caller, hence no CORS/OPTIONS block.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import React from 'https://esm.sh/react@18.3.1'
import { WeeklyDigestEmail } from '../_shared/emails/WeeklyDigestEmail.tsx'
import {
  chapterName,
  digestPreviewLine,
  digestRows,
  digestSubject,
  formatTasksLabel,
  formatWeekLabel,
  taskRows,
  type WeeklyDigestPayload,
} from '../_shared/weeklyDigestCopy.ts'

interface PendingDigestRow {
  user_id: string
  week_start: string
  email: string
  username: string
  payload: WeeklyDigestPayload
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  // A 5xx here is the one case a human must act on, so it is the only 5xx we emit.
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('send_weekly_digest: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set')
    return json(500, { error: 'Server configuration error' })
  }
  if (!resendApiKey) {
    console.error('send_weekly_digest: RESEND_API_KEY is not set')
    return json(500, { error: 'Email is not configured' })
  }

  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (bearer !== serviceRoleKey) {
    return json(403, { error: 'Forbidden' })
  }

  let body: { weekStart?: string | null; dryRun?: boolean; onlyUserId?: string } = {}
  try {
    body = await req.json()
  } catch {
    // An empty body is fine — every field is optional.
  }

  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://plano.app').replace(/\/$/, '')
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const resend = new Resend(resendApiKey)

  const { data, error } = await admin.rpc('get_pending_weekly_digest_emails', {
    p_week_start: body.weekStart ?? null,
    p_limit: 200,
  })

  if (error) {
    console.error('send_weekly_digest: could not read pending digests', error)
    return json(500, { error: 'Could not read pending digests' })
  }

  const rows = ((data ?? []) as PendingDigestRow[]).filter(
    (row) => !body.onlyUserId || row.user_id === body.onlyUserId
  )

  let sent = 0
  let failed = 0

  for (const row of rows) {
    const payload = row.payload ?? {}
    const chapter = chapterName(payload)

    if (body.dryRun) {
      console.log('send_weekly_digest_dry_run', {
        userId: row.user_id,
        weekStart: row.week_start,
        subject: digestSubject(chapter),
      })
      sent += 1
      continue
    }

    try {
      await resend.emails.send({
        from: 'PLANO <hello@plano.app>',
        to: row.email,
        subject: digestSubject(chapter),
        react: React.createElement(WeeklyDigestEmail, {
          recipientName: row.username || 'Ambassador',
          chapterName: chapter,
          weekLabel: formatWeekLabel(payload.weekStart, payload.weekEnd),
          previewLine: digestPreviewLine(payload),
          youRows: digestRows(payload.you),
          youTotal: payload.you?.total ?? 0,
          chapterRows: digestRows(payload.chapter),
          chapterTotal: payload.chapter?.total ?? 0,
          activeMembers: payload.chapter?.activeMembers ?? 0,
          tasksLabel: formatTasksLabel(payload.tasks),
          taskRows: taskRows(payload.tasks),
          tasksUrl: `${siteUrl}/embassy/contribute`,
          impactUrl: `${siteUrl}/embassy/impact`,
          settingsUrl: `${siteUrl}/notifications`,
          siteUrl,
        }),
      })

      await admin
        .from('embassy_digest_deliveries')
        .update({ emailed_at: new Date().toISOString(), email_error: null })
        .eq('user_id', row.user_id)
        .eq('week_start', row.week_start)

      sent += 1
    } catch (err) {
      // Record and continue. pg_net is fire-and-forget with no retry, so failing the
      // whole request buys nothing — the error is durable in email_error and a re-invoke
      // retries exactly the rows that are still unmarked.
      failed += 1
      console.error('send_weekly_digest: send failed', { userId: row.user_id, err: String(err) })
      await admin
        .from('embassy_digest_deliveries')
        .update({ email_error: String(err).slice(0, 500) })
        .eq('user_id', row.user_id)
        .eq('week_start', row.week_start)
    }
  }

  console.log('send_weekly_digest', {
    weekStart: body.weekStart ?? null,
    candidates: rows.length,
    sent,
    failed,
    dryRun: Boolean(body.dryRun),
  })

  return json(200, {
    ok: true,
    weekStart: body.weekStart ?? null,
    sent,
    failed,
    dryRun: Boolean(body.dryRun),
  })
})
