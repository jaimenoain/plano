// Pre-deploy check for the templated-email edge functions, run under Deno — the runtime
// the platform actually boots them in, and the only place their two real failure modes
// are visible. CI cannot do this: it has no Deno, so `npm run check` never evaluates a
// single line of this code.
//
//   ~/.deno/bin/deno run -A --no-check scripts/check-email-edge-functions.tsx
//
// Two phases, matching the two ways this stack has broken in production:
//
//   BOOT   — evaluates each function module with Deno.serve stubbed out. Catches the
//            `@react-email/components` barrel pulling in prettier, which throws at module
//            load and kills the worker with a 500 WORKER_ERROR before any request is
//            served, writing no function logs at all.
//   RENDER — renders every template to HTML. Catches React error #31, which happens when
//            a subpackage is imported without `?deps=react@18.3.1` and brings its own
//            React copy. That one boots fine and only fails at send time.
//
// tests/unit/email-templates-no-barrel.test.ts asserts the same rules statically so CI
// still catches a regression; this script is the version that proves them by execution.
//
// Exits non-zero if any module fails to boot or any template fails to render.

import React from 'https://esm.sh/react@18.3.1'
import { render } from 'https://esm.sh/@react-email/render@0.0.9?deps=react@18.3.1,react-dom@18.2.0'

import { WelcomeEmail } from '../supabase/functions/_shared/emails/WelcomeEmail.tsx'
import { CollectionCollaboratorEmail } from '../supabase/functions/_shared/emails/CollectionCollaboratorEmail.tsx'
import { CreditNotificationEmail } from '../supabase/functions/_shared/emails/CreditNotificationEmail.tsx'
import { CreditOutcomeEmail } from '../supabase/functions/_shared/emails/CreditOutcomeEmail.tsx'
import { EntityClaimedEmail } from '../supabase/functions/_shared/emails/EntityClaimedEmail.tsx'
import { ResetPasswordEmail } from '../supabase/functions/_shared/emails/ResetPasswordEmail.tsx'
import { WeeklyDigestEmail } from '../supabase/functions/_shared/emails/WeeklyDigestEmail.tsx'

const siteUrl = 'https://plano.app'

// deno-lint-ignore no-explicit-any
const cases: Array<[string, any, Record<string, unknown>]> = [
  ['WelcomeEmail', WelcomeEmail, { name: 'Ada', actionUrl: `${siteUrl}/discover` }],
  [
    'CollectionCollaboratorEmail',
    CollectionCollaboratorEmail,
    {
      inviterName: 'Ada',
      collectionName: 'Brutalist London',
      collectionUrl: `${siteUrl}/ada/map/brutalist-london`,
      siteUrl,
    },
  ],
  [
    'CreditNotificationEmail',
    CreditNotificationEmail,
    {
      buildingName: 'Farnsworth House',
      buildingImageUrl: `${siteUrl}/img.jpg`,
      buildingPageUrl: `${siteUrl}/building/farnsworth-house`,
      claimProfileUrl: `${siteUrl}/claim`,
      credits: [
        { roleLabel: 'Architect', entityLine: 'Mies van der Rohe', removeUrl: `${siteUrl}/x` },
      ],
    },
  ],
  [
    'CreditOutcomeEmail-verified',
    CreditOutcomeEmail,
    {
      outcome: 'verified',
      buildingName: 'Farnsworth House',
      entityLine: 'Mies van der Rohe',
      buildingPageUrl: `${siteUrl}/building/farnsworth-house`,
      siteUrl,
    },
  ],
  [
    'CreditOutcomeEmail-hidden',
    CreditOutcomeEmail,
    {
      outcome: 'hidden',
      buildingName: 'Farnsworth House',
      entityLine: 'Mies van der Rohe',
      buildingPageUrl: `${siteUrl}/building/farnsworth-house`,
      siteUrl,
    },
  ],
  ['EntityClaimedEmail', EntityClaimedEmail, { personName: 'Mies van der Rohe', siteUrl }],
  [
    'ResetPasswordEmail',
    ResetPasswordEmail,
    { resetLink: `${siteUrl}/reset-password?token=x`, userEmail: 'ada@example.com' },
  ],
  [
    'WeeklyDigestEmail',
    WeeklyDigestEmail,
    {
      recipientName: 'Ada',
      chapterName: 'London',
      weekLabel: '21–27 July',
      previewLine: 'Your week in London.',
      youRows: [{ label: 'photos added', count: 3 }],
      youTotal: 3,
      chapterRows: [{ label: 'buildings added', count: 12 }],
      chapterTotal: 12,
      activeMembers: 5,
      tasksLabel: '2 tasks waiting',
      taskRows: [{ label: 'missing photos', count: 2 }],
      tasksUrl: `${siteUrl}/embassy/contribute`,
      impactUrl: `${siteUrl}/embassy/impact`,
      settingsUrl: `${siteUrl}/notifications`,
      siteUrl,
    },
  ],
]

let failed = 0

// ---- BOOT ----------------------------------------------------------------------------
// Stubbed so importing a function evaluates its module (the real boot path) and then
// returns, instead of starting a server and hanging.
;(Deno as unknown as { serve: unknown }).serve = () => ({ finished: Promise.resolve() })

const functions = [
  'send-welcome-email',
  'notify-collection-collaborator',
  'notify-credited-entities',
  'notify-credit-outcome',
  'notify-entity-claimed',
  'send-weekly-digest',
]

for (const name of functions) {
  try {
    await import(`../supabase/functions/${name}/index.ts`)
    console.log(`boot ok   ${name}`)
  } catch (err) {
    console.error(`boot FAIL ${name}: ${err instanceof Error ? err.message : String(err)}`)
    failed += 1
  }
}

console.log('')

// ---- RENDER --------------------------------------------------------------------------
for (const [name, Tpl, props] of cases) {
  try {
    const html = await render(React.createElement(Tpl, props))
    if (typeof html !== 'string' || !html.toLowerCase().includes('<html')) {
      console.error(`FAIL ${name}: rendered output is not HTML (${String(html).slice(0, 120)})`)
      failed += 1
      continue
    }
    console.log(`render ok   ${name} — ${html.length} bytes`)
  } catch (err) {
    console.error(`render FAIL ${name}: ${err instanceof Error ? err.message : String(err)}`)
    failed += 1
  }
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`)
  Deno.exit(1)
}
console.log(`\nAll ${functions.length} functions boot, all ${cases.length} renders OK.`)
