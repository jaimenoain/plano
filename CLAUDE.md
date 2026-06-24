# CLAUDE.md

This is a Turborepo monorepo with a Next.js 14+ web app, React Native/Expo mobile app, and Supabase backend.

## Monorepo Structure

```
apps/web          — Next.js 14 App Router (TypeScript strict)
apps/mobile       — React Native + Expo (EAS)
packages/supabase — Shared DB types (auto-generated — never hand-edit)
docs/             — Specs: PRD.md, DATA_CONTRACT.md, DESIGN_TOKENS.md, COMPONENT_SPEC.md, AI_STATUS.md
```

## Session Start — Do This First

1. Read `docs/AI_STATUS.md` — check `KNOWN_ISSUES` and `SCHEMA_DRIFT_LOG` before touching any code.
2. Read `.cursor/rules/06-agent-behaviour.mdc` — governs conduct, pre-flight checks, challenge protocol, and source-of-truth hierarchy. Always active.
3. Read `.cursor/rules/00-architecture.mdc` — stack, forbidden patterns, state management, caching strategy. Always active.
4. Read `.cursor/rules/05-vertical-slice.mdc` — task sequencing, thin-slice complexity limits, phase structure. Always active.

Then load the domain-specific rule file for the work at hand:

| Task type | Rule file |
|---|---|
| Schema, RLS, migrations | `.cursor/rules/01-database.mdc` |
| API routes, Server Actions, DTOs | `.cursor/rules/02-api.mdc` |
| React components, UI, styling | `.cursor/rules/03-frontend.mdc` |
| Auth, middleware, Supabase clients | `.cursor/rules/04-auth.mdc` |

## Hard Rules (summary — full detail in the rule files above)

- **No `getSession()`** anywhere. Always `getUser()`.
- **No mock data or boolean auth flags.** Every feature connects to real Supabase.
- **No raw Tailwind palette colors** (`bg-blue-500`). Use design token aliases only.
- **No global state for domain data.** React Query for server state; URL params for UI state.
- **No direct schema changes** via Supabase Dashboard. Migrations only — the agent writes the timestamped migration file and applies it itself with the Supabase MCP `apply_migration` tool (credentials in `.env.local`); never ask the user to run it in the Supabase UI.
- **No npm installs** without explicit user permission.
- **Services own all Supabase queries.** Components never call `supabase.from()` directly.
- **Every Server Action** must call `getUser()` and derive identity server-side — never from the request payload.

## Source-of-Truth Hierarchy

1. `packages/supabase/src/database.types.ts` — what the schema *is* right now
2. `docs/DATA_CONTRACT.md` — what the schema *should be* (intent, business rules, DTOs)
3. `docs/PRD.md` — what the product should *do*
4. Migration being written — what the schema *will become* in this task

When sources disagree, follow this order and log drift in `docs/AI_STATUS.md`.
