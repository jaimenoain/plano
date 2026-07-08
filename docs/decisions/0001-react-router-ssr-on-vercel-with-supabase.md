# 0001 — React Router v7 SSR on Vercel, Supabase as the only backend

**Status:** accepted (stack finalized 2026-07; recorded retroactively 2026-07-08)

## Context

The repo began as a Vite SPA (React 18, React Router DOM) for a movie-rating product, then pivoted to Plano (buildings/architecture). SEO for public building pages and map-heavy first paint made client-only rendering a liability. The codebase was upgraded incrementally: Tailwind 4, React 19, Vite 7, then React Router v7 framework mode with SSR (issue #1495, July 2026).

## Decision

- **React Router v7 framework mode with SSR** — not Next.js — because it was the shortest sound path from the existing React Router SPA: routes, loaders, and components carried over rather than being rewritten into a different framework's conventions.
- **Vercel** hosting via `@vercel/react-router` (already the deploy target; zero-config SSR support).
- **Supabase is the entire backend**: Postgres + PostGIS, Auth, Storage, Edge Functions. No separate API server exists or should be introduced; server-side logic lives in route loaders/actions, resource routes, SQL RPCs, and Edge Functions.
- One deliberate quirk: `appDirectory` is `src/`, and `src/routes.ts` re-exports the manifest from `app/routes.ts` (kept at its historical path to avoid churn during the migration).

## Consequences

- Rendering is server-first; every page must be SSR-safe (no `window` at module scope).
- Auth must be validated server-side (`getUser()`), since loaders run on Vercel — see AGENTS.md hard rules.
- Upgrading to React Router v8 is blocked on `@vercel/react-router` support (tracked in issue #1495).
- Anyone expecting Next.js or a monorepo will be wrong — see AGENTS.md "The Real Stack".
