# AI Status

## Current Phase
Phase — Plano Updates feature

## CURRENT_ARCHITECTURE_SNAPSHOT
- Monorepo: React 18 SPA (Vite) + Supabase backend
- Routing: React Router v6 with `createBrowserRouter`
- State: TanStack Query for server state
- Auth guard: AdminGuard checks `profile.role IN ('admin','app_admin')`
- **Plano Updates** feature shipped:
  - Table `plano_updates` (migration `20271026000000_plano_updates.sql`)
  - Storage bucket `plano-updates` (public read, admin write)
  - Public routes: `/updates` (listing), `/updates/:slug` (detail)
  - Admin routes: `/admin/updates`, `/admin/updates/new`, `/admin/updates/:updateId`
  - Footer link added to "Plano" section after "About"
  - Admin sidebar: "Updates" item added under Content group

## SCHEMA_DRIFT_LOG
- [2026-05-17] Generated types (`src/integrations/supabase/types.ts`) do not yet include `plano_updates`, `programme_campaigns`, `chapter_projects`, `outreach_log`, or several other tables added by recent migrations. API files for those features cast the client to `any` to bypass the type gap. Status: **open** — needs `npm run gen-types` after migrations are applied.

## KNOWN_ISSUES
- [2026-05-17] — Pre-existing: generated types stale; multiple tables from recent migrations missing. Non-blocking (api files use `any` cast). Resolution: run `npm run gen-types` after applying all pending migrations.
- [2026-05-17] — `UpdateDetail.tsx` renders body as plain `whitespace-pre-wrap` text; if Markdown rendering is needed in future, add a library (e.g. `react-markdown`).

## Completed Tasks
- Plano Updates (2026-05-17): Created `plano_updates` table, storage bucket, full admin CRUD (list + create/edit form with hero image upload, tags, geo scope, publish toggle), public listing and detail pages, footer link, admin sidebar entry.
