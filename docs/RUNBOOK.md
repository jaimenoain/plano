# Runbook — fresh clone to deploy

The from-zero guide for a developer (or agent) seeing this repo for the first time. Every command here was executed and verified on 2026-07-09. If a command stops matching reality, fix this doc in the same PR that changed the behavior (Definition of Done, `AGENTS.md`).

## Prerequisites

- **Node 22** — `.nvmrc` (22.22.0) is authoritative; `nvm use` picks it up. CI pins from the same file.
- **npm** (ships with Node). No pnpm/yarn/turbo here.
- Optional: [GitHub CLI](https://cli.github.com/) (`gh`) for PRs, [nvm](https://github.com/nvm-sh/nvm) for Node versions.
- Only for schema work: the [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase` or `npx supabase`) — `npm run gen-types` shells out to it and it must be authenticated (`supabase login`) with access to the hosted project. You'll also need the repo owner to invite you to the Supabase project before you can read API keys or run `gen-types`. Day-to-day feature work needs none of this.

## Setup

```bash
git clone https://github.com/jaimenoain/plano.git && cd plano
nvm use
npm ci        # exact locked deps; also wires the git hooks (prepare → core.hooksPath .githooks)
cp .env.example .env.local
```

Then fill `.env.local` — every variable is documented inline in [`.env.example`](../.env.example). The essentials to get the app running:

| Variable | Where it comes from |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase dashboard → project → Settings → API |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Cloud console → Maps JavaScript API key |
| `ACTIVE_USER_EMAIL`, `ACTIVE_USER_PASSWORD` | Dedicated QA account (`role='test_user'`) — only needed for E2E tests |

Everything else in `.env.example` is optional or server-side (see its comments). `.env`/`.env.local` are gitignored — never commit real values.

There is **no local Supabase for feature work**: the app always runs against the hosted Supabase project, and unit tests mock Supabase entirely, so they work with no env setup at all. The one exception is **rehearsing a destructive migration** — there you *do* restore a dump into a throwaway local Postgres and run the migration against it first (see [Data safety](#data-safety--backups--restore) below). That reconciles the charter's rehearsal clause ([PRINCIPLES.md §7](PRINCIPLES.md)) with "no local Supabase": no local Supabase *stack*, but a local restore-from-dump when — and only when — a migration is destructive.

## Run

```bash
npm run dev     # http://localhost:8080 (port pinned in vite.config.ts), SSR via Vite
```

## Test

```bash
npm run test           # unit/component tests (Vitest) — no env needed
npm run test:coverage  # same + coverage; CI enforces the floor from vitest.config.ts
npm run test:e2e       # Playwright, specs in tests/e2e/ — needs the QA creds in .env.local
```

E2E runs against the hosted (production) Supabase using the dedicated QA account — a deliberate, documented exception ([ADR 0004](decisions/0004-e2e-against-production-with-qa-accounts.md)). E2E specs must only touch QA-account data and never perform destructive global operations. Playwright starts the dev server itself; first run may need `npx playwright install chromium`.

## Quality gates (before every commit)

```bash
npm run check   # lint + typecheck + unit tests + migration check + four debt ratchets + RLS coverage
```

This runs the blocking CI checks that can run locally. Three are not in it by design: `npm run build` (the exact command CI and Vercel run), the gitleaks **secret scan**, and **Types staleness** — the last diffs the PR against `origin/$GITHUB_BASE_REF`, so it only has meaning in CI, not on a local branch. Run `npm run build` before handoff to complete the set. A pre-push git hook runs lint + typecheck + unit tests automatically; a pre-commit hook checks migrations when you stage files under `supabase/migrations/`.

If a **ratchet** fails (ESLint warnings, `as any`, file size, strict-TS allowlist): fix the code; never edit the `*-baseline.json`. The failure output names exactly what regressed. Rationale: [ADR 0003](decisions/0003-ratchets-over-big-bang.md).

## Ship

1. Branch, commit, push — direct pushes to `main` are blocked.
2. Open a PR; the 10 required checks must pass (see [`CONTRIBUTING.md`](../CONTRIBUTING.md)). Want an AI review? Comment `@claude <request>` on the PR; a scheduled review of everything on `main` also runs on its own cron, batched so it only spends a pass once 3+ commits, 200+ changed lines, or 7 days have accumulated ([ADR 0027](decisions/0027-ai-review-batched-and-routed.md)). Findings land on an `ai-review`-labelled issue; an `ai-review-broken` issue means the reviewer itself is failing, not that `main` is.
3. Merge → **Vercel deploys `main` automatically** (`@vercel/react-router`; config in [`vercel.json`](../vercel.json), details in [`LAUNCH_HOSTING.md`](LAUNCH_HOSTING.md)).

Schema changes never go through the Supabase dashboard: write a timestamped migration in `supabase/migrations/`, apply it via the Supabase MCP `apply_migration`, run `npm run gen-types`, and commit both in the same PR — full workflow in [`migrations.md`](migrations.md). **If the migration is destructive or irreversible** (drops/renames a column or table, deletes rows, rewrites data), take a restore point first — see [Data safety](#data-safety--backups--restore).

## Data safety — backups & restore

Supabase is on the **free plan**, which has no automated backups and no point-in-time recovery, so recoverability is scripted, not a plan feature ([ADR 0012](decisions/0012-data-safety-rails.md), realizing [PRINCIPLES.md §7](PRINCIPLES.md)). Two rails:

**1. Daily backup (automatic).** [`.github/workflows/backup.yml`](../.github/workflows/backup.yml) dumps production (roles + schema + data, via the Supabase CLI so PostGIS and the `supabase_admin`-owned `auth`/`storage` schemas come through), encrypts it (AES-256), and uploads it as a 90-day GitHub artifact — off Supabase. It stays green but does nothing until two repo secrets exist:

| Secret | Where it comes from |
|---|---|
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → Connection string → **Session pooler** URI (IPv4; runners can't use the direct IPv6 endpoint), password filled in |
| `BACKUP_ENCRYPTION_PASSPHRASE` | A strong passphrase you generate. **Also store it in a password manager** — without it the backups can't be decrypted |

Trigger a manual run to verify: **Actions → Backup → Run workflow**. To restore, download the artifact, decrypt (`gpg -d db-backup-*.tar.gz.gpg > b.tar.gz`), unpack, and replay in order: `cat roles.sql schema.sql data.sql | psql "$SUPABASE_DB_URL"`.

**2. Pre-destructive-migration restore point + rehearsal (manual).** Before applying a destructive migration, take a point-in-time restore point and rehearse the change locally:

```bash
export SUPABASE_DB_URL='postgresql://...'   # same Session-pooler string as the secret
node scripts/backup-restore-point.mjs       # writes backups/restore-point-<UTC>.tar.gz (gitignored)
```

Then, before touching production:
1. **Rehearse** — restore the dump into a throwaway local Postgres (`createdb rehearsal && cat backups/restore-point-*/{roles,schema,data}.sql | psql rehearsal`), apply the new migration there, and confirm it behaves. This is the charter's "rehearsed against a local copy" step.
2. **Apply** to production via the Supabase MCP `apply_migration` as usual.
3. **Roll back** only if production is damaged: replay the restore point over production (`cat backups/restore-point-*/{roles,schema,data}.sql | psql "$SUPABASE_DB_URL"`).

Delete the local dump once the migration is confirmed good — it contains customer data.

> The *automated* restore point (a hook that dumps on every destructive change) and verified PITR are deferred: **adopt the template's pattern once it lands** (it assumes a paid Supabase tier). On the free tier the scripted dump above is what ships. Upgrading Supabase to a paid tier + PITR supersedes rail 1.

## Observability — production errors

Runtime errors real users hit go to **Sentry** (`@sentry/react`; [ADR 0014](decisions/0014-production-error-tracking.md)). Where to look and how it's gated:

- **See errors:** the Sentry project dashboard (issues are grouped by exception). Errors carry the authenticated user id (via `setSentryUser`) but no other PII.
- **The one thing that turns it on:** the **`VITE_SENTRY_DSN`** environment variable in Vercel (Production scope). It is baked in at build time, so **setting or changing it needs a redeploy** to take effect. With no DSN, `initSentry()` ([`src/lib/sentry.ts`](../src/lib/sentry.ts)) is a no-op — dev and preview never emit, and a deploy missing the var silently captures nothing.
- **Verify it's live:** load production, trigger a client error (e.g. in the console: `setTimeout(() => { throw new Error("sentry-test") }, 0)`), and confirm a request to `…ingest.…sentry.io/api/<project>/envelope/` fires (DevTools Network) and the event appears in Sentry.
- **Scope:** client-side only, **errors only** — no performance tracing or session replay (all sample rates `0`, by design). SSR-side capture is not wired.

## Scheduled jobs — the embassy weekly digest

`embassy-weekly-digest` runs `public.run_weekly_digest()` every **Monday 09:00 UTC**
(pg_cron). It snapshots one payload per active ambassador into
`public.embassy_digest_deliveries`, writes a `weekly_digest` in-app notification, and
fires one `pg_net` POST to the `send-weekly-digest` edge function, which sends the email.

- **Check a run:**
  `SELECT jobname, status, return_message, start_time FROM cron.job_run_details WHERE jobname = 'embassy-weekly-digest' ORDER BY start_time DESC LIMIT 5;`
  and for the HTTP leg `SELECT status_code, created FROM net._http_response ORDER BY created DESC LIMIT 5;`
- **Check delivery:**
  `SELECT user_id, week_start, notified_at, emailed_at, email_error FROM public.embassy_digest_deliveries WHERE week_start = date_trunc('week', now())::date - 7;`
  `notified_at` set with no notification row means the recipient opted out (the
  `before_insert_notifications` trigger drops it) — that is expected, not a fault.
- **Re-run a week safely:** `SELECT public.run_weekly_digest('2026-07-20');` — idempotent.
  The ledger's per-step gates mean it inserts nothing already delivered and re-fires the
  email dispatch only if rows still have `emailed_at IS NULL`.
- **Retry only the emails:** POST to `/functions/v1/send-weekly-digest` with the
  **service-role** bearer and `{"weekStart":"2026-07-20"}`. Add `"dryRun":true` to list
  recipients without sending, or `"onlyUserId":"<uuid>"` to send exactly one.
- **Dry-run the whole thing without side effects:** `BEGIN; SELECT public.run_weekly_digest('2026-07-20'); … ROLLBACK;` — `net.http_post` is transactional, so a rollback sends nothing.
- **Opt-out** is one key for both channels: `profiles.notification_preferences->>'weekly_digest' = 'false'` (UI: `/notifications` → settings → Embassy).
- **Turn off the ≥4-week inactivity skip** without a migration:
  re-schedule the job with `$$SELECT public.run_weekly_digest(NULL, 999)$$`.
- **Deploying the edge function** is manual — there is no deploy workflow:
  `npx supabase functions deploy send-weekly-digest --use-api`. It must NOT be added to
  `supabase/config.toml` (it relies on the default `verify_jwt = true` plus an in-code
  service-role check). It needs `RESEND_API_KEY` and `SITE_URL` in the function secrets.

## Templated notification emails (react-email under Deno)

Seven templates live in `supabase/functions/_shared/emails/`. Six edge functions render
them: `send-welcome-email`, `notify-collection-collaborator`, `notify-credited-entities`,
`notify-credit-outcome`, `notify-entity-claimed`, `send-weekly-digest`. (The other
email-sending functions — `invite-company-steward`, `notify-admin-dispute`,
`notify-steward-request*`, `verify-company-claim` — build HTML strings inline and are not
part of this stack.)

Two dependency rules are load-bearing, and CI cannot check either by execution because it
has no Deno:

- **Never import `@react-email/components`** (the barrel). It side-effect-imports
  `@react-email/render` → `prettier`, which throws at module load under Deno and kills the
  worker at **boot** with a 500 `WORKER_ERROR`. There are **no function logs** in this
  state — only edge 500s — so it looks like the function was never called. Import from
  `_shared/emails/reactEmail.ts` instead.
- **Every react-email subpackage needs `?deps=react@18.3.1`.** Without it esm.sh gives each
  subpackage its own React copy and rendering dies with React error #31. This one boots
  fine and fails only at send time.

Functions must also `render()` to HTML themselves and pass `html:` to Resend, never
`react:` — that path uses Resend's own bundled render, whose React copy we do not control.

- **Before deploying, run the real check** (needs Deno, `~/.deno/bin/deno`):
  `~/.deno/bin/deno run -A --no-check scripts/check-email-edge-functions.tsx`
  It boots every function module and renders every template.
  `tests/unit/email-templates-no-barrel.test.ts` asserts the same rules statically in CI.
- **Deploy** (manual, no workflow):
  `npx supabase functions deploy <name> --project-ref lnqxtomyucnnrgeapnzt --use-api`
- **Smoke-test without emailing anyone:** POST `{}` to the function. A booted worker
  answers with its own JSON error (`{"error":"Unauthorized"}`); a worker that died at boot
  answers `WORKER_ERROR`. To exercise rendering and the Resend call, send to
  `delivered@resend.dev` (Resend's sink address — no human receives it).

## When things break

| Symptom | Do this |
|---|---|
| Typecheck errors about missing/wrong DB columns | Generated types are stale → `npm run gen-types` (regenerates `src/integrations/supabase/types.ts` from the live schema; never hand-edit it) |
| `Migration check failed` (commit hook or CI) | Filename collision or ordering problem — the error names the files; see [`migrations.md`](migrations.md) |
| A ratchet check fails | Fix the code the output names; do not touch the baseline file |
| E2E fails with `ACTIVE_USER_EMAIL / ACTIVE_USER_PASSWORD not set` | Add the QA credentials to `.env.local` |
| Users see old JS chunks / weird hydration errors right after a deploy | The `__manifest` CDN-cache guard should prevent this (`scripts/patch-vercel-manifest-cache.js`, runs in `npm run build`) — if it recurs, check that the postbuild patch still ran in the Vercel build log |
| App boots but every query fails | `.env.local` Supabase values missing/wrong — compare against `.env.example` |
| A building exists in the DB but no search, map, or list returns it | Check whether a merge orphaned it: `psql "$SUPABASE_DB_URL" -f scripts/verify_merge_chains.sql`. Every discovery RPC filters `is_deleted`, so a merge that leaves a group with no live survivor hides all of its members at once — see [ADR 0022](decisions/0022-building-merge-invariants.md) |
| An RPC behaves like an older version than the repo's latest migration | Don't trust `supabase_migrations.schema_migrations` (it records only a fraction of applied migrations) — probe the object: `psql "$SUPABASE_DB_URL" -Atc "select pg_get_functiondef(oid) from pg_proc where proname='<fn>'"` and diff against the newest migration that defines it |
| Need to see a production runtime error | Check Sentry (see [Observability](#observability--production-errors)); if nothing is captured, confirm `VITE_SENTRY_DSN` is set in Vercel Production and the app was redeployed after it was set |
| An edge function returns 500 `WORKER_ERROR` with **no function logs at all** | It died at boot, before serving. For the email functions this is almost always a `@react-email/components` barrel import — see [Templated notification emails](#templated-notification-emails-react-email-under-deno). Reproduce locally: `~/.deno/bin/deno run -A --no-check scripts/check-email-edge-functions.tsx` |
| A notification email 403s with `The plano.app domain is not verified` | Resend has no verified `plano.app` domain, so it only accepts sends to the Resend account owner's own address. Verify the domain at https://resend.com/domains (DNS records) — no code change helps |
| Supabase emails a **database size** quota warning | This is Postgres, not Storage — they are separate quotas, and photos already live in S3, so moving files changes nothing here. Find the real consumer before deleting anything: `psql "$SUPABASE_DB_URL" -f scripts/db-size-report.sql`. The usual answer is an append-only log table with no retention; see [ADR 0028](decisions/0028-building-audit-logs-store-deltas.md) |
| Something in the code contradicts the docs | Don't silently pick one: check `docs/AI_STATUS.md` (known issues, drift log) and log the drift there per `AGENTS.md` |
