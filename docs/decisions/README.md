# Decision records

Short records of decisions that shape this repo — the "why" a new developer can't recover from the code alone. One file per decision, numbered, never rewritten after acceptance (add a new record that supersedes instead).

Format: context → decision → consequences. Keep them under a page.

| # | Decision |
|---|---|
| [0001](0001-react-router-ssr-on-vercel-with-supabase.md) | React Router v7 SSR on Vercel, Supabase as the only backend |
| [0002](0002-migration-collision-baseline.md) | Grandfather migration filename collisions; never rename applied migrations |
| [0003](0003-ratchets-over-big-bang.md) | Debt ratchets over big-bang cleanups; baselines only shrink |
| [0004](0004-e2e-against-production-with-qa-accounts.md) | E2E tests run against production Supabase with dedicated QA accounts |
| [0005](0005-auto-merge-on-green.md) | Auto-merge on green; human review not required, arming automated |
| [0006](0006-nightly-heavy-tier.md) | Nightly heavy tier: one scheduled AI review + E2E, off the PR path |
| [0007](0007-worktree-lifecycle.md) | Worktree lifecycle: in-repo, fresh-based, dies with its PR |
| [0008](0008-adopt-principles-charter.md) | Adopt the operating-principles charter above ADRs and rules |
| [0009](0009-username-canonical-in-profiles.md) | `profiles.username` is canonical; auth metadata is a synced mirror |
| [0010](0010-drop-strict-status-checks.md) | Drop strict status checks; a branch need not be up-to-date to merge |
| [0011](0011-fail-closed-automerge-preflight.md) | Auto-merge preflight fails closed: refuse to arm when main is unprotected |
| [0012](0012-data-safety-rails.md) | Data-safety rails on the free tier: scheduled encrypted backups + pre-destructive-migration restore point |
| [0013](0013-session-pipeline-health-check.md) | Session-start pipeline-health check; the nightly AI review does not page |
| [0014](0014-production-error-tracking.md) | Production error tracking via Sentry (client-side, errors-only) |
| [0015](0015-data-layer-import-boundary.md) | Data-layer import boundary: no direct Supabase client / deep cross-feature imports (ESLint, warn + ratchet) |
| [0016](0016-design-token-guard.md) | Raw-hex design-token guard: no hex literals in swept design surfaces (ESLint, error) |
| [0017](0017-gitleaks-secret-scan.md) | Gitleaks secret scan on every PR; findings are rotated, never fingerprint-silenced |
| [0018](0018-types-staleness-gate.md) | Types-staleness gate: a migration must regen `types.ts` or carry a `types-neutral` marker |
| [0019](0019-risk-based-uat.md) | Risk-based, automation-first UAT: per-phase `X.98` gate only when depended on, plus one Final UAT |
