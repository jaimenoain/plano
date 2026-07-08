# PLANO

The world's architecture, cataloged. A social platform for architecture enthusiasts to discover buildings, share ratings and reviews, build collections, and organize field trips.

## Getting started (fresh clone)

Prerequisites: Node 22 (`.nvmrc` is authoritative — run `nvm use`), npm.

```bash
nvm use                       # Node 22.22.0
npm ci                        # install exact locked dependencies
cp .env.example .env.local    # then fill in the values (see comments in the file)
npm run dev                   # http://localhost:8080 (port pinned in vite.config.ts)
```

Unit tests need **no** environment setup — the Supabase client is mocked, so this works immediately after `npm ci`:

```bash
npm run test
```

Running the real app requires Supabase, and Google Maps credentials in `.env.local` — every variable is documented inline in [`.env.example`](.env.example). There is no local-Supabase bootstrap; the app runs against a hosted Supabase project.

## Tech stack

This is a **single-app React Router v7 project in framework mode with SSR**. It is NOT a monorepo and NOT Next.js.

### Frontend
* **Framework:** React 19 + React Router v7 (framework mode, SSR) on Vite 7
* **Language:** TypeScript
* **Styling:** Tailwind CSS v4 (design tokens in CSS `@theme`, see [`docs/DESIGN_TOKENS.md`](docs/DESIGN_TOKENS.md)) + shadcn/Radix primitives
* **Server state:** TanStack Query v5 · **UI state:** URL search params first
* **Forms/validation:** React Hook Form + Zod

### Backend & data (Supabase)
* **Database:** PostgreSQL + PostGIS, schema managed exclusively via [`supabase/migrations/`](supabase/migrations)
* **Auth:** Supabase Auth — server-side identity via `getUser()` only
* **API strategy:** RPC functions for complex queries (e.g. `search_buildings_v2`), resource routes in `src/**/api/*.route.ts`, Edge Functions in [`supabase/functions/`](supabase/functions) for privileged operations
* **Row Level Security (RLS)** on effectively every table

### Testing
* **Unit / component:** Vitest + Testing Library (`npm run test`). Co-located `*.test.ts(x)` under `src/` plus `tests/unit/`. Coverage floor enforced in CI. Needs no env setup — Supabase is mocked.
* **End-to-end:** Playwright (`npx playwright test`), specs in `tests/e2e/`. Drives a real browser through login, search, building pages, and saving, against the hosted Supabase using the QA test accounts from `.env.local`.

### Deployment
* **Vercel** via `@vercel/react-router` (see [`vercel.json`](vercel.json) and [`docs/LAUNCH_HOSTING.md`](docs/LAUNCH_HOSTING.md)).

## Project structure

* **[`app/routes.ts`](app/routes.ts)** — the route manifest (~122 routes). Note: `react-router.config.ts` sets `appDirectory: "src"`, so `src/routes.ts` re-exports this file.
* **`src/root.tsx`, `src/entry.client.tsx`, `src/entry.server.tsx`** — SSR document shell and entry points.
* **`src/features/<domain>/`** — 25 feature slices (`api/`, `components/`, `hooks/`, `pages/`, `types/`). Feature `api/` modules own all Supabase queries; components never import the Supabase client directly (lint-enforced).
* **`src/components/ui/`** — shared shadcn/Radix primitives.
* **`src/lib/supabase.server.ts`** — server-side Supabase client for loaders/actions/resource routes.
* **`src/integrations/supabase/`** — browser client + generated DB types (`types.ts` — never hand-edit; regenerate with `npm run gen-types`).
* **`supabase/migrations/`** — timestamped SQL migrations. **`supabase/functions/`** — Edge Functions (Deno).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture and [`docs/decisions/`](docs/decisions) for why things are the way they are.

## Development scripts

* `npm run dev` — local dev server (SSR via Vite).
* `npm run test` / `npm run test:coverage` — unit tests (Vitest).
* `npm run typecheck` / `npm run lint` / `npm run build` — the same gates CI runs.
* `npm run gen-types` — regenerate Supabase DB types (required in the same PR as any migration).

Every PR must pass the blocking CI checks before merge — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## 🧠 AI agent context & rules

This codebase is developed primarily by AI coding agents. Before generating code, agents **MUST** read:

1. **[`AGENTS.md`](AGENTS.md)** — the canonical agent contract (stack, layout, hard rules).
2. **`.cursor/rules/`** — domain rule files (database, API, frontend, auth, conduct).
3. **[`docs/AI_STATUS.md`](docs/AI_STATUS.md)** — cross-session status, known issues, schema drift log.
