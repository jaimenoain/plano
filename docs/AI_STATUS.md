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
- [2026-05-18] `ambassador_goals.current_value` defaults to `0` and has no writer (no trigger, no client update), so the counter and progress bar on `/embassy/goals` stayed at 0% no matter how many photos/edits/visits/firm-claims the ambassador made. Migration `20271030000000_ambassador_goals_progress_rpc.sql` adds RPC `get_my_ambassador_goals()` that derives `current_value` at read time from `review_images` (photos), `building_audit_logs` (edits), `user_buildings` (visits), and `company_stewards` (firms_claimed), scoped to events on or after `goals.created_at`. Frontend (`MyGoals.tsx`) switched from a direct select to this RPC. Status: **needs apply** in the Supabase SQL Editor.
- [2026-05-18] `find_nearby_buildings` had two overloads live in the DB: the original 3-arg `(lat, long, radius_meters)` from migration `20260421000001` and the canonical 4-arg `(lat, long, radius_meters, name_query)`. PostgREST returned `PGRST203` ("could not choose the best candidate function") for every RPC call, breaking the "Show nearby buildings" button on building detail pages. Migration `20271029000000_drop_orphan_find_nearby_buildings_overload.sql` drops the 3-arg variant. Status: **needs apply** in the Supabase SQL Editor.
- [2026-05-17] Generated types (`src/integrations/supabase/types.ts`) do not yet include `plano_updates`, `programme_campaigns`, `chapter_projects`, `outreach_log`, or several other tables added by recent migrations. API files for those features cast the client to `any` to bypass the type gap. Status: **open** — needs `npm run gen-types` after migrations are applied.
- [2026-05-17] `credit_role_enum` rename never reached the live DB: migration `20270896000000_rename_credit_roles_to_disciplines.sql` shared its timestamp with `20270896000000_fix_feed_silent_visits.sql` (both added in commit `6c3e4ce9`), so the Supabase migration tracker silently skipped the second one. App code and generated types use the new discipline-based labels (`design_architecture`, `architecture_of_record`, …), but the DB still holds the old person-based labels (`design_architect`, …), producing `invalid input value for enum credit_role_enum` errors on credit insert. Replacement migration `20271027000000_rename_credit_roles_to_disciplines.sql` is idempotent and supersedes the skipped file (which has been deleted). Status: **needs apply** in the Supabase SQL Editor.

## SCHEMA_DRIFT_FIXED
- [2026-05-18] `get_discovery_feed` referenced `ub.video_url` (user_buildings) in its HAVING clause. Migration `20270872000000` dropped that column. Fixed in `20271028000000_fix_discovery_feed_video_url.sql` — replaced with an EXISTS subquery against `building_posts.video_url`.

## KNOWN_ISSUES
- [2026-05-17] — Pre-existing: generated types stale; multiple tables from recent migrations missing. Non-blocking (api files use `any` cast). Resolution: run `npm run gen-types` after applying all pending migrations.
- [2026-05-17] — `UpdateDetail.tsx` renders body as plain `whitespace-pre-wrap` text; if Markdown rendering is needed in future, add a library (e.g. `react-markdown`).

## Completed Tasks
- Century global filter (2026-05-19): Added Century accordion to search page Global filters (`DiscoveryFiltersPanel`); wired URL state, map/list/search RPCs via migration `20271031000000_add_century_filter_to_search_rpcs.sql` (needs apply in Supabase SQL Editor). Also extended `useURLMapState` to parse award/size filter params into `MapContext` so map browse respects drawer filters.
- Century filter UI (2026-05-19): Search drawer lists 21st→1st century plus B.C. checkbox; URL/RPC use `0` in `centuries` for B.C. (`century < 1`). Same migration updated if not yet applied.
- Plano Updates (2026-05-17): Created `plano_updates` table, storage bucket, full admin CRUD (list + create/edit form with hero image upload, tags, geo scope, publish toggle), public listing and detail pages, footer link, admin sidebar entry.
