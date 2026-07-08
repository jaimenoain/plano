# Architecture

One page for a developer inheriting this codebase. The agent-facing contract with the hard rules is [`AGENTS.md`](../AGENTS.md); this document explains the shape of the system. Verified against the code on 2026-07-08.

## System overview

Single-app **React Router v7 in framework mode with SSR**, built with Vite 7 and React 19, deployed to **Vercel** (`@vercel/react-router`). All persistent state lives in **Supabase** (Postgres + PostGIS, Auth, Storage, Edge Functions). There is no other backend service.

```
Browser ── SSR HTML + hydrated React app (Vercel)
   │              │
   │   loaders/actions/resource routes (server) ── src/lib/supabase.server.ts ──┐
   │              │                                                             │
   └── browser Supabase client (src/integrations/supabase/client.ts) ──────► Supabase
                  │                                                     (Postgres+PostGIS, RLS,
                  └── Edge Functions (supabase/functions/, Deno) ◄──────  Auth, Storage)
```

## Routing

- Route manifest: [`app/routes.ts`](../app/routes.ts) (~122 routes).
- Quirk to know: `react-router.config.ts` sets `appDirectory: "src"`, so the framework loads `src/routes.ts`, which is a 3-line re-export of `../app/routes`. The real table lives in `app/routes.ts`.
- SSR entry points: `src/root.tsx` (document shell), `src/entry.client.tsx`, `src/entry.server.tsx`.

## Feature slices

`src/features/<domain>/` holds 25 vertical slices (buildings, search, collections, profile, embassy, awards, credits, …), each with `api/`, `components/`, `hooks/`, `pages/`, `types/`.

**The load-bearing boundary rule:** feature `api/` modules own all Supabase queries. Components and hooks never import `@/integrations/supabase/client` directly, and features don't deep-import each other's internals. Enforced by ESLint `no-restricted-imports` (warnings) plus a CI ratchet that fails any PR increasing the warning count.

## Auth pattern

- Server-side identity comes from `supabase.auth.getUser()` (validates the JWT against Supabase) — **never** `getSession()` (reads the cookie unverified) for any authorization decision.
- The one sanctioned `getSession()` use is `getSessionForClientHydration()` in [`src/lib/supabase.server.ts`](../src/lib/supabase.server.ts): it calls `getUser()` first, then copies tokens from the session purely so the browser client can hydrate.
- Edge Functions called directly from the browser use the "Manual Gatekeeper" pattern (`verify_jwt = false` + mandatory in-code `getUser()` check) — rationale in AGENTS.md.

## Database

- Schema is changed **only** through timestamped SQL migrations in `supabase/migrations/` (~484 files), applied to the hosted project. Never via the Dashboard.
- Generated types: [`src/integrations/supabase/types.ts`](../src/integrations/supabase/types.ts) (`npm run gen-types`). Regenerate in the same PR as any migration — CI checks staleness. Never hand-edit.
- RLS is enabled on effectively every public table; complex reads go through SQL RPC functions (e.g. `search_buildings_v2`, `get_map_clusters_v3`).
- Migration filenames have known historical quirks (33 duplicate-timestamp files, 2 non-conforming names). These are **grandfathered and must never be renamed** — see [decision 0002](decisions/0002-migration-collision-baseline.md).

## State management

- **Server state:** TanStack Query v5, keyed per feature.
- **UI state:** URL search params first (shareable/back-button-safe); `zustand` only for a few genuinely client-local stores.
- No global stores for domain data.

## Styling

Tailwind CSS v4 with design tokens defined in CSS `@theme` in `src/index.css`, documented in [`DESIGN_TOKENS.md`](DESIGN_TOKENS.md). Raw palette classes (`bg-blue-500`) are forbidden; token aliases only. Shared primitives are shadcn/Radix in `src/components/ui/`.

## Quality gates

Blocking on every PR (branch protection, admins included): Lint, Typecheck, Test + coverage floor, Build, Migrations lint, ESLint-warning ratchet. Advisory (visible, non-blocking): strict typecheck, file-size budgets, types staleness. Debt baselines only shrink — see [decision 0003](decisions/0003-ratchets-over-big-bang.md).

### TypeScript strictness

The app typechecks with `strict: false` (but `strictNullChecks`, `noImplicitReturns`, etc. on) via `tsconfig.app.json`. The goal state is `tsconfig.strict.json` (`strict: true`), currently applied to a curated allowlist of files and run as an advisory check. **Convention: when you substantially rework a file, add it to the `tsconfig.strict.json` include list.** The allowlist only grows; there will be no big-bang `strict: true` flip.

## Where things are

| Concern | Location |
|---|---|
| Route manifest | `app/routes.ts` (via `src/routes.ts` re-export) |
| Server Supabase client | `src/lib/supabase.server.ts` |
| Browser Supabase client | `src/integrations/supabase/client.ts` |
| Generated DB types | `src/integrations/supabase/types.ts` |
| Resource routes | `src/api/*.route.ts`, `src/features/*/api/*.route.ts` |
| Migrations / Edge Functions | `supabase/migrations/`, `supabase/functions/` |
| Schema intent & DTOs | `docs/DATA_CONTRACT.md` |
| Design tokens | `docs/DESIGN_TOKENS.md` |
| Decision records | `docs/decisions/` |
| CI quality-gate scripts | `scripts/check-*.mjs` |

## Worked example: adding a field to buildings

1. Write a timestamped migration in `supabase/migrations/` adding the column; apply it via Supabase MCP `apply_migration`.
2. Run `npm run gen-types`; commit the regenerated `types.ts` in the same PR.
3. Update the query in `src/features/buildings/api/` (queries live only here).
4. Surface it in `src/features/buildings/pages/BuildingDetails.tsx` (or the relevant component), styling with design tokens.
5. Add/extend a co-located `*.test.tsx`; run `npm run lint && npm run typecheck && npm run test && npm run build`.
