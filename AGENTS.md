# Agent Instructions (Plano) — Single Source of Truth

This file is the canonical agent contract for this repo. `CLAUDE.md` and `GEMINI.md` are thin pointers to it. Detailed domain rules live in `.cursor/rules/` (indexed below). Cross-session status lives in `docs/AI_STATUS.md`.

## Project Context

Plano is an architecture and mapping application ("The world's architecture, cataloged").
- **Domain**: Buildings, Architects, Maps, Collections, and Urban Planning.
- **Entities**: `Buildings` (not Movies), `Architects` (not Directors), `Collections`. The repo pivoted from a prior product — some legacy DB tables remain; never build against them.

## The Real Stack (verified 2026-07-06 — trust this over any older doc)

Single-app repo. **NOT a monorepo** — there is no Turborepo, no pnpm workspaces, no `apps/` or `packages/` directories, no Next.js, no React Native.

- **Framework**: React Router v7 **framework mode with SSR** on Vite 7, React 19, TypeScript.
- **Deploy**: Vercel via `@vercel/react-router`.
- **Backend**: Supabase — Postgres + PostGIS, Auth, Storage, Edge Functions (`supabase/functions/`).
- **Server state**: TanStack Query v5. **UI state**: URL search params first.
- **Styling**: Tailwind CSS v4 (tokens defined in CSS `@theme` in `src/index.css`; documented in `docs/DESIGN_TOKENS.md`) + shadcn/Radix primitives in `src/components/ui/`. For UI conformance work, the refreshed design system lives in `design-system/`: spec docs in `design-system/claude-code-package-v2/design-system/` (`PATTERNS`, `COMPONENTS`, `LAYOUT-AND-CHROME`, `MIGRATION`, `CHECKLIST`) and the 23 designed screens in `design-system/ui_kits/web/screens/`. On a design-decision conflict the design system wins and the repo is brought into line (see its `SOURCE-OF-TRUTH.md`). Editorial utilities (`.display`, `.headline`, `.eyebrow`, `.cta-link`, `.meta-code`, `.photo-placeholder`, `.accent-tag`) ship in `src/index.css`. **Doing a design-conformance PR? Start at [`docs/DESIGN_SYSTEM_CONFORMANCE_ROADMAP.md`](docs/DESIGN_SYSTEM_CONFORMANCE_ROADMAP.md)** — it names the remaining PRs, their owning files, the known deltas, and the gotchas; each entry is executable standalone.
- **Validation**: Zod at every boundary.

### Layout map

```
app/routes.ts                        Route manifest (~122 entries; re-exported by src/routes.ts)
src/root.tsx                         SSR document shell
src/entry.client.tsx / entry.server.tsx
src/api/*.route.ts                   App-owned resource routes (e.g. /api/version)
src/features/<domain>/               25 feature slices: {api,components,hooks,pages,types}
src/features/<domain>/api/*.route.ts Feature-owned resource routes (e.g. /api/feedback)
src/components/ui/                   Shared shadcn/Radix primitives
src/lib/supabase.server.ts           Server-side Supabase client (SSR, loaders, resource routes)
src/integrations/supabase/client.ts  Browser Supabase client
src/integrations/supabase/types.ts   Generated DB types — NEVER hand-edit; `npm run gen-types`
supabase/migrations/                 Timestamped SQL migrations
supabase/functions/                  Edge Functions
docs/                                Specs: PRD.md, DATA_CONTRACT.md, DESIGN_TOKENS.md, AI_STATUS.md, RUNBOOK.md, decisions/
```

### Commands

`npm run dev` · `build` · `typecheck` · `typecheck:strict` · `test` · `test:coverage` · `lint` · `lint:fix` · `gen-types`

There is no `turbo`, no workspace filtering. Run everything from the repo root.

## Session Start — Do This First

1. Read `docs/AI_STATUS.md` — check `KNOWN_ISSUES` and `SCHEMA_DRIFT_LOG` before touching code.
2. Read `.cursor/rules/06-agent-behaviour.mdc` — conduct, pre-flight checks, challenge protocol. Always active.
3. Read `.cursor/rules/00-architecture.mdc` — stack, forbidden patterns, state, caching. Always active.
4. Read `.cursor/rules/05-vertical-slice.mdc` — task sequencing and slice limits. Always active.

Then load the domain rule file for the work at hand:

| Task type | Rule file |
|---|---|
| Schema, RLS, migrations | `.cursor/rules/01-database.mdc` |
| Resource routes, loaders/actions, Edge Functions, DTOs | `.cursor/rules/02-api.mdc` |
| React components, UI, styling | `.cursor/rules/03-frontend.mdc` |
| Auth, guards, Supabase clients | `.cursor/rules/04-auth.mdc` |

## Hard Rules (summary — full detail in the rule files)

- **No `getSession()`** for authorization decisions. Always `getUser()`. (The one sanctioned exception lives in `src/lib/supabase.server.ts` for hydration token copying.)
- **No mock data or boolean auth flags.** Every feature connects to real Supabase.
- **No raw Tailwind palette colors** (`bg-blue-500`). Design token aliases only (`docs/DESIGN_TOKENS.md`).
- **No global state for domain data.** TanStack Query for server state; URL params for UI state.
- **No direct schema changes** via the Supabase Dashboard. Migrations only — write the timestamped file, apply it yourself via the Supabase MCP `apply_migration` tool, then run `npm run gen-types` and commit the regenerated types **in the same PR**.
- **No npm installs** without explicit user permission.
- **Feature `api/` modules own all Supabase queries.** Components and hooks never import `@/integrations/supabase/client` directly (ESLint `no-restricted-imports` enforces this; the CI warning ratchet fails any PR that adds a new violation).
- **Server-side identity only.** Every loader/action/resource route/Edge Function that writes data derives the user from `getUser()` — never from the request payload.
- **Warning ratchet**: if your change introduces a new ESLint warning (boundary imports, exhaustive-deps), fix it before handoff — CI fails when any warning bucket grows (`node scripts/check-eslint-ratchet.mjs`).
- **Boring technology.** Prefer the most mainstream library and the most conventional layout for this stack. Introducing a new dependency or a novel pattern requires a 5–10-line ADR in `docs/decisions/` naming the mainstream option rejected and why (on top of the existing rule that npm installs need explicit user permission).
- **Baselines only shrink.** Never modify a `*-baseline.json` file except to lower it. If a ratchet fails, the fix is the code, never the baseline.

## Definition of Done (every change, no exceptions)

1. `npm run check` passes locally before any commit — lint, typecheck, unit tests, migration check, the four debt ratchets, and RLS coverage. It runs the blocking CI checks that work locally; `npm run build`, the gitleaks secret scan, and the CI-only Types-staleness check (it diffs the PR against its base) complete the set.
2. New user-facing behavior ships **with its test in the same PR**. A critical-path feature gets a Playwright spec in `tests/e2e/`; logic gets Vitest unit tests. "Test later" is not permitted.
3. Any change to schema, API shape, env vars, commands, or architecture updates the corresponding doc **in the same PR**: regenerated `types.ts` + `docs/DATA_CONTRACT.md` for schema, `.env.example` for env vars, `docs/ARCHITECTURE.md` for structure, `docs/RUNBOOK.md` for commands/setup.
4. Debt baselines never go up; the fix is the code, never the baseline.
5. Work lands via complete PRs — **one PR = one complete, independently shippable feature** (a vertical slice touching every layer it needs: schema/DB → backend/API → frontend/UI). Ship the whole feature in one PR however many commits or files it takes; never split it into separate DB / API / UI PRs. See **[PR Sizing](#pr-sizing--one-pr--one-full-feature)** below for what counts as one PR and the only reasons to split. **Opening the PR is the agent's job, not the owner's** — when a feature is complete and green, the agent commits, pushes, runs `gh pr create`, and arms auto-merge (`gh pr merge --auto --squash`) **in the same turn, unprompted**. Ending a finished feature by asking the owner to trigger the PR (or waiting for a `/create-pr` command) is a rule violation — the owner is the CEO, not the release button (see `06-agent-behaviour.mdc` §7). Direct pushes to `main` are blocked by branch protection; human review is not required. GitHub merges once the required checks are green and deletes the head branch automatically. Start-of-session hygiene (`06-agent-behaviour.mdc` §0) prunes merged local branches and cuts new work from a fresh `origin/main`, so the local checkout never drifts from the self-cleaning remote. See [ADR 0005](docs/decisions/0005-auto-merge-on-green.md).

## PR Sizing — one PR = one full feature

**One PR = one complete, independently shippable feature: a vertical slice that touches every layer it needs (schema/DB → backend/API → frontend/UI) and delivers end-to-end value on its own.** It stays whole however many commits or files it takes. **Bias toward fewer, larger PRs** — every PR carries a fixed cost (a CI run, a human trigger, a review pass), and this owner is non-technical and won't do detailed per-PR review, so extra checkpoints add cost without value. A fragmented plan is the expensive failure, not a large PR.

**FORBIDDEN — horizontal slicing.** A "DB layer" PR, then a separate "API" PR, then a separate "UI" PR for the same feature. These are meaningless apart and none ships alone. They are one PR.

**Counts as ONE PR — do not split:**
- Full CRUD for one entity — including its search, sort, filter, empty state, and validation.
- A single third-party integration (Stripe, OpenAI, Resend, …) plus the UI it powers.
- A feature and the small capabilities that share its screen or flow.
- Two small entities that share one screen or one flow.

**Split into sequential, each-independently-shippable slices ONLY if one clearly applies** (else keep it whole — when in doubt, keep it whole):
1. **Data-heavy:** more than ~4 new tables/entities with independent business rules.
2. **Multiple integrations:** two or more unrelated complex third-party APIs in the same feature.
3. **Compound scope:** each half would be a right-sized, independently shippable feature on its own.
4. **Feature fusion:** the task bundles two or more distinct spec features that don't share a screen, flow, or primary entity.

**Too-small smells — merge into the adjacent task:** a migration with no backend or UI following it; adding a single field/button/column to an existing feature; a task whose whole scope is "create a file" or "update a config"; a task that only verifies what the adjacent task could verify itself; any task whose goal fits in under 10 words.

**Roadmap sizing anchor:** one task ≈ one feature section of the spec/PRD; a full single-product roadmap lands at roughly **15–30 coding tasks**. Well under that → features were fused; well over → tasks are just steps of one feature and must be merged.

**Meta work is sized differently.** Any change with no user-facing feature — docs, agent/process rules, CI/tooling, ADRs, pure refactors, design-precision passes — ignores the vertical-slice mandate and the 15–30 band. Size it by the **largest coherent, reviewable chunk**: a coupled, single-concern change is ONE PR however many steps it lists. Split meta work only for genuine independent deployability/reversibility (you'd bisect or revert one part alone) or genuine parallel execution.

**The test to apply every time:** if the parts are incoherent apart (each meaningless without the others) and none deploys on its own → ONE concern → ONE PR. Reserve extra PRs only for parts that genuinely stand alone.

## Supabase Edge Functions & Security

### Security Policy: The "Manual Gatekeeper" Pattern
Due to CORS preflight limitations in browsers, we **cannot** use Supabase's automatic `verify_jwt: true` for functions called directly from the frontend that handle file uploads/deletions.

**Policy for Storage Functions (`delete-file`, `delete-storage-recursive`, `generate-upload-url`):**
1.  **Configuration:** Must be set to `verify_jwt = false` in `config.toml` (or deployment config).
2.  **Implementation:** The code **MUST** manually verify authentication.
    * Step 1: Handle `OPTIONS` requests immediately (return 200 OK + CORS headers).
    * Step 2: Initialize Supabase client using the request's `Authorization` header.
    * Step 3: **MANDATORY:** Call `await supabase.auth.getUser()`. If this fails or returns no user, throw a 401 Unauthorized error immediately.
    * *Reasoning:* This allows CORS preflight to succeed while preventing unauthenticated access to sensitive data.

### Code Style
* When generating SQL or TypeScript for buildings, ensure geolocation handling (PostGIS) is accurate.

## Source-of-Truth Hierarchy

1. `src/integrations/supabase/types.ts` — what the schema *is* right now (regenerated from the live schema 2026-07-06, PR #1501). If types and live schema ever disagree, verify against the live DB via Supabase MCP before coding and log drift in `docs/AI_STATUS.md`.
2. `docs/DATA_CONTRACT.md` — what the schema *should be* (intent, business rules, DTOs).
3. `docs/PRD.md` — what the product should *do*.
4. The migration being written — what the schema *will become* in this task.

When sources disagree, follow this order and log drift in `docs/AI_STATUS.md`.
