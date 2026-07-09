# Contributing

## How changes land

All work goes through pull requests against `main`. Direct pushes are blocked by branch protection (enforced for admins too).

## Branch protection (live configuration)

`main` requires these status checks to pass before merge, and the branch must be up to date:

- **Lint** — `npm run lint`, zero errors
- **Typecheck** — `npm run typecheck`, zero errors
- **Test** — `npm run test:coverage`, with a coverage floor enforced by Vitest thresholds
- **Build** — production build (`npm run build`)
- **Migrations lint** — `node scripts/check-migrations.mjs`
- **Warning ratchet** — `node scripts/check-eslint-ratchet.mjs`; no ESLint-warning bucket may grow
- **Secret scan** — gitleaks over the working tree
- **Types staleness** — a migration in the PR requires regenerated `types.ts` in the same PR
- **Debt ratchet** — `as any`/`@ts-ignore` count, file-size budgets, strict-TS allowlist (`scripts/check-*-ratchet.mjs`, `check-file-sizes.mjs`, `check-strict-allowlist.mjs`)
- **RLS coverage** — `node scripts/check-rls-coverage.mjs`; every public table created in migrations must enable row-level security (promoted from advisory 2026-07-09)

Advisory (non-blocking, promoted once stable): Playwright E2E, dependency audit, strict typecheck, and an AI review that posts inline comments. Human PR reviews are deliberately not required (solo-maintainer repo).

Every PR must also meet the **Definition of Done** in [`AGENTS.md`](AGENTS.md) — tests and doc updates ship in the same PR as the change.

## Ratchet philosophy

Debt baselines (ESLint warnings, and any other `*-baseline.json`) may only shrink. If a ratchet check fails, **resolve the offending item; do not edit the baseline.** See `docs/decisions/` for the rationale.

## Local quality gates

Run before committing — this mirrors the blocking CI checks (add `npm run build` for full parity):

```bash
npm run check
```

Git hooks (installed via `npm ci` → `prepare`): **pre-commit** lints migrations when you stage files under `supabase/migrations/`; **pre-push** runs lint + typecheck + unit tests (~1 minute). Bypass with `--no-verify` only in an emergency — CI runs the same gates anyway.

Fresh-clone setup, running the app, and troubleshooting live in [`docs/RUNBOOK.md`](docs/RUNBOOK.md).
