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
2. Open a PR; the 10 required checks must pass (see [`CONTRIBUTING.md`](../CONTRIBUTING.md)). Want an AI review? Comment `@claude <request>` on the PR; a scheduled review of everything on `main` also runs nightly ([ADR 0006](decisions/0006-nightly-heavy-tier.md)).
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

## When things break

| Symptom | Do this |
|---|---|
| Typecheck errors about missing/wrong DB columns | Generated types are stale → `npm run gen-types` (regenerates `src/integrations/supabase/types.ts` from the live schema; never hand-edit it) |
| `Migration check failed` (commit hook or CI) | Filename collision or ordering problem — the error names the files; see [`migrations.md`](migrations.md) |
| A ratchet check fails | Fix the code the output names; do not touch the baseline file |
| E2E fails with `ACTIVE_USER_EMAIL / ACTIVE_USER_PASSWORD not set` | Add the QA credentials to `.env.local` |
| Users see old JS chunks / weird hydration errors right after a deploy | The `__manifest` CDN-cache guard should prevent this (`scripts/patch-vercel-manifest-cache.js`, runs in `npm run build`) — if it recurs, check that the postbuild patch still ran in the Vercel build log |
| App boots but every query fails | `.env.local` Supabase values missing/wrong — compare against `.env.example` |
| Need to see a production runtime error | Check Sentry (see [Observability](#observability--production-errors)); if nothing is captured, confirm `VITE_SENTRY_DSN` is set in Vercel Production and the app was redeployed after it was set |
| Something in the code contradicts the docs | Don't silently pick one: check `docs/AI_STATUS.md` (known issues, drift log) and log the drift there per `AGENTS.md` |
