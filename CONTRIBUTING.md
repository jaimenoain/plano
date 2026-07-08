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

Human PR reviews are deliberately not required (solo-maintainer repo); an advisory AI review runs on PRs instead.

## Ratchet philosophy

Debt baselines (ESLint warnings, and any other `*-baseline.json`) may only shrink. If a ratchet check fails, **resolve the offending item; do not edit the baseline.** See `docs/decisions/` for the rationale.

## Local quality gates

Run before pushing — these are exactly what CI runs:

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

A pre-commit hook (installed via `npm ci` → `prepare`) lints migrations when you stage files under `supabase/migrations/`.
