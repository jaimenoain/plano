# Plano: Unified Data & API Contract

**Product:** Plano — The world's architecture, cataloged.
**Document type:** Data & API Contract
**Last updated:** April 2026
**Database:** Supabase (PostgreSQL 15 + PostGIS)
**Related:** Opaque token and verification-link security patterns are summarized in **`docs/SECURITY.md`** (see §9b / §9e).

---

## Gap Analysis Summary

**No data gaps detected.** The existing schema comprehensively covers all business entities, relationships, and workflow states described in the PRD. All `⚑ DATA IMPLICATION` requirements are resolved into concrete columns, enums, and junction tables.

**Tenancy model:** Not tenant-scoped. Plano is a single-product social platform with no multi-tenancy. RLS policies use `auth.uid()` scoped to individual users, not tenants.

**Role Semantics:**

| Role | Route prefix | Post-login landing | Exclusive surfaces | Invisible entities |
|------|-------------|-------------------|-------------------|-------------------|
| `user` (default) | `/` | `/` (home feed) | — | Admin tables, admin RPCs |
| `admin` / `app_admin` | `/admin` | `/admin` (dashboard) | Admin panel, audit logs, moderation tools, deletion jobs | — (superset of user) |
| Credited professional (person or company) | `/person/:slug`, `/company/:slug` | `/portfolio` or `/company-portfolio` | Portfolio dashboards; building credits via `building_credits` | — (superset of user) |

---

## Waitlist (launch notifications)

**Purpose:** Logged-out visitors may leave an email (and optional name) to be notified when broader access opens.

### Database: `waitlist_signups`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `email` | text | Required; unique on `lower(trim(email))` |
| `full_name` | text | Optional |
| `created_at` | timestamptz | Default `now()` |

**RLS:** `INSERT` allowed for `anon` and `authenticated` (no identity in row). `SELECT` only for `public.is_admin()` (same pattern as `feedback` admin reads).

**Client:** `insertWaitlistSignup` in `src/features/waitlist/api/waitlist.ts` — validates with Zod (`waitlistSignupSchema` / `normalizeWaitlistSignup`), inserts via browser Supabase client; duplicate email returns Postgres `23505` → user-facing “already on the list” copy.

**Migration:** `supabase/migrations/20270865000000_waitlist_signups.sql` — apply in Supabase SQL Editor before production use.

---

## Ambassador program (foundation)

Geographic **chapters** and per-user **memberships** power the volunteer ambassador network (`/embassy` in later phases). Phase 1 adds schema, RLS, admin CRUD at `/admin/ambassadors`, and a public-safe profile badge via RPC.

### Database: `ambassador_chapters`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `name` | text | Display name (e.g. city or country chapter) |
| `type` | text | `'local'` \| `'national'` |
| `locality_id` | uuid | FK → `localities.id`; required when `type = 'local'` |
| `country_code` | text | ISO-3166-1 alpha-2, **uppercase**, length 2 |
| `parent_chapter_id` | uuid | FK → `ambassador_chapters.id`; local chapters point at their national chapter; **null** for national rows |
| `status` | text | `'active'` \| `'inactive'` \| `'forming'` |
| `max_ambassadors` | integer | Cap per chapter; default 20; must be > 0 |
| `created_at` / `updated_at` | timestamptz | Defaults + touch triggers |

**RLS (summary):** `SELECT` for all `authenticated`; `INSERT` / `UPDATE` / `DELETE` only when `public.is_admin()`.

### Database: `ambassador_memberships`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | PK |
| `chapter_id` | uuid | FK → `ambassador_chapters.id`, **ON DELETE CASCADE** |
| `user_id` | uuid | FK → `profiles.id`, **ON DELETE CASCADE**; **UNIQUE** — one chapter per user globally |
| `role` | text | `'president'` \| `'exco'` \| `'ambassador'` |
| `exco_responsibility` | text | Required when `role = 'exco'`; one of `content`, `marketing`, `architect_relations`, `data_quality`, `community`; otherwise null |
| `status` | text | `'active'` \| `'inactive'` \| `'pending_review'` |
| `joined_at` | timestamptz | Default `now()` |
| `invited_by` | uuid | Optional FK → `profiles.id` |
| `updated_by` | uuid | Optional FK → `profiles.id`; set when a chapter **president** updates a row via **`president_update_chapter_membership`** |
| `created_at` / `updated_at` | timestamptz | Defaults + touch triggers |

**RLS (summary):** `SELECT` — own row, chapter leaders for their chapter, national president for national + child local chapters, or admin; `INSERT` — admin only (Embassy **president** invites use RPC **`president_invite_ambassador_member`**); `UPDATE` — admin only (Embassy **president** edits use RPC **`president_update_chapter_membership`**); `DELETE` — admin only.

### Database: `ambassador_applications`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `profiles.id`, **ON DELETE CASCADE** |
| `chapter_id` | uuid | FK → `ambassador_chapters.id`, **ON DELETE CASCADE** |
| `motivation_text` | text | Required; min length enforced in RPC (`submit_ambassador_application`) |
| `status` | text | `'pending'` \| `'approved'` \| `'rejected'` |
| `reviewed_by` | uuid | Optional FK → `profiles.id` |
| `reviewer_note` | text | Optional; set on reject |
| `reviewed_at` | timestamptz | Set when approved or rejected |
| `created_at` | timestamptz | Default `now()` |

**Constraint:** partial unique index on `user_id` **where** `status = 'pending'` — at most one pending application per user.

**RLS (summary):** `SELECT` — own rows, chapter leaders for their `chapter_id`, or admin; `INSERT` — not granted to `authenticated` (applications created only via **`submit_ambassador_application`**); `UPDATE` — admin or chapter leader for the row’s chapter; `DELETE` — admin only.

### RPC: `submit_ambassador_application(p_chapter_id uuid, p_motivation_text text)`

**Returns:** `uuid` — new application `id`.

**SECURITY DEFINER.** Validates caller, motivation length (≥ 100), no membership with **`status IN ('active','pending_review')`**, chapter `status IN ('active','forming')`, inserts row, inserts `notifications` of type **`ambassador_application_received`** for each active **`president`** / **`exco`** in the target chapter (`metadata`: `application_id`, `chapter_id`). **`GRANT EXECUTE`** to `authenticated`.

### RPC: `review_ambassador_application(p_application_id uuid, p_approve boolean, p_reviewer_note text default null)`

**Returns:** `void`.

**SECURITY DEFINER.** Caller must be admin or **`is_chapter_leader(chapter_id)`** for the application’s chapter. If `p_approve`: checks ambassador capacity (`role = 'ambassador'` & `status = 'active'` vs `max_ambassadors`, bypass for admin), inserts **`ambassador_memberships`** (`role = 'ambassador'`, `status = 'active'`, `invited_by = auth.uid()`), sets application **`approved`**, notifies applicant (**`ambassador_application_approved`**, `metadata.chapter_name`). If reject: sets **`rejected`**, optional note, **`ambassador_application_rejected`**. **`GRANT EXECUTE`** to `authenticated`.

### Notifications: ambassador types

The `notifications.type` check (live DB) includes:

- `ambassador_application_received` — chapter leaders: new application (metadata: `application_id`, `chapter_id`)
- `ambassador_application_approved` — applicant (metadata: `application_id`, `chapter_id`, `chapter_name`)
- `ambassador_application_rejected` — applicant (metadata: `application_id`, `chapter_id`, optional `reviewer_note`)
- `ambassador_membership_review` — chapter **president** / **ExCo** (`active`): member updated profile geography and no longer matches the chapter heuristic (metadata: `membership_id`, `chapter_id`, `chapter_name`, `member_username`)

### RPC: `has_embassy_portal_access()`

**Returns:** `boolean` — **`true`** if **`auth.uid()`** has an **`ambassador_memberships`** row with **`status IN ('active','pending_review')`**. Used so **`/embassy`** stays reachable while membership is under review after a location change.

**SECURITY DEFINER.** **`GRANT EXECUTE`** to **`authenticated`**.

### RPC: `sync_ambassador_membership_after_profile_geography()`

**Returns:** `jsonb` with **`action`**: `no_profile` \| `no_active_membership` \| `chapter_missing` \| `still_matches` \| `flagged_pending_review`.

**SECURITY DEFINER.** Reads **`profiles.country`** / **`profiles.location`** for **`auth.uid()`** and their **`active`** **`ambassador_memberships`** row + chapter. If geography still matches (**`_ambassador_profile_matches_chapter`** heuristic, aligned with chapter apply defaults), returns **`still_matches`**. Otherwise sets membership **`status = 'pending_review'`** and inserts **`ambassador_membership_review`** for each **`active`** **`president`** / **`exco`** in that chapter (**`actor_id`** = member). **`GRANT EXECUTE`** to **`authenticated`**.

**Client:** `Settings.tsx` calls this RPC after a successful profile save when **`country`** or **`location`** changed.

### Internal: `_ambassador_profile_matches_chapter(p_country text, p_location text, p_chapter ambassador_chapters)`

**Returns:** `boolean`. **`SECURITY DEFINER`**; **no `GRANT`** to **`authenticated`** (called only from **`sync_ambassador_membership_after_profile_geography`**).

### RPC: `get_ambassador_badge_for_profile(p_user_id uuid)`

**Returns:** set of rows `{ ambassador_role: text, chapter_name: text }` (at most one active membership).

**Purpose:** Expose only role + chapter name on any profile (including logged-out viewers) without granting broad `SELECT` on `ambassador_memberships`. **SECURITY DEFINER**; **`GRANT EXECUTE`** to `anon` and `authenticated`.

**Client:** `Profile.tsx` calls `supabase.rpc('get_ambassador_badge_for_profile', { p_user_id })` after `targetUserId` is known.

### Embassy task feed (internal helpers + RPCs)

**Internal (no `GRANT` to `authenticated`):**

- `_ambassador_can_access_chapter(p_chapter_id uuid)` — `true` when **`is_admin()`** or **`auth.uid()`** has an **`active`** row in **`ambassador_memberships`** for **`p_chapter_id`**.
- `_building_in_ambassador_chapter_scope(p_building_id uuid, p_chapter_id uuid)` — `true` when the building is not deleted and: **local** chapter → **`buildings.locality_id`** matches the chapter’s **`locality_id`**; **national** chapter → building **`country_code`** (uppercase match) or the building’s **`localities.country_code`** matches the chapter’s **`country_code`**.

### RPC: `get_ambassador_buildings_without_photos(p_chapter_id uuid, p_limit int default 20)`

**Returns:** rows `id`, `short_id`, `slug`, `name`, `city`, `country`, `popularity_score`, `hero_image_url` — no review images and no hero image, ordered by **`popularity_score`** descending.

**SECURITY DEFINER.** Requires **`_ambassador_can_access_chapter(p_chapter_id)`**. **`GRANT EXECUTE`** to **`authenticated`**.

### RPC: `get_ambassador_buildings_missing_metadata(p_chapter_id uuid, p_limit int default 20)`

**Returns:** rows `id`, `short_id`, `slug`, `name`, `city`, `country`, `popularity_score`, `year_completed`, `has_styles`, `has_architect_credit` — only buildings in scope where **`year_completed`** is null and/or no **`building_styles`** rows and/or no **`building_credits`** row with **`status IN ('active','verified')`**, **`credit_tier = 'primary'`**, **`role = 'design_architect'`**; ordered by **`popularity_score`** descending.

**SECURITY DEFINER.** Same access as above. **`GRANT EXECUTE`** to **`authenticated`**.

### RPC: `get_ambassador_unclaimed_firms(p_chapter_id uuid, p_limit int default 20)`

**Returns:** rows `id`, `slug`, `name`, `country`, `building_count`, `claim_status` — **`companies.claim_status = 'unclaimed'`** with at least one non-**`hidden`** **`building_credits`** link to a building in chapter scope; ordered by sum of linked buildings’ **`popularity_score`**, then count.

**SECURITY DEFINER.** Same access as above. **`GRANT EXECUTE`** to **`authenticated`**.

### RPC: `get_ambassador_recent_buildings(p_chapter_id uuid, p_limit int default 20)`

**Returns:** rows `id`, `short_id`, `slug`, `name`, `city`, `country`, `created_at`, `hero_image_url` — buildings in scope with **`created_at`** in the last 30 days (UTC), newest first.

**SECURITY DEFINER.** Same access as above. **`GRANT EXECUTE`** to **`authenticated`**.

### RPC: `get_ambassador_my_audit_timeline(p_limit int default 20)`

**Returns:** rows `id`, `building_id`, `building_name`, `building_slug`, `building_short_id`, `table_name`, `operation`, `created_at` — from **`building_audit_logs`** where **`user_id = auth.uid()`**, newest first (supersedes admin-only **`building_audit_logs`** `SELECT` RLS for this read path).

**SECURITY DEFINER.** **`GRANT EXECUTE`** to **`authenticated`**.

**Client:** `Embassy.tsx` (and `src/features/embassy/api/taskFeed.ts`) call these RPCs with TanStack Query.

### Embassy leadership (Phase 4)

**Access:** Metrics, activity, and member directory require **`is_admin()`**, **`is_chapter_leader(p_chapter_id)`**, or (Phase 5) **`is_national_president_of_local_chapter_parent(p_chapter_id)`** when **`p_chapter_id`** is a **local** chapter whose **`parent_chapter_id`** is the caller’s national chapter where they are **president** (read-only national oversight). Invite and membership updates require **`is_chapter_president(p_chapter_id)`** (enforced inside RPCs).

### RPC: `get_chapter_metrics(p_chapter_id uuid, p_days int default 30)`

**Returns:** one row — `total_edits`, `total_photos_added`, `total_building_visits` for `[period_start, period_end)` (UTC, `p_days` long); same three counts for the immediately preceding window of equal length (`prev_*`, `prev_period_*`). **Edits** = all **`building_audit_logs`** rows whose building is in chapter scope; **photos** = subset of **`buildings`** **`UPDATE`** logs where **`hero_image_url`** becomes non-empty from empty; **visits** = **`user_buildings`** rows with **`status = 'visited'`** and **`visited_at`** in the window, building in chapter scope.

**SECURITY DEFINER.** **`GRANT EXECUTE`** to **`authenticated`**.

### RPC: `get_chapter_ambassador_activity(p_chapter_id uuid, p_days int default 30)`

**Returns:** one row per **`ambassador_memberships`** row for the chapter with **`status = 'active'`** — `user_id`, `username`, `avatar_url`, `role`, `edits_count`, `photos_added` (same definitions as metrics, filtered by member and window), `last_active_at` (max audit `created_at` in chapter scope, all time).

**SECURITY DEFINER.** **`GRANT EXECUTE`** to **`authenticated`**.

### RPC: `get_chapter_members_with_contact(p_chapter_id uuid)`

**Returns:** one row per membership in the chapter (any status) — `membership_id`, `user_id`, `username`, `avatar_url`, `email` (from **`auth.users`**), `role`, `exco_responsibility`, `status`, `joined_at`, `invited_by`.

**SECURITY DEFINER.** **`GRANT EXECUTE`** to **`authenticated`**.

### RPC: `president_invite_ambassador_member(p_chapter_id uuid, p_user_id uuid, p_role text, p_exco_responsibility text default null)`

**Returns:** new membership **`id`** (uuid). Validates president, **`p_role IN ('ambassador','exco')`**, ExCo responsibility when needed, chapter **`max_ambassadors`** for ambassador invites, target user has no existing membership. Inserts **`ambassador_memberships`** with **`status = 'active'`**, **`invited_by = auth.uid()`**.

**SECURITY DEFINER.** **`GRANT EXECUTE`** to **`authenticated`**.

### RPC: `president_update_chapter_membership(p_membership_id uuid, p_role text, p_exco_responsibility text, p_status text)`

**Returns:** void. Validates president for the row’s chapter; blocks changing **own** **`role`**; updates **`role`**, **`exco_responsibility`**, **`status`**, and **`updated_by`**. Null or blank **`p_exco_responsibility`** while remaining ExCo keeps the existing responsibility.

**SECURITY DEFINER.** **`GRANT EXECUTE`** to **`authenticated`**.

**Client:** `Embassy.tsx` — chapter leaders see **Leadership** tab (`EmbassyLeadership.tsx`, `src/features/embassy/api/leadership.ts`); URL query **`tab=leadership`**. National chapter **presidents** also see **National overview** (`tab=national`, `EmbassyNationalOverview.tsx`, `get_national_chapter_overview`).

### Phase 5 — National overview and admin coverage

#### RPC: `get_national_chapter_overview(p_national_chapter_id uuid)`

**Returns:** one row per **active** **local** child chapter (`parent_chapter_id = p_national_chapter_id`, `type = 'local'`, `status = 'active'`) — `chapter_id`, `chapter_name`, `locality_id`, `member_count` (active memberships), `president_name` (first active president’s `profiles.username`), `edits_last_30d`, `photos_last_30d` (same definitions as chapter metrics, UTC 30-day window), `last_activity_at` (max audit timestamp in chapter building scope).

**SECURITY DEFINER.** Caller must be **`is_admin()`** or **`is_chapter_president(p_national_chapter_id)`** on a row with **`type = 'national'`**. **`GRANT EXECUTE`** to **`authenticated`**.

#### RPC: `get_admin_ambassador_locality_coverage()`

**Returns:** all **`localities`** ordered by **`buildings_count` DESC** — `locality_id`, `city`, `country`, `country_code`, `buildings_count`, optional first matching **`ambassador_chapters`** row where **`type = 'local'`** and **`locality_id`** matches (`chapter_id`, `chapter_name`, `chapter_status`), plus **`chapter_member_count`** (active memberships for that chapter, 0 when no chapter).

**SECURITY DEFINER.** **`is_admin()`** only. **`GRANT EXECUTE`** to **`authenticated`**.

#### RPC: `get_admin_ambassador_program_stats()`

**Returns:** one row — `total_active_memberships`, `pending_applications` (`ambassador_applications.status = 'pending'`), `chapters_active` / `chapters_forming` / `chapters_inactive` (counts on **`ambassador_chapters`**), **`members_by_country`** (`jsonb` array of `{ country_code, active_count }` from active memberships joined to their chapter’s **`country_code`**).

**SECURITY DEFINER.** **`is_admin()`** only. **`GRANT EXECUTE`** to **`authenticated`**.

#### Helper (DB): `is_national_president_of_local_chapter_parent(p_chapter_id uuid)`

**Returns:** whether **`auth.uid()`** is an **active** **president** of the **national** chapter that is **`parent_chapter_id`** of **`p_chapter_id`** (local child). Used by leadership read RPCs only. **`SECURITY DEFINER`**; **`GRANT EXECUTE`** to **`authenticated`**.

### Helper functions (DB)

- `get_user_ambassador_membership()` — active membership row for `auth.uid()`
- `is_ambassador()` — whether `auth.uid()` has any **active** membership (task RPCs and leadership checks; unchanged)
- `has_embassy_portal_access()` — **active** or **`pending_review`** membership (Embassy route guard)
- `is_chapter_leader(p_chapter_id uuid)` — president or ExCo for that chapter
- `is_chapter_president(p_chapter_id uuid)` — president for that chapter  

All **`SECURITY DEFINER`** with `search_path = public`; **`GRANT EXECUTE`** to `authenticated` (badge RPC additionally to `anon`).

### Phase 6 — Programme Health Dashboard (`/admin/programme`)

#### RPC: `get_programme_health_summary()`

**Returns:** `jsonb` with four keys:

- `pulse` — `{ active_chapters, forming_chapters, inactive_chapters, active_chapters_delta, forming_chapters_delta, inactive_chapters_delta, pending_applications, stale_applications }` — `*_delta` = chapters with that status created in the last 30 days; `stale_applications` = pending for > 7 days.
- `activity_trend` — `[{ date, edits, photos }]` — 30 daily rows; `edits` = all `building_audit_logs` rows that day; `photos` = subset where `hero_image_url` changed from empty to non-empty.
- `flagged_chapters` — `[{ chapter_id, chapter_name, country_code, flag_type, flag_detail }]` — `flag_type` one of `no_president`, `president_inactive`, `forming_stalled`.
- `top_chapters` — `[{ chapter_id, chapter_name, country_code, member_count, contribution_count }]` — top 5 active chapters by `building_audit_logs` count in chapter scope over last 30 days.

**SECURITY DEFINER.** `is_admin()` only. **`GRANT EXECUTE`** to `authenticated`.

**Client:** `src/features/admin/api/programme.ts` → `fetchProgrammeHealthSummary()`, called via TanStack Query in `src/features/admin/pages/ProgrammeHealth.tsx`.

**Migration:** `supabase/migrations/20271120000000_programme_health_rpc.sql`.

### App API / admin UI

- **List / create:** `src/features/admin/pages/AmbassadorChapters.tsx` — table + “New chapter” dialog; Zod `ambassadorChapterCreateSchema` in `src/lib/validations/ambassador.ts`.
- **Detail / members:** `src/features/admin/pages/AmbassadorChapterDetail.tsx` — edit chapter fields, list members, add member (username search on `profiles`), edit role/status, remove member.
- **Routes:** `/admin/ambassadors`, `/admin/ambassadors/applications`, `/admin/ambassadors/coverage`, `/admin/ambassadors/:chapterId` in `app/routes.ts`; sidebar **Ambassadors** and **Ambassador coverage** in `AdminSidebar.tsx`.
- **Programme platform routes:** `/admin/programme` (redirects to `/admin/programme/health`), `/admin/programme/health` — sidebar **Programme → Health Dashboard**.
- **Public apply + Embassy:** `/become-ambassador` (`BecomeAmbassador.tsx`), `/embassy` (`Embassy.tsx` + `AmbassadorGuard.tsx` via **`has_embassy_portal_access`**).

**Migrations:** `supabase/migrations/20270870000000_ambassador_foundation.sql` then **`20270870100000_ambassador_applications.sql`** then **`20270870200000_ambassador_task_feed_rpcs.sql`** then **`20270870300000_ambassador_leadership_rpcs.sql`** then **`20270870400000_ambassador_phase5_national_overview_admin_coverage.sql`** then **`20270870500000_ambassador_phase6_location_review.sql`** — apply in Supabase SQL Editor in order (then run `npm run gen-types` if the hosted project should match committed `types.ts`).

### Database: `chapter_tasks`

Chapter-scoped task list visible at `/embassy/tasks`. Any active ambassador can create a task; assignment and visibility are optional.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, `gen_random_uuid()` |
| `chapter_id` | uuid | FK → `ambassador_chapters.id` ON DELETE CASCADE |
| `title` | text | NOT NULL |
| `description` | text | Optional |
| `due_date` | date | Optional |
| `visibility` | text | `'chapter'` (default) \| `'leadership'` \| `'only_me'`; CHECK enforced |
| `status` | text | `'todo'` (default) \| `'in_progress'` \| `'done'`; CHECK enforced |
| `created_by` | uuid | FK → `profiles.id` ON DELETE CASCADE |
| `assigned_to` | uuid | FK → `profiles.id` ON DELETE SET NULL; optional |
| `project_id` | uuid | FK → `chapter_projects.id` ON DELETE SET NULL; optional |
| `company_id` | uuid | FK → `companies.id` ON DELETE SET NULL; optional (architecture firm link) |
| `created_at` / `updated_at` | timestamptz | Defaults; `updated_at` touched by `trg_chapter_tasks_updated_at` |

**Visibility semantics:**
- `'chapter'` — all active chapter members see the task (default on create).
- `'leadership'` — only users with `role IN ('president','exco')` in the chapter see it; only a leader can set this value (enforced in UI).
- `'only_me'` — only the task creator sees it; any member can set this on their own tasks.

**RLS:**
- `SELECT` — active chapter member who passes the visibility predicate above.
- `INSERT` — active chapter member; `created_by` must equal `auth.uid()`.
- `UPDATE` — task creator OR chapter leader (`president`/`exco`) for that chapter.
- `DELETE` — task creator OR chapter leader for that chapter.

### RPC: `get_chapter_tasks(p_chapter_id uuid)`

Returns tasks visible to the caller, joined with `creator_username`, `assignee_username`, `assignee_avatar_url`, `project_title`, and `company_name`. Ordered: todo → in_progress → done, then `due_date ASC NULLS LAST`, then `created_at DESC`.

**SECURITY DEFINER.** `GRANT EXECUTE` to `authenticated`.

**Client:** `Tasks.tsx` queries this via `(supabase as any).rpc('get_chapter_tasks', { p_chapter_id })`.

**Migration:** `supabase/migrations/20271124000000_chapter_tasks.sql` — apply in Supabase SQL Editor.

### Database: `embassy_event_discoveries`

AI-discovered architecture events awaiting ambassador review on `/embassy/contribute` (Events tool). Populated by a serper.dev + Claude pipeline triggered when an active ambassador opens any `/embassy/*` page and the chapter's `ambassador_chapters.last_event_search_at` is older than 4 days. Rows transition `pending → published` (creates a real `events` row) or `pending → discarded`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, `gen_random_uuid()` |
| `chapter_id` | uuid | FK → `ambassador_chapters.id` ON DELETE CASCADE |
| `locality_id` | uuid | FK → `localities.id` ON DELETE SET NULL; copied from chapter at insert time |
| `title` | text | NOT NULL — extracted by Claude |
| `description` | text | Optional |
| `start_at` | timestamptz | NOT NULL |
| `end_at` | timestamptz | Optional |
| `address` | text | Optional |
| `lat` / `lng` | double precision | Optional; populated when serper returns coords |
| `external_link` | text | Organiser's canonical event URL (where to RSVP) |
| `cover_image_url` | text | Optional; image hit from serper |
| `source_url` | text | NOT NULL — the SERP result Claude extracted from |
| `snippet` | text | Verbatim excerpt (max ~280 chars) for ambassador sanity-check |
| `status` | text | `'pending'` (default) \| `'published'` \| `'discarded'`; CHECK enforced |
| `duplicate_of_event_id` | uuid | FK → `events.id` ON DELETE SET NULL; dedup hint set at insert time when a similar live event is found |
| `published_event_id` | uuid | FK → `events.id` ON DELETE SET NULL; set when publish RPC creates the live event |
| `reviewed_at` | timestamptz | Set on publish/discard |
| `reviewed_by` | uuid | FK → `profiles.id` ON DELETE SET NULL; set on publish/discard |
| `created_at` | timestamptz | Default `now()` |

**Indexes:** `(chapter_id, status, created_at DESC)`, partial `(duplicate_of_event_id) WHERE duplicate_of_event_id IS NOT NULL`, `(start_at)`.

**RLS:**
- `SELECT` — active chapter member or admin (via `public._ambassador_can_access_chapter(chapter_id)`).
- `UPDATE` — same predicate (so ambassadors can edit title/description/dates before publishing in the Events tool).
- `INSERT` — admin only at the RLS level; writes happen via SECURITY DEFINER search RPC (Slice 1).
- `DELETE` — admin only.

### Database: `embassy_event_search_runs`

Audit log of AI event-search invocations. One row per attempt — used for "Last searched: N hours ago" UI and ops diagnostics. Read-only from the client.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, `gen_random_uuid()` |
| `chapter_id` | uuid | FK → `ambassador_chapters.id` ON DELETE CASCADE |
| `started_at` | timestamptz | Default `now()` |
| `completed_at` | timestamptz | Set when the RPC finishes (success or failure) |
| `status` | text | `'running'` (default) \| `'success'` \| `'failed'`; CHECK enforced |
| `items_found` | integer | Number of new discoveries inserted on success |
| `error` | text | Free-text error reason on failure (e.g. `serper_not_configured`, HTTP status from serper) |

**Indexes:** `(chapter_id, started_at DESC)`.

**RLS:**
- `SELECT` — active chapter member or admin (same predicate as discoveries).
- `INSERT` / `UPDATE` / `DELETE` — admin only at the RLS level; writes happen via the SECURITY DEFINER search RPC (Slice 1).

### Column: `ambassador_chapters.last_event_search_at`

`timestamptz NULL`. Stamped by the event-search RPC on successful completion (and on `skipped='fresh'` no-op the stamp is left alone). The `/embassy/*` layout-level visit trigger checks this server-side via the RPC's 4-day gate — clients never read it for the gate itself; only the Events tool reads it to render "Last searched: …" copy.

**Migration:** `supabase/migrations/20271140000000_embassy_event_discoveries.sql` — apply in Supabase SQL Editor. Search route + publish/discard RPCs arrive in `20271141000000` (Slice 1).

### RPC: `ambassador_publish_event_discovery(p_discovery_id uuid)`

SECURITY DEFINER. Called from the Events tool "Publish" button. Validates caller is an active member of the discovery's chapter (`_ambassador_can_access_chapter`), generates a unique `slug`, inserts a row into `events` (populating `locality_id`, `country_code`, `city_slug`, geography point if lat/lng present, `submitted_by_user_id = auth.uid()`, `is_self_hosted = false`, `claim_status = 'unclaimed'`), then stamps the discovery `status = 'published'`, `published_event_id`, `reviewed_at`, `reviewed_by`. Writes an audit log row. **Returns** the new `events.id uuid`.

**Migration:** `supabase/migrations/20271141000000_embassy_event_search_rpcs.sql` — needs apply in Supabase SQL Editor.

### RPC: `ambassador_discard_event_discovery(p_discovery_id uuid)`

SECURITY DEFINER. Called from the Events tool "Discard" button. Same scope guard as publish. Stamps `status = 'discarded'`, `reviewed_at`, `reviewed_by`. **Returns** `void`.

**Migration:** `supabase/migrations/20271141000000_embassy_event_search_rpcs.sql` — needs apply in Supabase SQL Editor.

---

## Auth Domain — profiles, allowed_emails

⚠️  STUB ONLY — The auth domain is documented here for reference only. `profiles` is auto-created via a `handle_new_user` database trigger on `auth.users` insertion. `allowed_emails` gates sign-up eligibility. Full schema follows below as these tables are already in production and are referenced by every other domain.

---

## 1. User Profile Domain

### Component 1: Database Schema

```sql
-- ============================================================
-- ENUM: (none — role is stored as text)
-- ============================================================

CREATE TABLE public.profiles (
  id            uuid        NOT NULL,
  username      text        CHECK (char_length(username) >= 3),
  avatar_url    text,
  bio           text,
  firm          text,       -- Optional practice / firm name on profile header (migration `20270842000000_profiles_firm_website.sql`)
  website       text,       -- Optional personal website or portfolio URL on profile header
  country       text,
  location      text,
  invited_by    text,
  role          text        DEFAULT 'user',      -- 'user' | 'admin' | 'app_admin'
  subscribed_platforms text[] DEFAULT '{}',
  favorites     jsonb       DEFAULT '[]',         -- Array of pinned building IDs
  notification_preferences jsonb DEFAULT '{}',    -- Per-type boolean toggles
  profile_sections jsonb    DEFAULT '{"favorites": false, "highlights": false}',
  verified_architect_id uuid,   -- Optional legacy column; no foreign key (migration `20270837000000_drop_legacy_architect_tables.sql`). App authorization uses `people.claimed_by_user_id` and `building_credits` instead of this link.
  last_online   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at    timestamptz,

  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Auto-incrementing profile creation
-- Trigger: handle_new_user — fires AFTER INSERT on auth.users
-- Action: INSERT INTO profiles (id) VALUES (NEW.id)

CREATE TABLE public.allowed_emails (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  first_name text,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT allowed_emails_pkey PRIMARY KEY (id)
);

CREATE TABLE public.login_logs (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT login_logs_pkey PRIMARY KEY (id),
  CONSTRAINT login_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```

### Component 2: Security Policies

### RLS: profiles

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);
  -- All profiles are publicly readable (username, avatar, bio, stats).
```

**INSERT**
```sql
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT
  WITH CHECK (id = (SELECT auth.uid()));
  -- Users can only insert their own profile row (triggered by handle_new_user).
```

**UPDATE**
```sql
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));
```

-- No DELETE policy: profiles are not deleted directly; account deletion is handled by a background job.

### RLS: allowed_emails

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "allowed_emails_select" ON allowed_emails
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
  );
  -- Users can only check their own email's eligibility.
```

-- No INSERT/UPDATE/DELETE policy: managed by admin via service-role key in provisioning.

### RLS: login_logs

**Tenancy model:** not tenant-scoped

**INSERT**
```sql
CREATE POLICY "login_logs_insert" ON login_logs
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

-- No SELECT policy for regular users; admins read via is_admin().

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /profile/:username | Fetch public profile | supabase (client-side via Supabase JS) |
| GET | /profile/:username/photos | Fetch user's photo gallery | supabase (client-side) |
| PATCH | /settings | Update own profile | supabase (client-side) |
| GET | /api/export-data | Export personal data as CSV | nodejs |

No reserved static segments required for `/profile/:username` — the route is prefixed by `/profile/`.

```typescript
interface ProfileDTO {
  id: string;
  username: string;
  avatarUrl: string | null;       // Mapped: avatar_url
  bio: string | null;
  country: string | null;
  location: string | null;
  role: 'user' | 'admin' | 'app_admin';
  favorites: string[];            // Array of building UUIDs
  profileSections: {
    favorites: boolean;
    highlights: boolean;
  };
  verifiedArchitectId: string | null;  // Mapped: verified_architect_id
  lastOnline: string | null;           // ISO 8601
  createdAt: string;                   // ISO 8601
  // Computed fields (client-side via separate queries):
  buildingsVisitedCount: number;
  reviewsCount: number;
  followersCount: number;
  followingCount: number;
}

/*
Example payload:
{
  "id": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "username": "archi_wanderer",
  "avatarUrl": "profile-photos/d4e5f6a7.jpg",
  "bio": "Exploring brutalism one city at a time.",
  "country": "United Kingdom",
  "location": "London",
  "role": "user",
  "favorites": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
  "profileSections": { "favorites": true, "highlights": false },
  "verifiedArchitectId": null,
  "lastOnline": "2026-03-28T14:30:00Z",
  "createdAt": "2025-06-15T09:00:00Z",
  "buildingsVisitedCount": 142,
  "reviewsCount": 87,
  "followersCount": 53,
  "followingCount": 31
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(
    /^[a-zA-Z0-9_]+$/,
    'Username may only contain letters, numbers, and underscores'
  ).optional(),
  bio: z.string().max(500).optional(),
  country: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  favorites: z.array(z.string().uuid()).max(10).optional(),
  profileSections: z.object({
    favorites: z.boolean(),
    highlights: z.boolean(),
  }).optional(),
  notificationPreferences: z.record(z.string(), z.boolean()).optional(),
});
```

**Environment Variable Registry:**

```
SUPABASE_URL
  Consumed by: all client-side queries
  Vercel Dashboard: required
  Supabase Vault: not required
  Notes: public, safe to expose in client bundle

SUPABASE_ANON_KEY
  Consumed by: all client-side queries
  Vercel Dashboard: required
  Supabase Vault: not required
  Notes: public, safe to expose in client bundle

SUPABASE_SERVICE_ROLE_KEY
  Consumed by: /api/export-data (server-side CSV generation)
  Vercel Dashboard: required
  Supabase Vault: not required
  Notes: RESTRICTED to admin and provisioning routes only
```

### Component 5: Storage Contract

**Bucket:** `avatars`
**Path convention:** `{userId}/{filename}`
**Access model:** Public (CDN-accessible via `supabase.storage.from('avatars').getPublicUrl()`)
**Pre-signed URL expiry:** Not applicable (public bucket).

---

## 2. Building Catalogue Domain

### Component 1: Database Schema

```sql
-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.location_precision AS ENUM ('exact', 'approximate');

CREATE TYPE public.building_status AS ENUM (
  'Built', 'Under Construction', 'Unbuilt', 'Demolished', 'Temporary', 'Lost'
);
-- App/UI canonical term for no-longer-standing buildings is **Lost** (`Demolished` is a legacy
-- enum value; existing rows were migrated to `Lost` — do not surface "Demolished" in the product).

-- Legacy single-field access enum (deprecated, retained for migration reference)
CREATE TYPE public.building_access AS ENUM (
  'Open Access', 'Admission Fee', 'Customers Only',
  'Appointment Only', 'Exterior View Only', 'No Access'
);

CREATE TYPE public.building_access_level AS ENUM (
  'public', 'private', 'restricted', 'commercial'
);

CREATE TYPE public.building_access_logistics AS ENUM (
  'walk-in', 'booking_required', 'tour_only', 'exterior_only'
);

CREATE TYPE public.building_access_cost AS ENUM (
  'free', 'paid', 'customers_only'
);

CREATE TYPE public.building_tier_rank AS ENUM (
  'Top 1%', 'Top 5%', 'Top 10%', 'Top 20%', 'Standard'
);

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.buildings (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  name                  text        NOT NULL,
  alt_name              text,
  aliases               text[]      NOT NULL DEFAULT '{}',
  slug                  text        UNIQUE,
  short_id              integer     NOT NULL DEFAULT nextval('buildings_short_id_seq') UNIQUE,
  location              geography(Point, 4326) NOT NULL,      -- PostGIS geography
  location_precision    location_precision NOT NULL DEFAULT 'exact',
  address               text,
  city                  text,
  country               text,
  country_code          text,          -- ISO 3166-1 alpha-2, e.g. 'GB'. Set by sync_building_locality trigger; callers should also pass it directly from Google's short_name.
  locality_id           uuid           REFERENCES public.localities(id) ON DELETE SET NULL,  -- FK set automatically by sync_building_locality trigger
  year_completed        integer,
  status                building_status,
  access                building_access,                       -- Legacy; deprecated
  access_level          building_access_level,
  access_logistics      building_access_logistics,
  access_cost           building_access_cost,
  access_notes          text,
  functional_category_id uuid,
  hero_image_url        text,
  hero_image_id         uuid,
  community_preview_url text,
  architect_statement   text,
  popularity_score      integer     NOT NULL DEFAULT 0,
  tier_rank             building_tier_rank,
  source                text,
  import_id             text,
  is_deleted            boolean     DEFAULT false,
  is_verified           boolean     DEFAULT false,
  merged_into_id        uuid,
  created_by            uuid,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT buildings_pkey PRIMARY KEY (id),
  CONSTRAINT buildings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT buildings_functional_category_id_fkey FOREIGN KEY (functional_category_id) REFERENCES public.functional_categories(id),
  CONSTRAINT buildings_merged_into_id_fkey FOREIGN KEY (merged_into_id) REFERENCES public.buildings(id),
  CONSTRAINT buildings_hero_image_id_fkey FOREIGN KEY (hero_image_id) REFERENCES public.review_images(id),
  CONSTRAINT buildings_locality_id_fkey FOREIGN KEY (locality_id) REFERENCES public.localities(id) ON DELETE SET NULL
);
```

### Localities table

One row per distinct city/country combination that has at least one building. Auto-created by the `sync_building_locality` trigger on buildings insert/update. Enriched manually with `description`, `hero_image_url`, and SEO fields.

```sql
CREATE TABLE public.localities (
  id               uuid          NOT NULL DEFAULT gen_random_uuid(),
  city             text          NOT NULL,
  country          text          NOT NULL,  -- Canonical full English name, e.g. 'United Kingdom'
  country_code     text          NOT NULL,  -- ISO 3166-1 alpha-2, e.g. 'GB'
  slug             text          NOT NULL UNIQUE,  -- URL-safe, e.g. 'london-gb'. Never auto-updated after creation.
  description      text,          -- Null on auto-created rows; enriched manually
  hero_image_url   text,
  meta_title       text,          -- SEO override; null falls back to generated defaults
  meta_description text,
  lat              double precision,  -- Geographic centre for map viewport; populated manually
  lng              double precision,
  buildings_count  integer       NOT NULL DEFAULT 0,  -- Cached count; kept in sync by sync_building_locality trigger
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT localities_pkey PRIMARY KEY (id),
  CONSTRAINT localities_slug_unique UNIQUE (slug),
  CONSTRAINT localities_city_country_code_unique UNIQUE (city, country_code)
);
```

**RLS:** publicly readable (`SELECT` for all). `INSERT` and `UPDATE` restricted to admins. No `DELETE` policy — empty localities are acceptable.

### Helper functions

```sql
-- Maps a country name (any common form) to ISO 3166-1 alpha-2 code. Returns NULL for unknown values.
-- IMMUTABLE + SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.country_name_to_code(p_country text) RETURNS text ...;

-- Generates a URL-safe slug from city + country_code.
-- Example: make_locality_slug('New York', 'US') → 'new-york-us'
-- IMMUTABLE + SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.make_locality_slug(p_city text, p_country_code text) RETURNS text ...;
```

### Trigger: sync_building_locality

`BEFORE INSERT OR UPDATE OF city, country, country_code, is_deleted ON buildings FOR EACH ROW`.

- Normalises `city`/`country` (trim + initcap) and derives `country_code` via `country_name_to_code` if not already set.
- Looks up or auto-creates the matching `localities` row.
- Sets `buildings.locality_id`.
- Recalculates `localities.buildings_count` for both the new and old locality (on city change).

**Building ↔ credited entities:** The only junction from `buildings` to professionals is **`building_credits`** (§9d), referencing **`people`** and/or **`companies`** (§9a / §9b). Map filters, discovery, and `is_verified_architect_for_building` use those rows.

```sql
CREATE TABLE public.building_attributes (
  building_id  uuid NOT NULL,
  attribute_id uuid NOT NULL,

  CONSTRAINT building_attributes_pkey PRIMARY KEY (building_id, attribute_id),
  CONSTRAINT building_attributes_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id),
  CONSTRAINT building_attributes_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(id)
);

CREATE TABLE public.building_styles (
  building_id uuid NOT NULL,
  style_id    uuid NOT NULL,
  created_at  timestamptz DEFAULT now(),

  CONSTRAINT building_styles_pkey PRIMARY KEY (building_id, style_id),
  CONSTRAINT building_styles_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id),
  CONSTRAINT building_styles_style_id_fkey FOREIGN KEY (style_id) REFERENCES public.architectural_styles(id)
);

CREATE TABLE public.building_functional_typologies (
  building_id  uuid NOT NULL,
  typology_id  uuid NOT NULL,

  CONSTRAINT building_functional_typologies_pkey PRIMARY KEY (building_id, typology_id),
  CONSTRAINT building_functional_typologies_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id),
  CONSTRAINT building_functional_typologies_typology_id_fkey FOREIGN KEY (typology_id) REFERENCES public.functional_typologies(id)
);

CREATE TABLE public.building_audit_logs (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  building_id  uuid NOT NULL,
  user_id      uuid,
  table_name   text NOT NULL,
  operation    text NOT NULL,         -- 'INSERT' | 'UPDATE' | 'DELETE'
  old_data     jsonb,
  new_data     jsonb,
  created_at   timestamptz DEFAULT now(),

  CONSTRAINT building_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT building_audit_logs_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id),
  CONSTRAINT building_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.import_buildings (
  import_id          text NOT NULL,
  name               text,
  year_completed     bigint,
  city               text,
  country            text,
  latitude           double precision,
  longitude          double precision,
  location_precision text,
  source             text,

  CONSTRAINT import_buildings_pkey PRIMARY KEY (import_id)
);
```

### Component 2: Security Policies

### RLS: buildings

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "buildings_select" ON buildings
  FOR SELECT USING (
    is_deleted = false OR is_deleted IS NULL
  );
  -- All non-deleted buildings are publicly readable.
  -- Admins can view deleted buildings via is_admin() override.
```

**INSERT**
```sql
CREATE POLICY "buildings_insert" ON buildings
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
  );
  -- Any authenticated user can create a building.
```

**UPDATE**
```sql
CREATE POLICY "buildings_update" ON buildings
  FOR UPDATE
  USING (
    created_by = (SELECT auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR public.is_admin()
  );
  -- Creator or admin can update.
  -- Additional field-level rules for credited professionals use `building_credits`
  -- and steward/claim RLS (see §9d / §9b); `is_verified_architect_for_building` is redefined in migration `20270837000000` to query credits + claimed `people` / `company_stewards`.
```

-- No DELETE policy: buildings use soft-delete (is_deleted = true), not hard delete.

### RLS: building_attributes

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "building_attributes_select" ON building_attributes
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "building_attributes_insert" ON building_attributes
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
```

**DELETE**
```sql
CREATE POLICY "building_attributes_delete" ON building_attributes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM buildings b
      WHERE b.id = building_id
      AND (b.created_by = (SELECT auth.uid()) OR public.is_admin())
    )
  );
```

### RLS: building_styles

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "building_styles_select" ON building_styles
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "building_styles_insert" ON building_styles
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
```

**DELETE**
```sql
CREATE POLICY "building_styles_delete" ON building_styles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM buildings b
      WHERE b.id = building_id
      AND (b.created_by = (SELECT auth.uid()) OR public.is_admin())
    )
  );
```

### RLS: building_functional_typologies

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "building_functional_typologies_select" ON building_functional_typologies
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "building_functional_typologies_insert" ON building_functional_typologies
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
```

**DELETE**
```sql
CREATE POLICY "building_functional_typologies_delete" ON building_functional_typologies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM buildings b
      WHERE b.id = building_id
      AND (b.created_by = (SELECT auth.uid()) OR public.is_admin())
    )
  );
```

### RLS: building_audit_logs

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "building_audit_logs_select" ON building_audit_logs
  FOR SELECT USING (public.is_admin());
```

**INSERT**
```sql
CREATE POLICY "building_audit_logs_insert" ON building_audit_logs
  FOR INSERT
  WITH CHECK (public.is_admin());
  -- Inserted by the log_building_changes trigger/RPC, which runs as SECURITY DEFINER.
```

-- No UPDATE/DELETE policy: audit logs are append-only.

### building_duplicate_dismissals

Per-user "not a duplicate" decisions for the embassy duplicate-detection tool. Created by migration `20271155000000_building_duplicate_detection.sql` (feedback 570af7a4).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid FK → `auth.users` | CASCADE on delete |
| `building_id_1` | uuid FK → `buildings` | Always the lesser of the two UUIDs (enforced by CHECK) |
| `building_id_2` | uuid FK → `buildings` | Always the greater of the two UUIDs |
| `created_at` | timestamptz | `now()` |

**Constraints:** `CHECK (building_id_1 < building_id_2)`; `UNIQUE (user_id, building_id_1, building_id_2)`.

**RLS:** SELECT and INSERT scoped to `user_id = auth.uid()`. No UPDATE or DELETE — dismissals are permanent per user.

**Business rule:** Dismissals are per-user, not global. Two ambassadors may independently evaluate the same pair. A dismissed pair is re-surfaced if the user's row is deleted (CASCADE on `auth.users`).

### RLS: import_buildings

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "import_buildings_select" ON import_buildings
  FOR SELECT USING (public.is_admin());
```

-- No INSERT/UPDATE/DELETE policy for regular users: import_buildings is managed via admin batch processes.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /building/:id/:slug | Fetch building detail | supabase (client-side) |
| POST | /building/new | Create building | supabase (client-side) |
| PATCH | /building/:id | Update building | supabase (client-side) |
| POST | /building/:id/merge | Merge duplicate buildings | supabase (RPC: `merge_buildings`) |
| GET | /api/check-slug | Check slug availability | supabase (RPC: `check_slug_availability`) |

⚠️ STATIC ROUTE REQUIRED — `/building/new` must take precedence over `/building/:id`.

```typescript
interface BuildingDTO {
  id: string;
  name: string;
  altName: string | null;                        // Mapped: alt_name
  aliases: string[];
  slug: string | null;
  shortId: number;                               // Mapped: short_id
  latitude: number;                              // Extracted: ST_Y(location)
  longitude: number;                             // Extracted: ST_X(location)
  locationPrecision: 'exact' | 'approximate';    // Mapped: location_precision
  address: string | null;
  city: string | null;
  country: string | null;
  yearCompleted: number | null;                  // Mapped: year_completed
  status: 'Built' | 'Under Construction' | 'Unbuilt' | 'Temporary' | 'Lost' | null;
  accessLevel: 'public' | 'private' | 'restricted' | 'commercial' | null;
  accessLogistics: 'walk-in' | 'booking_required' | 'tour_only' | 'exterior_only' | null;
  accessCost: 'free' | 'paid' | 'customers_only' | null;
  accessNotes: string | null;                    // Mapped: access_notes
  functionalCategoryId: string | null;           // Mapped: functional_category_id
  heroImageUrl: string | null;                   // Mapped: hero_image_url
  communityPreviewUrl: string | null;            // Mapped: community_preview_url
  architectStatement: string | null;             // Mapped: architect_statement
  popularityScore: number;                       // Mapped: popularity_score
  tierRank: 'Top 1%' | 'Top 5%' | 'Top 10%' | 'Top 20%' | 'Standard' | null;
  isVerified: boolean;                           // Mapped: is_verified
  createdBy: string | null;                      // Mapped: created_by
  createdAt: string;                             // ISO 8601
  // Joined from `building_credits` + `people` / `companies` (non-hidden, ordered for display):
  creditedEntities: { id: string; name: string }[];
  functionalCategory: { id: string; name: string; slug: string } | null;
  typologies: { id: string; name: string; slug: string }[];
  attributes: { id: string; name: string; groupSlug: string }[];
  styles: { id: string; name: string; slug: string }[];
}

/*
Example payload:
{
  "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
  "name": "Barbican Centre",
  "altName": "Barbican Arts Centre",
  "aliases": ["The Barbican"],
  "slug": "barbican-centre",
  "shortId": 1042,
  "latitude": 51.5200,
  "longitude": -0.0937,
  "locationPrecision": "exact",
  "address": "Silk Street, London EC2Y 8DS",
  "city": "London",
  "country": "United Kingdom",
  "yearCompleted": 1982,
  "status": "Built",
  "accessLevel": "public",
  "accessLogistics": "walk-in",
  "accessCost": "free",
  "accessNotes": "Some areas require tickets for performances.",
  "functionalCategoryId": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "heroImageUrl": "review_images/b1c2d3e4/hero.jpg",
  "communityPreviewUrl": "review_images/b1c2d3e4/preview.jpg",
  "architectStatement": null,
  "popularityScore": 847,
  "tierRank": "Top 1%",
  "isVerified": true,
  "createdBy": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "createdAt": "2025-01-10T12:00:00Z",
  "creditedEntities": [
    { "id": "a1b2c3d4-0000-0000-0000-000000000001", "name": "Chamberlin, Powell and Bon" }
  ],
  "functionalCategory": { "id": "c3d4e5f6-a7b8-9012-cdef-345678901234", "name": "Cultural", "slug": "cultural" },
  "typologies": [
    { "id": "t1a2b3c4-0000-0000-0000-000000000001", "name": "Arts Centre", "slug": "arts-centre" }
  ],
  "attributes": [
    { "id": "at01-0000-0000-0000-000000000001", "name": "Concrete", "groupSlug": "materiality" },
    { "id": "at02-0000-0000-0000-000000000002", "name": "Urban", "groupSlug": "context" }
  ],
  "styles": [
    { "id": "st01-0000-0000-0000-000000000001", "name": "Brutalism", "slug": "brutalism" }
  ]
}
*/
```

```typescript
// STUB — locality page feature is not yet implemented.
// Shape will be refined when the /locality/:slug route is built.
interface LocalityDTO {
  id: string;
  city: string;
  country: string;
  countryCode: string;            // Mapped: country_code (ISO 3166-1 alpha-2)
  slug: string;
  description: string | null;
  heroImageUrl: string | null;    // Mapped: hero_image_url
  metaTitle: string | null;       // Mapped: meta_title
  metaDescription: string | null; // Mapped: meta_description
  lat: number | null;
  lng: number | null;
  buildingsCount: number;         // Mapped: buildings_count (cached; approximate)
  createdAt: string;
  updatedAt: string;
}
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateBuildingSchema = z.object({
  name: z.string().min(1).max(300),
  altName: z.string().max(300).optional().nullable(),
  aliases: z.array(z.string().max(200)).max(10).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationPrecision: z.enum(['exact', 'approximate']).default('exact'),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(200).optional().nullable(),
  country: z.string().max(200).optional().nullable(),
  yearCompleted: z.number().int().min(-3000).max(2100).optional().nullable(),
  status: z.enum(['Built', 'Under Construction', 'Unbuilt', 'Temporary', 'Lost']).optional().nullable(),
  accessLevel: z.enum(['public', 'private', 'restricted', 'commercial']).optional().nullable(),
  accessLogistics: z.enum(['walk-in', 'booking_required', 'tour_only', 'exterior_only']).optional().nullable(),
  accessCost: z.enum(['free', 'paid', 'customers_only']).optional().nullable(),
  accessNotes: z.string().max(1000).optional().nullable(),
  functionalCategoryId: z.string().uuid().optional().nullable(),
  /** Primary design credits at create time (`building_credits`); see `src/lib/validations/building.ts` (`designCreditEntities`). */
  designCreditEntities: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      kind: z.enum(["person", "company"]),
    }),
  ),
  typologyIds: z.array(z.string().uuid()).optional(),
  attributeIds: z.array(z.string().uuid()).optional(),
  styleIds: z.array(z.string().uuid()).optional(),
});

const UpdateBuildingSchema = CreateBuildingSchema.partial().extend({
  slug: z.string().min(1).max(300).regex(/^[a-z0-9-]+$/).optional(),
  architectStatement: z.string().max(5000).optional().nullable(),
});
```

No additional environment variables required for this domain beyond the standard Supabase connection vars.

---

## 3. Taxonomy Domain

### Component 1: Database Schema

```sql
CREATE TABLE public.functional_categories (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT functional_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.functional_typologies (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_category_id uuid NOT NULL,
  name               text NOT NULL,
  slug               text NOT NULL,
  created_at         timestamptz DEFAULT now(),

  CONSTRAINT functional_typologies_pkey PRIMARY KEY (id),
  CONSTRAINT functional_typologies_parent_category_id_fkey
    FOREIGN KEY (parent_category_id) REFERENCES public.functional_categories(id)
);

CREATE TABLE public.attribute_groups (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL,               -- 'Materiality' | 'Context' | 'Style'
  slug       text NOT NULL UNIQUE,         -- 'materiality' | 'context' | 'style'
  created_at timestamptz DEFAULT now(),

  CONSTRAINT attribute_groups_pkey PRIMARY KEY (id)
);

CREATE TABLE public.attributes (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL,
  name       text NOT NULL,
  slug       text NOT NULL,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT attributes_pkey PRIMARY KEY (id),
  CONSTRAINT attributes_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.attribute_groups(id)
);

CREATE TABLE public.architectural_styles (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT architectural_styles_pkey PRIMARY KEY (id)
);
```

### Component 2: Security Policies

### RLS: functional_categories

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "functional_categories_select" ON functional_categories
  FOR SELECT USING (true);
```

-- No INSERT/UPDATE/DELETE policy: taxonomy data is seeded and managed by admins only.

### RLS: functional_typologies

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "functional_typologies_select" ON functional_typologies
  FOR SELECT USING (true);
```

-- No INSERT/UPDATE/DELETE policy: taxonomy data is seeded and managed by admins only.

### RLS: attribute_groups

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "attribute_groups_select" ON attribute_groups
  FOR SELECT USING (true);
```

-- No INSERT/UPDATE/DELETE policy: taxonomy data is seeded and managed by admins only.

### RLS: attributes

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "attributes_select" ON attributes
  FOR SELECT USING (true);
```

-- No INSERT/UPDATE/DELETE policy: taxonomy data is seeded and managed by admins only.

### RLS: architectural_styles

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "architectural_styles_select" ON architectural_styles
  FOR SELECT USING (true);
```

-- No INSERT/UPDATE/DELETE policy: taxonomy data is seeded and managed by admins only.

### Component 3: API Route Registry & DTOs

All taxonomy data is fetched client-side via the shared `useTaxonomy` hook with a 1-hour stale time.

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | (client query) | Fetch all categories | supabase (client-side) |
| GET | (client query) | Fetch all typologies | supabase (client-side) |
| GET | (client query) | Fetch all attribute groups + attributes | supabase (client-side) |
| GET | (client query) | Fetch all architectural styles | supabase (client-side) |

```typescript
interface TaxonomyDTO {
  categories: FunctionalCategoryDTO[];
  typologies: FunctionalTypologyDTO[];
  attributeGroups: AttributeGroupDTO[];
  styles: ArchitecturalStyleDTO[];
}

interface FunctionalCategoryDTO {
  id: string;
  name: string;
  slug: string;
}

interface FunctionalTypologyDTO {
  id: string;
  parentCategoryId: string;    // Mapped: parent_category_id
  name: string;
  slug: string;
}

interface AttributeGroupDTO {
  id: string;
  name: string;
  slug: string;
  attributes: AttributeDTO[];  // Joined: attributes where group_id = this.id
}

interface AttributeDTO {
  id: string;
  name: string;
  slug: string;
  groupId: string;             // Mapped: group_id
}

interface ArchitecturalStyleDTO {
  id: string;
  name: string;
  slug: string;
}

/*
Example payload (TaxonomyDTO):
{
  "categories": [
    { "id": "c001-0000-0000-0000-000000000001", "name": "Cultural", "slug": "cultural" },
    { "id": "c002-0000-0000-0000-000000000002", "name": "Residential", "slug": "residential" }
  ],
  "typologies": [
    { "id": "t001-0000-0000-0000-000000000001", "parentCategoryId": "c001-0000-0000-0000-000000000001", "name": "Museum", "slug": "museum" },
    { "id": "t002-0000-0000-0000-000000000002", "parentCategoryId": "c001-0000-0000-0000-000000000001", "name": "Gallery", "slug": "gallery" }
  ],
  "attributeGroups": [
    {
      "id": "g001-0000-0000-0000-000000000001",
      "name": "Materiality",
      "slug": "materiality",
      "attributes": [
        { "id": "a001-0000-0000-0000-000000000001", "name": "Concrete", "slug": "concrete", "groupId": "g001-0000-0000-0000-000000000001" },
        { "id": "a002-0000-0000-0000-000000000002", "name": "Glass", "slug": "glass", "groupId": "g001-0000-0000-0000-000000000001" }
      ]
    }
  ],
  "styles": [
    { "id": "s001-0000-0000-0000-000000000001", "name": "Brutalism", "slug": "brutalism" }
  ]
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

No write operations for regular users on taxonomy tables. Admin operations are performed via direct Supabase client calls.

No additional environment variables required for this domain.

---

## 4. User Library Domain (Reviews & Interactions)

### Component 1: Database Schema

```sql
CREATE TABLE public.user_buildings (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL,
  building_id uuid        NOT NULL,
  rating      integer     CHECK (rating IS NULL OR (rating >= 1 AND rating <= 3)),
  content     text,                                -- Review text
  tags        text[],                              -- Deprecated; retained for legacy data
  visibility  text        DEFAULT 'public' CHECK (visibility IN ('public', 'contacts', 'private')),
  status      text        NOT NULL DEFAULT 'visited' CHECK (status IN ('pending', 'visited', 'ignored')),
  video_url   text,
  visited_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  edited_at   timestamptz DEFAULT now(),

  CONSTRAINT user_buildings_pkey PRIMARY KEY (id),
  CONSTRAINT user_buildings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_buildings_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id)
);

CREATE TABLE public.likes (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  interaction_id uuid NOT NULL,                    -- References user_buildings.id
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT likes_pkey PRIMARY KEY (id),
  CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT likes_user_building_id_fkey FOREIGN KEY (interaction_id) REFERENCES public.user_buildings(id)
);

CREATE TABLE public.comments (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  interaction_id uuid NOT NULL,                    -- References user_buildings.id
  content        text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT comments_user_building_id_fkey FOREIGN KEY (interaction_id) REFERENCES public.user_buildings(id)
);

CREATE TABLE public.comment_likes (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  comment_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT comment_likes_pkey PRIMARY KEY (id),
  CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id),
  CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```

### Component 2: Security Policies

### RLS: user_buildings

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "user_buildings_select" ON user_buildings
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR visibility = 'public'
    OR (
      visibility = 'contacts'
      AND EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = (SELECT auth.uid())
        AND following_id = user_buildings.user_id
      )
    )
  );
```

**INSERT**
```sql
CREATE POLICY "user_buildings_insert" ON user_buildings
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "user_buildings_update" ON user_buildings
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "user_buildings_delete" ON user_buildings
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

**SELECT (admin — all rows)** — additional permissive policy; migration `20270869000000_admin_dashboard_metrics_overhaul.sql`:

```sql
CREATE POLICY "Admins can view all user_buildings for moderation"
  ON public.user_buildings
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
```

### RLS: likes

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "likes_select" ON likes
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "likes_insert" ON likes
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "likes_delete" ON likes
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

-- No UPDATE policy: likes are immutable; users delete and re-create.

### RLS: comments

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "comments_insert" ON comments
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "comments_update" ON comments
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );
```

### RLS: comment_likes

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "comment_likes_select" ON comment_likes
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "comment_likes_insert" ON comment_likes
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "comment_likes_delete" ON comment_likes
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

-- No UPDATE policy: comment likes are immutable.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /review/:id | Fetch single review | supabase (client-side) |
| POST | /building/:id/review | Create/update user-building interaction | supabase (client-side) |
| PATCH | /review/:id | Update review content | supabase (client-side) |
| DELETE | /review/:id | Delete review | supabase (client-side) |
| POST | /review/:id/like | Like a review | supabase (client-side) |
| DELETE | /review/:id/like | Unlike a review | supabase (client-side) |
| POST | /review/:id/comment | Add comment | supabase (client-side) |
| GET | (RPC) get_feed | Home feed; `user_data` JSON includes `followers_count` (author follower total), `is_verified_architect`, `is_architect_of_building` | supabase (RPC) |
| GET | (RPC) get_discovery_feed | Explore feed; **tiered location:** (1) `p_locality_id` → `buildings.locality_id`; (2) else `p_min_lat`/`p_max_lat`/`p_min_lng`/`p_max_lng` (Google viewport, caps ≤25° per axis) → PostGIS `buildings.location` ∩ envelope; (3) else `p_city_filter` / `p_country_filter` / `p_country_code_filter` / `p_region_filter` (substring, case-insensitive). Migration `20270867000000_discovery_feed_tiered_location.sql`. | supabase (RPC) |
| GET | (RPC) resolve_locality_for_explore | `p_city` + `p_country_code` → `localities.id` via `make_locality_slug`; Explore tier-1 resolution. Same migration as `get_discovery_feed` tiered location. | supabase (RPC) |
| GET | (RPC) get_suggested_posts | Suggested content; `user_data` JSON includes the same `followers_count` and credit flags as `get_feed` | supabase (RPC) |
| GET | (RPC) get_building_reviews | All `user_buildings` rows for a building (with `user_data` / review images JSON); `user_data` flags match `get_feed` (claimed person, credits/stewards) | supabase (RPC; migration `20270841000000_get_building_reviews_restore.sql`) |

```typescript
interface UserBuildingDTO {
  id: string;
  userId: string;                             // Mapped: user_id
  buildingId: string;                         // Mapped: building_id
  rating: 1 | 2 | 3 | null;
  content: string | null;
  visibility: 'public' | 'contacts' | 'private';
  status: 'pending' | 'visited' | 'ignored';
  videoUrl: string | null;                    // Mapped: video_url
  visitedAt: string | null;                   // ISO 8601; Mapped: visited_at
  createdAt: string;                          // ISO 8601
  editedAt: string;                           // ISO 8601; Mapped: edited_at
  // Joined fields:
  user: { id: string; username: string; avatarUrl: string | null };
  building: BuildingSummaryDTO;
  likesCount: number;                         // Computed: COUNT from likes
  commentsCount: number;                      // Computed: COUNT from comments
  isLikedByViewer: boolean;                   // Computed: exists in likes for current user
  images: ReviewImageDTO[];
}

interface BuildingSummaryDTO {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  country: string | null;
  heroImageUrl: string | null;
  /** Mapped: `main_image_url` on `buildings`; included on feed / `ReviewBuilding` joins from `get_feed` (hero image for activity cards). */
  mainImageUrl?: string | null;
  /** Mapped: `community_preview_url`; included in `get_feed` / `get_suggested_posts` `building_data` for feed activity-card fallback imagery. */
  communityPreviewUrl?: string | null;
  tierRank: string | null;
}

/*
Example payload:
{
  "id": "ub01-0000-0000-0000-000000000001",
  "userId": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "buildingId": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
  "rating": 3,
  "content": "The Barbican is an extraordinary example of brutalist civic architecture. The interlocking levels and garden courtyards create a world within a world.",
  "visibility": "public",
  "status": "visited",
  "videoUrl": null,
  "visitedAt": "2025-12-01T00:00:00Z",
  "createdAt": "2025-12-05T18:30:00Z",
  "editedAt": "2025-12-05T18:30:00Z",
  "user": {
    "id": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
    "username": "archi_wanderer",
    "avatarUrl": "profile-photos/d4e5f6a7.jpg"
  },
  "building": {
    "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
    "name": "Barbican Centre",
    "slug": "barbican-centre",
    "city": "London",
    "country": "United Kingdom",
    "heroImageUrl": "review_images/b1c2d3e4/hero.jpg",
    "tierRank": "Top 1%"
  },
  "likesCount": 12,
  "commentsCount": 3,
  "isLikedByViewer": true,
  "images": []
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const UpsertUserBuildingSchema = z.object({
  buildingId: z.string().uuid(),
  status: z.enum(['pending', 'visited', 'ignored']),
  rating: z.number().int().min(0).max(3).optional().nullable(), // 0 = unset; persist null (DB allows 1–3 or null)
  content: z.string().max(10000).optional().nullable(),
  visibility: z.enum(['public', 'contacts', 'private']).default('public'),
  videoUrl: z.string().url().optional().nullable(),
  visitedAt: z.string().datetime().optional().nullable(),
});

const CreateCommentSchema = z.object({
  interactionId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});
```

No additional environment variables required for this domain.

---

## 5. Media Domain

### Component 1: Database Schema

```sql
CREATE TABLE public.review_images (
  id           uuid    NOT NULL DEFAULT gen_random_uuid(),
  review_id    uuid    NOT NULL,                  -- References user_buildings.id
  user_id      uuid    NOT NULL,
  storage_path text    NOT NULL,
  likes_count  integer DEFAULT 0,
  is_generated boolean DEFAULT false,             -- AI-generated flag
  is_official  boolean DEFAULT false,             -- Official building image
  width_px     integer,                           -- Stored file width (post client resize); null on legacy rows
  height_px    integer,                           -- Stored file height (post client resize); null on legacy rows
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT review_images_pkey PRIMARY KEY (id),
  CONSTRAINT review_images_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.user_buildings(id),
  CONSTRAINT review_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.image_likes (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  image_id   uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT image_likes_pkey PRIMARY KEY (id),
  CONSTRAINT image_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT image_likes_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.review_images(id)
);

CREATE TABLE public.image_comments (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  image_id   uuid NOT NULL,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT image_comments_pkey PRIMARY KEY (id),
  CONSTRAINT image_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT image_comments_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.review_images(id)
);

CREATE TABLE public.review_links (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id  uuid NOT NULL,                       -- References user_buildings.id
  user_id    uuid NOT NULL,
  url        text NOT NULL,
  title      text,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT review_links_pkey PRIMARY KEY (id),
  CONSTRAINT review_links_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.user_buildings(id),
  CONSTRAINT review_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.link_likes (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  link_id    uuid NOT NULL,
  user_id    uuid NOT NULL,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT link_likes_pkey PRIMARY KEY (id),
  CONSTRAINT link_likes_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.review_links(id),
  CONSTRAINT link_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```

### Component 2: Security Policies

### RLS: review_images

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "review_images_select" ON review_images
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "review_images_insert" ON review_images
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "review_images_update" ON review_images
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "review_images_delete" ON review_images
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );
```

### RLS: image_likes

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "image_likes_select" ON image_likes
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "image_likes_insert" ON image_likes
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "image_likes_delete" ON image_likes
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

-- No UPDATE policy: image likes are immutable.

### RLS: image_comments

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "image_comments_select" ON image_comments
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "image_comments_insert" ON image_comments
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "image_comments_delete" ON image_comments
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );
```

-- No UPDATE policy: image comments are not editable in the current product.

### RLS: review_links

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "review_links_select" ON review_links
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "review_links_insert" ON review_links
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "review_links_delete" ON review_links
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

-- No UPDATE policy: links are deleted and re-created.

### RLS: link_likes

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "link_likes_select" ON link_likes
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "link_likes_insert" ON link_likes
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "link_likes_delete" ON link_likes
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

-- No UPDATE policy: link likes are immutable.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| POST | /api/generate-upload-url | Generate presigned upload URL | supabase-edge-function (requires manual JWT verification via `verify_jwt = false`) |
| POST | /api/delete-file | Delete single file from storage | supabase-edge-function |
| POST | /api/delete-storage-recursive | Recursive directory deletion | supabase-edge-function |
| POST | /api/fetch-url-metadata | Fetch OpenGraph metadata for link preview | supabase-edge-function |

```typescript
interface ReviewImageDTO {
  id: string;
  reviewId: string;           // Mapped: review_id
  userId: string;             // Mapped: user_id
  storagePath: string;        // Mapped: storage_path
  likesCount: number;         // Mapped: likes_count
  isGenerated: boolean;       // Mapped: is_generated
  isOfficial: boolean;        // Mapped: is_official
  createdAt: string;          // ISO 8601
  // Computed:
  imageUrl: string;           // Computed: resolved via supabase.storage.from('review_images').getPublicUrl()
  isLikedByViewer: boolean;   // Computed: exists in image_likes for current user
}

interface ReviewLinkDTO {
  id: string;
  reviewId: string;           // Mapped: review_id (actually building-level, keyed to any user_building for the building)
  userId: string;             // Mapped: user_id
  url: string;
  title: string | null;
  createdAt: string;          // ISO 8601
  likesCount: number;         // Computed: COUNT from link_likes
  isLikedByViewer: boolean;   // Computed: exists in link_likes for current user
}

/*
Example payload (ReviewImageDTO):
{
  "id": "img01-0000-0000-0000-000000000001",
  "reviewId": "ub01-0000-0000-0000-000000000001",
  "userId": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "storagePath": "d4e5f6a7/b1c2d3e4/barbican_01.webp",
  "likesCount": 7,
  "isGenerated": false,
  "isOfficial": false,
  "createdAt": "2025-12-05T18:35:00Z",
  "imageUrl": "https://xyzproject.supabase.co/storage/v1/object/public/review_images/d4e5f6a7/b1c2d3e4/barbican_01.webp",
  "isLikedByViewer": false
}
*/

/*
Example payload (ReviewLinkDTO):
{
  "id": "lnk01-0000-0000-0000-000000000001",
  "reviewId": "ub01-0000-0000-0000-000000000001",
  "userId": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "url": "https://www.archdaily.com/barbican-centre",
  "title": "Barbican Centre — ArchDaily",
  "createdAt": "2025-12-06T10:00:00Z",
  "likesCount": 4,
  "isLikedByViewer": true
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateReviewLinkSchema = z.object({
  reviewId: z.string().uuid(),
  url: z.string().url().max(2000),
  title: z.string().max(500).optional().nullable(),
});
```

**Environment Variable Registry:**

```
SUPABASE_SERVICE_ROLE_KEY
  Consumed by: generate-upload-url, delete-file, delete-storage-recursive edge functions
  Vercel Dashboard: not required (edge functions run on Supabase)
  Supabase Vault: required
  Notes: Used for storage admin operations in edge functions with manual JWT verification

MAPBOX_ACCESS_TOKEN
  Consumed by: (not this domain — listed here for completeness in edge functions)
  Vercel Dashboard: not required
  Supabase Vault: required
  Notes: Used by calculate-route and generate-itinerary edge functions
```

### Component 5: Storage Contract

**Bucket:** `review_images`
**Path convention:** `{userId}/{buildingId}/{filename}`
**Access model:** Public (CDN-accessible via Supabase Storage public URL)
**Upload flow:** Client requests a presigned upload URL from the `generate-upload-url` edge function → client uploads directly to storage → client creates a `review_images` row with the `storage_path`.
**Pre-signed URL expiry (upload):** 15 minutes
**Pre-signed URL expiry (read):** Not applicable (public bucket)
**Deletion:** Handled by `delete-file` and `delete-storage-recursive` edge functions, plus background `deletion_jobs`.

---

## 6. Social Domain

### Component 1: Database Schema

```sql
CREATE TABLE public.follows (
  follower_id     uuid NOT NULL,
  following_id    uuid NOT NULL,
  is_close_friend boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT follows_pkey PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id),
  CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.recommendations (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  recommender_id  uuid NOT NULL,
  recipient_id    uuid NOT NULL,
  building_id     uuid,
  event_id        uuid,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'ignored', 'visit_with')),
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT recommendations_recommender_id_fkey FOREIGN KEY (recommender_id) REFERENCES public.profiles(id),
  CONSTRAINT recommendations_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id),
  CONSTRAINT recommendations_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id),
  CONSTRAINT recommendations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT recommendations_single_target_check CHECK (
    (building_id IS NOT NULL AND event_id IS NULL)
    OR (building_id IS NULL AND event_id IS NOT NULL)
  )
);

CREATE TABLE public.blocks (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  reason     text,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT blocks_pkey PRIMARY KEY (id),
  CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.profiles(id),
  CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.reports (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_id uuid NOT NULL,
  reason      text NOT NULL,
  details     text,
  status      text DEFAULT 'pending',             -- 'pending' | 'reviewed' | 'resolved'
  created_at  timestamptz DEFAULT now(),

  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id),
  CONSTRAINT reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.notifications (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,                -- Notification recipient
  actor_id          uuid NOT NULL,                -- User who triggered it
  type              text NOT NULL CHECK (type IN (
    'follow', 'like', 'comment', 'recommendation',
    'friend_joined', 'suggest_follow', 'visit_request',
    'architect_verification'
  )),
  resource_id       uuid,                         -- References user_buildings.id (for like/comment)
  recommendation_id uuid,
  architect_id      uuid,                         -- Optional; historical notification correlation; no foreign key (migration `20270837000000_drop_legacy_architect_tables.sql`)
  metadata          jsonb,
  is_read           boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.user_buildings(id),
  CONSTRAINT notifications_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.recommendations(id)
);

CREATE TABLE public.suggested_profile_hides (
  user_id           uuid NOT NULL,
  suggested_user_id uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT suggested_profile_hides_pkey PRIMARY KEY (user_id, suggested_user_id),
  CONSTRAINT suggested_profile_hides_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT suggested_profile_hides_suggested_user_id_fkey FOREIGN KEY (suggested_user_id) REFERENCES public.profiles(id)
);
```

### Component 2: Security Policies

### RLS: follows

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "follows_select" ON follows
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "follows_insert" ON follows
  FOR INSERT
  WITH CHECK (follower_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "follows_update" ON follows
  FOR UPDATE
  USING (follower_id = (SELECT auth.uid()))
  WITH CHECK (follower_id = (SELECT auth.uid()));
  -- Allows toggling is_close_friend
```

**DELETE**
```sql
CREATE POLICY "follows_delete" ON follows
  FOR DELETE USING (follower_id = (SELECT auth.uid()));
```

### RLS: recommendations

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "recommendations_select" ON recommendations
  FOR SELECT USING (
    recommender_id = (SELECT auth.uid())
    OR recipient_id = (SELECT auth.uid())
  );
```

**INSERT**
```sql
CREATE POLICY "recommendations_insert" ON recommendations
  FOR INSERT
  WITH CHECK (recommender_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "recommendations_update" ON recommendations
  FOR UPDATE
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));
  -- Only the recipient can update status (accept/ignore).
```

-- No DELETE policy: recommendations are not deleted; they transition to 'ignored' status.

### RLS: blocks

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "blocks_select" ON blocks
  FOR SELECT USING (blocker_id = (SELECT auth.uid()));
```

**INSERT**
```sql
CREATE POLICY "blocks_insert" ON blocks
  FOR INSERT
  WITH CHECK (blocker_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "blocks_delete" ON blocks
  FOR DELETE USING (blocker_id = (SELECT auth.uid()));
```

-- No UPDATE policy: blocks are immutable; unblock = delete.

### RLS: reports

**Tenancy model:** not tenant-scoped

**INSERT**
```sql
CREATE POLICY "reports_insert" ON reports
  FOR INSERT
  WITH CHECK (reporter_id = (SELECT auth.uid()));
```

**SELECT**
```sql
CREATE POLICY "reports_select" ON reports
  FOR SELECT USING (
    reporter_id = (SELECT auth.uid())
    OR public.is_admin()
  );
```

-- No UPDATE/DELETE policy for regular users: admin-managed via is_admin().

### RLS: notifications

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (user_id = (SELECT auth.uid()));
```

**INSERT**
```sql
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
  -- Any authenticated user can trigger a notification (for another user).
```

**UPDATE**
```sql
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
  -- User can mark their own notifications as read.
```

-- No DELETE policy: notifications are not deleted by users.

### RLS: suggested_profile_hides

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "suggested_profile_hides_select" ON suggested_profile_hides
  FOR SELECT USING (user_id = (SELECT auth.uid()));
```

**INSERT**
```sql
CREATE POLICY "suggested_profile_hides_insert" ON suggested_profile_hides
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

-- No UPDATE/DELETE policy: hides are permanent dismissals.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| POST | /follow/:userId | Follow a user | supabase (client-side) |
| DELETE | /follow/:userId | Unfollow a user | supabase (client-side) |
| PATCH | /follow/:userId/close-friend | Toggle close friend | supabase (client-side) |
| POST | /recommend | Send building recommendation | supabase (client-side) |
| PATCH | /recommendation/:id | Accept/ignore recommendation | supabase (client-side) |
| POST | /block/:userId | Block a user | supabase (client-side) |
| DELETE | /block/:userId | Unblock a user | supabase (client-side) |
| POST | /report | Report a user | supabase (client-side) |
| GET | /notifications | Fetch notifications | supabase (client-side) |
| PATCH | /notifications/read | Mark notifications as read | supabase (client-side) |
| GET | (RPC) get_people_you_may_know | Social suggestions | supabase (RPC) |
| GET | (RPC) get_inviter_facepile | Referral attribution | supabase (RPC) |

```typescript
interface NotificationDTO {
  id: string;
  userId: string;                  // Mapped: user_id
  actorId: string;                 // Mapped: actor_id
  type: 'follow' | 'like' | 'comment' | 'recommendation' | 'friend_joined' | 'suggest_follow' | 'visit_request' | 'architect_verification';
  resourceId: string | null;       // Mapped: resource_id (user_buildings.id)
  recommendationId: string | null; // Mapped: recommendation_id
  architectId: string | null;      // Mapped: architect_id
  metadata: Record<string, unknown> | null;
  isRead: boolean;                 // Mapped: is_read
  createdAt: string;               // ISO 8601
  // Joined:
  actor: { id: string; username: string; avatarUrl: string | null };
}

interface RecommendationDTO {
  id: string;
  recommenderId: string;           // Mapped: recommender_id
  recipientId: string;             // Mapped: recipient_id
  buildingId: string;              // Mapped: building_id
  status: 'pending' | 'accepted' | 'ignored' | 'visit_with';
  createdAt: string;               // ISO 8601
  // Joined:
  recommender: { id: string; username: string; avatarUrl: string | null };
  building: BuildingSummaryDTO;
}

/*
Example payload (NotificationDTO):
{
  "id": "notif01-0000-0000-0000-000000000001",
  "userId": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "actorId": "e5f6a7b8-c9d0-4e1f-b2a3-c4d5e6f7a8b9",
  "type": "like",
  "resourceId": "ub01-0000-0000-0000-000000000001",
  "recommendationId": null,
  "architectId": null,
  "metadata": null,
  "isRead": false,
  "createdAt": "2026-03-27T09:15:00Z",
  "actor": {
    "id": "e5f6a7b8-c9d0-4e1f-b2a3-c4d5e6f7a8b9",
    "username": "concrete_soul",
    "avatarUrl": "profile-photos/e5f6a7b8.jpg"
  }
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateRecommendationSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(20),
  buildingId: z.string().uuid(),
  status: z.enum(['pending', 'visit_with']).default('pending'),
});

const UpdateRecommendationSchema = z.object({
  status: z.enum(['accepted', 'ignored']),
});

const CreateReportSchema = z.object({
  reportedId: z.string().uuid(),
  reason: z.string().min(1).max(200),
  details: z.string().max(2000).optional().nullable(),
});

const CreateBlockSchema = z.object({
  blockedId: z.string().uuid(),
  reason: z.string().max(500).optional().nullable(),
});
```

No additional environment variables required for this domain.

---

## 7. Collections Domain

### Component 1: Database Schema

```sql
CREATE TABLE public.collections (
  id                              uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id                        uuid NOT NULL,
  name                            text NOT NULL,
  description                     text,
  slug                            text NOT NULL UNIQUE,
  is_public                       boolean NOT NULL DEFAULT false,
  show_community_images           boolean NOT NULL DEFAULT true,
  rating_mode                     text DEFAULT 'viewer'
                                  CHECK (rating_mode IN ('viewer', 'contributors_max', 'admins_max', 'member')),
  rating_source_user_id           uuid,
  categorization_method           text DEFAULT 'default'
                                  CHECK (categorization_method IN ('default', 'custom', 'status', 'rating_member', 'uniform')),
  custom_categories               jsonb DEFAULT '[]',
  categorization_selected_members uuid[],
  external_link                   text,
  itinerary                       jsonb,          -- AI-generated itinerary data
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT collections_pkey PRIMARY KEY (id),
  CONSTRAINT collections_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT collections_rating_source_user_id_fkey FOREIGN KEY (rating_source_user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.collection_items (
  id                 uuid    NOT NULL DEFAULT gen_random_uuid(),
  collection_id      uuid    NOT NULL,
  building_id        uuid    NOT NULL,
  order_index        integer NOT NULL DEFAULT 0,
  note               text,
  custom_category_id text,
  is_hidden          boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT collection_items_pkey PRIMARY KEY (id),
  CONSTRAINT collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id),
  CONSTRAINT collection_items_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id)
);

CREATE TABLE public.collection_contributors (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL,
  user_id       uuid NOT NULL,
  role          text NOT NULL CHECK (role IN ('admin', 'editor', 'contributor', 'viewer')),
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT collection_contributors_pkey PRIMARY KEY (id),
  CONSTRAINT collection_contributors_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id),
  CONSTRAINT collection_contributors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.collection_favorites (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  collection_id uuid NOT NULL,
  created_at    timestamptz DEFAULT now(),

  CONSTRAINT collection_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT collection_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT collection_favorites_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id)
);

CREATE TABLE public.collection_markers (
  id                  uuid             NOT NULL DEFAULT gen_random_uuid(),
  collection_id       uuid             NOT NULL,
  google_place_id     text,
  google_primary_type text,
  name                text             NOT NULL,
  category            text             NOT NULL CHECK (category IN ('accommodation', 'dining', 'transport', 'attraction', 'other')),
  lat                 double precision NOT NULL,
  lng                 double precision NOT NULL,
  address             text,
  notes               text,
  website             text,
  created_by          uuid             NOT NULL,
  created_at          timestamptz      NOT NULL DEFAULT now(),

  CONSTRAINT collection_markers_pkey PRIMARY KEY (id),
  CONSTRAINT collection_markers_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id),
  CONSTRAINT collection_markers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
```

### Component 2: Security Policies

### RLS: collections

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "collections_select" ON collections
  FOR SELECT USING (
    is_public = true
    OR owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM collection_contributors cc
      WHERE cc.collection_id = id
      AND cc.user_id = (SELECT auth.uid())
    )
  );
```

**INSERT**
```sql
CREATE POLICY "collections_insert" ON collections
  FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "collections_update" ON collections
  FOR UPDATE
  USING (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM collection_contributors cc
      WHERE cc.collection_id = id
      AND cc.user_id = (SELECT auth.uid())
      AND cc.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM collection_contributors cc
      WHERE cc.collection_id = id
      AND cc.user_id = (SELECT auth.uid())
      AND cc.role IN ('admin', 'editor')
    )
  );
```

**DELETE**
```sql
CREATE POLICY "collections_delete" ON collections
  FOR DELETE USING (owner_id = (SELECT auth.uid()));
```

### RLS: collection_items

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "collection_items_select" ON collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.is_public = true
        OR c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
        )
      )
    )
  );
```

**INSERT**
```sql
CREATE POLICY "collection_items_insert" ON collection_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
          AND cc.role IN ('admin', 'editor', 'contributor')
        )
      )
    )
  );
```

**UPDATE**
```sql
CREATE POLICY "collection_items_update" ON collection_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
          AND cc.role IN ('admin', 'editor')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
          AND cc.role IN ('admin', 'editor')
        )
      )
    )
  );
```

**DELETE**
```sql
CREATE POLICY "collection_items_delete" ON collection_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
          AND cc.role IN ('admin', 'editor')
        )
      )
    )
  );
```

### RLS: collection_contributors

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "collection_contributors_select" ON collection_contributors
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "collection_contributors_insert" ON collection_contributors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND c.owner_id = (SELECT auth.uid())
    )
  );
  -- Only the collection owner can invite contributors.
```

**DELETE**
```sql
CREATE POLICY "collection_contributors_delete" ON collection_contributors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND c.owner_id = (SELECT auth.uid())
    )
    OR user_id = (SELECT auth.uid())
  );
  -- Owner can remove anyone; contributor can remove themselves.
```

-- No UPDATE policy: contributor role changes require delete + re-insert.

### RLS: collection_favorites

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "collection_favorites_select" ON collection_favorites
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "collection_favorites_insert" ON collection_favorites
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "collection_favorites_delete" ON collection_favorites
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

-- No UPDATE policy: favorites are immutable.

### RLS: collection_markers

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "collection_markers_select" ON collection_markers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.is_public = true
        OR c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
        )
      )
    )
  );
```

**INSERT**
```sql
CREATE POLICY "collection_markers_insert" ON collection_markers
  FOR INSERT
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
          AND cc.role IN ('admin', 'editor', 'contributor')
        )
      )
    )
  );
```

**DELETE**
```sql
CREATE POLICY "collection_markers_delete" ON collection_markers
  FOR DELETE USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND c.owner_id = (SELECT auth.uid())
    )
  );
```

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /:username/collections/:slug | Fetch collection detail | supabase (client-side) |
| POST | /collections/new | Create collection | supabase (client-side) |
| PATCH | /collections/:id | Update collection settings | supabase (client-side) |
| DELETE | /collections/:id | Delete collection | supabase (client-side) |
| POST | /collections/:id/items | Add buildings to collection | supabase (client-side) |
| DELETE | /collections/:id/items/:itemId | Remove item | supabase (client-side) |
| POST | /collections/:id/markers | Add non-building marker | supabase (client-side) |
| POST | /collections/:id/contributors | Invite contributor | supabase (client-side) |
| POST | /collections/:id/favorite | Favorite collection | supabase (client-side) |
| DELETE | /collections/:id/favorite | Unfavorite collection | supabase (client-side) |
| GET | (RPC) get_collection_stats | Collection analytics | supabase (RPC) |
| GET | (RPC) get_collection_buildings | Buildings with coordinates | supabase (RPC) |
| GET | (RPC) get_collections_feed | Collections feed (public lists from followed users) | supabase (RPC) |
| POST | (edge fn) generate-itinerary | AI itinerary generation | supabase-edge-function |
| POST | (edge fn) calculate-route | Route calculation | supabase-edge-function |

⚠️ STATIC ROUTE REQUIRED — `/collections/new` must take precedence over `/collections/:id`.

```typescript
interface CollectionDTO {
  id: string;
  ownerId: string;                      // Mapped: owner_id
  name: string;
  description: string | null;
  slug: string;
  isPublic: boolean;                    // Mapped: is_public
  showCommunityImages: boolean;         // Mapped: show_community_images
  ratingMode: 'viewer' | 'contributors_max' | 'admins_max' | 'member';
  categorizationMethod: 'default' | 'custom' | 'status' | 'rating_member' | 'uniform';
  customCategories: { id: string; label: string; color: string }[];
  externalLink: string | null;          // Mapped: external_link
  itinerary: ItineraryDTO | null;
  createdAt: string;                    // ISO 8601
  updatedAt: string;                    // ISO 8601
  // Joined:
  owner: { id: string; username: string; avatarUrl: string | null };
  itemCount: number;                    // Computed: COUNT of collection_items
  contributors: CollectionContributorDTO[];
  isFavoritedByViewer: boolean;         // Computed: exists in collection_favorites
}

interface CollectionItemDTO {
  id: string;
  collectionId: string;                 // Mapped: collection_id
  buildingId: string;                   // Mapped: building_id
  orderIndex: number;                   // Mapped: order_index
  note: string | null;
  customCategoryId: string | null;      // Mapped: custom_category_id
  isHidden: boolean;                    // Mapped: is_hidden
  createdAt: string;                    // ISO 8601
  building: BuildingSummaryDTO;
}

interface CollectionContributorDTO {
  id: string;
  userId: string;                       // Mapped: user_id
  role: 'admin' | 'editor' | 'contributor' | 'viewer';
  user: { id: string; username: string; avatarUrl: string | null };
}

/** Preview row from `get_collections_feed` buildings subquery (snake_case JSON). */
interface CollectionPreviewBuilding {
  building_id: string;
  name: string;
  main_image_url: string | null;
  community_preview_url: string | null;
}

/** Raw JSON row from `get_collections_feed` RPC (snake_case). Authenticated only. */
interface RawCollectionFeedRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updated_at: string;
  owner_id: string;
  primary_tag: string | null;
  owner: {
    username: string | null;
    avatar_url: string | null;
  };
  preview_buildings: CollectionPreviewBuilding[];
  building_count: number;
}

/** CamelCase DTO for home-feed collection cards / `useCollectionsFeed`. */
interface FeedCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updatedAt: string;
  ownerId: string;
  primaryTag: string | null;
  owner: { id: string; username: string | null; avatarUrl: string | null };
  previewBuildings: Array<{
    buildingId: string;
    name: string;
    mainImageUrl: string | null;
    communityPreviewUrl: string | null;
  }>;
  buildingCount: number;
  isLiked?: boolean;
  likesCount?: number;
}

interface CollectionMarkerDTO {
  id: string;
  collectionId: string;                 // Mapped: collection_id
  googlePlaceId: string | null;         // Mapped: google_place_id
  /** Google Places primary type (e.g. bakery); refines trip-logistics icons vs coarse category. */
  googlePrimaryType: string | null;     // Mapped: google_primary_type
  name: string;
  category: 'accommodation' | 'dining' | 'transport' | 'attraction' | 'other';
  lat: number;
  lng: number;
  address: string | null;
  notes: string | null;
  website: string | null;
  createdAt: string;                    // ISO 8601
}

interface ItineraryDTO {
  days: ItineraryDayDTO[];
}

interface ItineraryDayDTO {
  dayNumber: number;
  title: string | null;
  description: string | null;
  transportMode: 'walking' | 'driving' | 'cycling';
  stops: ItineraryStopDTO[];
  routeGeometry: GeoJSON.LineString | null;
}

interface ItineraryStopDTO {
  buildingId: string;
  order: number;
  transit: {
    mode: 'walking' | 'driving' | 'cycling' | null;
    customInstructions: string | null;
    estimatedMinutes: number | null;
  } | null;
}

/*
Example payload (CollectionDTO):
{
  "id": "col01-0000-0000-0000-000000000001",
  "ownerId": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "name": "Brutalist Gems of London",
  "description": "A curated tour of London's finest brutalist architecture.",
  "slug": "brutalist-gems-london",
  "isPublic": true,
  "showCommunityImages": true,
  "ratingMode": "viewer",
  "categorizationMethod": "custom",
  "customCategories": [
    { "id": "cat-01", "label": "Must See", "color": "#ef4444" },
    { "id": "cat-02", "label": "Worth a Detour", "color": "#f59e0b" }
  ],
  "externalLink": "https://brutalismguide.co.uk",
  "itinerary": null,
  "createdAt": "2025-11-01T10:00:00Z",
  "updatedAt": "2026-03-15T14:20:00Z",
  "owner": {
    "id": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
    "username": "archi_wanderer",
    "avatarUrl": "profile-photos/d4e5f6a7.jpg"
  },
  "itemCount": 12,
  "contributors": [
    {
      "id": "cc01-0000-0000-0000-000000000001",
      "userId": "e5f6a7b8-c9d0-4e1f-b2a3-c4d5e6f7a8b9",
      "role": "editor",
      "user": { "id": "e5f6a7b8-c9d0-4e1f-b2a3-c4d5e6f7a8b9", "username": "concrete_soul", "avatarUrl": null }
    }
  ],
  "isFavoritedByViewer": false
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateCollectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  isPublic: z.boolean().default(false),
  externalLink: z.string().url().max(2000).optional().nullable(),
});

const UpdateCollectionSchema = CreateCollectionSchema.partial().extend({
  showCommunityImages: z.boolean().optional(),
  ratingMode: z.enum(['viewer', 'contributors_max', 'admins_max', 'member']).optional(),
  categorizationMethod: z.enum(['default', 'custom', 'status', 'rating_member', 'uniform']).optional(),
  customCategories: z.array(z.object({
    id: z.string().max(50),
    label: z.string().min(1).max(100),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  })).max(20).optional(),
});

const CreateCollectionItemSchema = z.object({
  buildingId: z.string().uuid(),
  note: z.string().max(1000).optional().nullable(),
  customCategoryId: z.string().max(50).optional().nullable(),
});

const CreateCollectionMarkerSchema = z.object({
  name: z.string().min(1).max(300),
  category: z.enum(['accommodation', 'dining', 'transport', 'attraction', 'other']),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  googlePlaceId: z.string().max(500).optional().nullable(),
  googlePrimaryType: z.string().max(120).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  website: z.string().url().max(2000).optional().nullable(),
});

const GenerateItinerarySchema = z.object({
  collectionId: z.string().uuid(),
  days: z.number().int().min(1).max(14),
  transportMode: z.enum(['walking', 'driving', 'cycling']),
});
```

**Environment Variable Registry:**

```
MAPBOX_ACCESS_TOKEN
  Consumed by: calculate-route, generate-itinerary edge functions
  Vercel Dashboard: not required
  Supabase Vault: required
  Notes: Mapbox Directions API v5 access token for route calculation
```

---

## 8. Folders Domain

### Component 1: Database Schema

```sql
CREATE TABLE public.user_folders (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL,
  name        text NOT NULL,
  slug        text NOT NULL,
  description text,
  is_public   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_folders_pkey PRIMARY KEY (id),
  CONSTRAINT user_folders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

CREATE TABLE public.user_folder_items (
  folder_id     uuid NOT NULL,
  collection_id uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_folder_items_pkey PRIMARY KEY (folder_id, collection_id),
  CONSTRAINT user_folder_items_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.user_folders(id),
  CONSTRAINT user_folder_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id)
);
```

### Component 2: Security Policies

### RLS: user_folders

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "user_folders_select" ON user_folders
  FOR SELECT USING (
    is_public = true
    OR owner_id = (SELECT auth.uid())
  );
```

**INSERT**
```sql
CREATE POLICY "user_folders_insert" ON user_folders
  FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "user_folders_update" ON user_folders
  FOR UPDATE
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "user_folders_delete" ON user_folders
  FOR DELETE USING (owner_id = (SELECT auth.uid()));
```

### RLS: user_folder_items

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "user_folder_items_select" ON user_folder_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_folders f
      WHERE f.id = folder_id
      AND (f.is_public = true OR f.owner_id = (SELECT auth.uid()))
    )
  );
```

**INSERT**
```sql
CREATE POLICY "user_folder_items_insert" ON user_folder_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_folders f
      WHERE f.id = folder_id
      AND f.owner_id = (SELECT auth.uid())
    )
  );
```

**DELETE**
```sql
CREATE POLICY "user_folder_items_delete" ON user_folder_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_folders f
      WHERE f.id = folder_id
      AND f.owner_id = (SELECT auth.uid())
    )
  );
```

-- No UPDATE policy: folder items are added or removed, not updated in place.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /:username/folders/:slug | Fetch folder contents | supabase (client-side) |
| POST | /folders/new | Create folder | supabase (client-side) |
| PATCH | /folders/:id | Update folder | supabase (client-side) |
| DELETE | /folders/:id | Delete folder | supabase (client-side) |
| POST | /folders/:id/items | Add collection to folder | supabase (client-side) |
| DELETE | /folders/:id/items/:collectionId | Remove collection from folder | supabase (client-side) |

```typescript
interface FolderDTO {
  id: string;
  ownerId: string;            // Mapped: owner_id
  name: string;
  slug: string;
  description: string | null;
  isPublic: boolean;           // Mapped: is_public
  createdAt: string;           // ISO 8601
  // Joined:
  collections: CollectionSummaryDTO[];
  collectionCount: number;     // Computed: COUNT of user_folder_items
}

interface CollectionSummaryDTO {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  itemCount: number;
  previewImages: string[];     // Computed: first 4 hero images from collection items
}

/*
Example payload (FolderDTO):
{
  "id": "fld01-0000-0000-0000-000000000001",
  "ownerId": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "name": "European Trips",
  "slug": "european-trips",
  "description": "Collections from my architecture tours across Europe.",
  "isPublic": true,
  "createdAt": "2026-01-15T08:00:00Z",
  "collections": [
    {
      "id": "col01-0000-0000-0000-000000000001",
      "name": "Brutalist Gems of London",
      "slug": "brutalist-gems-london",
      "isPublic": true,
      "itemCount": 12,
      "previewImages": ["review_images/img1.jpg", "review_images/img2.jpg"]
    }
  ],
  "collectionCount": 3
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateFolderSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  isPublic: z.boolean().default(true),
});

const UpdateFolderSchema = CreateFolderSchema.partial();
```

No additional environment variables required for this domain.

---

## 9a. People & Credit Taxonomy (Building Credits v2)

Introduced in Roadmap Phase 1 Task 1.1. Individual practitioners are represented in **`people`**. Primary keys were preserved across the Phase 1 catalog migration where applicable. Credit role/tier enums feed **`building_credits`** (Task 1.4); credit **status** and **flag_reason** enums are defined in §9d.

### Component 1: Database schema

```sql
CREATE TYPE public.person_claim_status AS ENUM ('unclaimed', 'claimed', 'verified');

CREATE TYPE public.credit_role_enum AS ENUM (
  'design_architect',
  'architect_of_record',
  'executive_architect',
  'interior_architect',
  'landscape_architect',
  'urban_designer',
  'conservation_architect',
  'structural_engineer',
  'mep_engineer',
  'civil_engineer',
  'geotechnical_engineer',
  'facade_engineer',
  'wind_consultant',
  'acoustic_consultant',
  'fire_engineer',
  'lighting_designer',
  'developer',
  'main_contractor',
  'project_manager',
  'cost_consultant',
  'planning_consultant',
  'graphic_wayfinding_designer',
  'art_consultant',
  'sustainability_consultant',
  'heritage_consultant',
  'other'
);

CREATE TYPE public.credit_tier_enum AS ENUM ('primary', 'contributor', 'ancillary');

CREATE TABLE public.people (
  id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bio text,
  nationality text,
  birth_year integer,
  death_year integer,
  avatar_url text,
  website text,
  location_note text,
  claimed_by_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  claim_status public.person_claim_status NOT NULL DEFAULT 'unclaimed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT people_pkey PRIMARY KEY (id)
);
```

Helper: `public.slugify_person_name(text)` — lowercases, replaces non-alphanumeric runs with `-`, trims; used for initial slug generation during migration.

**Migration notes:** Initial rows came from Phase 1 SQL against the pre-v2 catalog (`website` / `location_note` from imported URL and headquarters text). `avatar_url` may be null on older rows. Slug collisions on the same base slug use numeric suffixes `-2`, `-3`, … `claimed_by_user_id` is set from `profiles.verified_architect_id`, then from `architect_claims` where `status = 'verified'` for rows still unclaimed; `claim_status` becomes `claimed` for those rows.

### Component 2: RLS (`people`)

**Tenancy model:** not tenant-scoped; claim owner matches `profiles.id` (= auth user id).

**SELECT**

```sql
CREATE POLICY "people_select" ON public.people
  FOR SELECT USING (true);
```

**INSERT**

```sql
CREATE POLICY "people_insert" ON public.people
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
```

**UPDATE**

```sql
CREATE POLICY "people_update" ON public.people
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR claimed_by_user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR claimed_by_user_id = (SELECT auth.uid())
  );
```

No `DELETE` policy (rows are not deleted via app in this phase).

### Component 3: Application API — `people` (Phase 2 Task 2.2)

Browser Supabase client wrappers live in `src/features/credits/api/people.ts`. Payloads use camelCase TypeScript types from `src/features/credits/types.ts`:

| Function | Behaviour |
|----------|-----------|
| `getPerson(slug)` | `Person` + `credits: PersonCreditWithBuilding[]` (each credit includes `building` summary); `null` if slug missing. |
| `searchPeople(query)` | `PersonSummary[]` (`associatedCompanies`, `knownBuilding` from affiliations / first visible credit per person; also `nationality`, `avatarUrl`, `creditCount` for global search UI). |
| `createPerson(input)` | Zod-validated insert; slug via `slugifyPersonName` + numeric suffix on collision. |
| `updatePerson(id, input)` | Zod partial update; RLS (owner / admin). Returns `null` if row absent after update. |
| `getPersonPortfolio(personId)` | `PersonPortfolioByTier` — credits with `building` join, ordered per tier then `display_order` / `is_lead`. |
| `personQueryKey(slug)` | TanStack Query key factory for `getPerson(slug)` cache entries. |
| `getClaimedPersonSummaryForProfile(userId)` | For account settings / own profile: the `people` row where `claimed_by_user_id` matches, plus a `building_credits` count for that person; `null` if unclaimed. |
| `claimPerson(personId, slug, reason)` | Roadmap Phase 7 Task 7.1. Zod `reason` ∈ `self` \| `representative` (form only; not persisted). Calls RPC `claim_person(p_person_id)`, then `getPerson(slug)` to return the updated `Person`. Best-effort `notify-entity-claimed` after a successful claim. Throws `ClaimPersonError` with codes matching RPC / refresh failures. |
| `notifyEntityClaimed(personId)` | `supabase.functions.invoke('notify-entity-claimed')` with `{ personId }`. Redundant if the caller already used `claimPerson` (which invokes the function). |

DTOs: `BuildingSummaryForPersonCredit`, `PersonCreditWithBuilding`, `PersonWithCredits`, `PersonPortfolioItem`, `PersonPortfolioByTier`. `slugifyPersonName` mirrors SQL `public.slugify_person_name`.

### Component 4: RPC `claim_person`

Migration `20270828000000_claim_person_rpc.sql` (Roadmap Phase 7 Task 7.1). **`SECURITY DEFINER`**, `SET search_path = public, pg_temp`. **`REVOKE ALL` from `PUBLIC`**; **`GRANT EXECUTE`** to **`authenticated`** only. Argument: `p_person_id uuid`.

- Requires `auth.uid()`; returns `{ "ok": false, "error": "not_authenticated" }` if null.
- Returns `{ "ok": false, "error": "already_claimed_other" }` if another `people` row already has `claimed_by_user_id = auth.uid()`.
- **Idempotent:** if the row already has `claimed_by_user_id = auth.uid()` and `claim_status = 'claimed'`, returns `{ "ok": true, "person_id": "<uuid>" }` without error.
- Otherwise requires `claim_status = 'unclaimed'` and `claimed_by_user_id IS NULL`; else `{ "ok": false, "error": "not_claimable" }`.
- **Not found:** `{ "ok": false, "error": "not_found" }`.
- On success: sets `claimed_by_user_id`, `claim_status = 'claimed'`, `updated_at`.

### Component 5: Edge Function `notify-entity-claimed`

Roadmap Phase 7 Task 7.1. **`verify_jwt = false`**; manual `getUser` on `Authorization` (same pattern as `notify-credited-entities`). **POST** JSON body: `{ "personId": "<uuid>" }`.

- Verifies the `people` row exists, `claimed_by_user_id` equals the JWT user, and `claim_status = 'claimed'`.
- Selects non-`hidden` `building_credits` with `person_id = personId`, collects distinct `added_by_user_id` (excluding the caller).
- For each contributor, **`auth.admin.getUserById`** (service role) to read email; sends one Resend message per address using **`EntityClaimedEmail`** (`supabase/functions/_shared/emails/EntityClaimedEmail.tsx`): copy explains the profile was claimed and to flag from the building page if incorrect.
- Requires **`RESEND_API_KEY`**; **`SITE_URL`** (default `https://plano.app`). Logs `notify_entity_claimed` with `{ personId, contributorCount, sent }`.

---

## 9b. Companies & stewards (Building Credits v2)

Introduced in Roadmap Phase 1 Task 1.2. Practices and studios live in **`companies`**. Primary keys were preserved across the Phase 1 catalog migration where applicable. `claim_status` reuses `person_claim_status`. Membership is **`company_stewards`**.

### Component 1: Database schema

```sql
CREATE TYPE public.company_steward_role AS ENUM ('owner', 'steward');

CREATE TABLE public.companies (
  id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bio text,
  country text,
  founded_year integer,
  dissolved_year integer,
  logo_url text,
  website text,
  verified_domain text,
  claim_status public.person_claim_status NOT NULL DEFAULT 'unclaimed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT companies_pkey PRIMARY KEY (id)
);

CREATE TABLE public.company_stewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.company_steward_role NOT NULL,
  invited_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT company_stewards_pkey PRIMARY KEY (id),
  CONSTRAINT company_stewards_company_id_user_id_key UNIQUE (company_id, user_id)
);
```

**Migration notes:** Initial rows used Phase 1 SQL from the pre-v2 catalog (`website` / `country` best-effort from imported URL and headquarters text). `logo_url` and `verified_domain` may be null on older rows. Slugs use `slugify_person_name(name)` with `-2`, `-3`, … suffixes on collision. Initial `claim_status` is `unclaimed`; rows with `profiles.verified_architect_id` pointing at that company get an `company_stewards` row (`role = owner`) and `claim_status` becomes `claimed`.

### Component 2: RLS (`companies`)

**SELECT**

```sql
CREATE POLICY "companies_select" ON public.companies
  FOR SELECT USING (true);
```

**INSERT** — authenticated

```sql
CREATE POLICY "companies_insert" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
```

**UPDATE** — admin or any steward of that company

```sql
CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.company_stewards cs
      WHERE cs.company_id = companies.id
        AND cs.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.company_stewards cs
      WHERE cs.company_id = companies.id
        AND cs.user_id = (SELECT auth.uid())
    )
  );
```

### Component 3: RLS (`company_stewards`)

**SELECT** — admin, row’s `user_id`, or any steward of the same `company_id` (membership for co-stewards is evaluated via SQL helper `plano_auth_is_company_steward(company_id)` — `SECURITY DEFINER` — so the policy does not sub-select `company_stewards` under the same RLS rules, avoiding infinite recursion on REST reads; migration `20270839000000_feed_main_image_and_steward_rls.sql`).

**INSERT** — admin; or existing steward of `company_id`; or bootstrap: `user_id = auth.uid()` and `role = owner` and no existing steward row for `company_id`

**UPDATE** — admin or any steward of the same `company_id`

**DELETE** — admin; or the row’s `user_id` (leave company); or an **owner** steward of the same `company_id` removing a row whose `role` is `steward` (owners cannot delete other owners via this policy).

### Component 3a: `company_steward_invites` (Task 4.2)

```sql
CREATE TABLE public.company_steward_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  email_normalized text NOT NULL,
  token_hash bytea NOT NULL,
  invited_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT company_steward_invites_pkey PRIMARY KEY (id),
  CONSTRAINT company_steward_invites_token_hash_key UNIQUE (token_hash)
);
```

**RLS:** enabled; **no** policies for `anon` / `authenticated` — rows are written and read by **Edge Functions** using the **service role** (and by `SECURITY DEFINER` RPC logic as needed).

**RPC:** `redeem_company_steward_invite(p_token_hex text)` — authenticated only; validates 64-char hex secret → SHA-256 lookup; requires `auth.users.email` (lower(trim)) to match `email_normalized`; rejects used/expired tokens; inserts `company_stewards` (`role = steward`, `invited_by` from invite); sets `consumed_at`. Returns `jsonb` `{ ok, company_slug }` or `{ ok: false, error }`.

**Edge Function:** `invite-company-steward` — `verify_jwt = false`; manual `getUser` on `Authorization`; caller must be an **owner** steward of `companyId`; inserts invite row (service role); logs `company_steward_invite_created` to function logs; sends email via Resend when `RESEND_API_KEY` is set (accept URL: `/accept-company-steward?token=…`).

### Component 3b: `company_claim_verification_tokens` (Roadmap Phase 7 Task 7.2)

First company claimant: work-email verification before inserting the **owner** `company_stewards` row. Migration `20270829000000_company_claim_verification_tokens.sql`.

```sql
CREATE TABLE public.company_claim_verification_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  email_normalized text NOT NULL,
  token_hash bytea NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT company_claim_verification_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT company_claim_verification_tokens_token_hash_key UNIQUE (token_hash)
);
```

**RLS:** enabled; **no** policies for `anon` / `authenticated` — Edge Function + `SECURITY DEFINER` RPC only.

**RPC:** `redeem_company_claim_token(p_token_hex text)` — **`authenticated`** only; 64-char hex → SHA-256 lookup; requires `requester_user_id = auth.uid()`; rejects used/expired tokens; requires `companies.claim_status = 'unclaimed'` and **no** `company_stewards` rows for that `company_id`; inserts `company_stewards` (`role = owner`, `invited_by` null); sets `companies.claim_status = 'claimed'`, `companies.verified_domain` from the email host (lowercase, strips leading `www.`); sets `consumed_at`. Returns `jsonb` `{ ok: true, company_slug }` or `{ ok: false, error }` with `error` ∈ `not_authenticated` \| `invalid_token` \| `unknown_token` \| `expired` \| `already_used` \| `wrong_user` \| `not_claimable`.

**Edge Function:** `verify-company-claim` — `verify_jwt = false`; manual `getUser` on `Authorization`; body `{ companyId, email }`. If the company is **not** claimable (`claim_status <> 'unclaimed'` or any `company_stewards` exist) **and** `companies.verified_domain` is set: compares normalized email host to `verified_domain` (lowercase, strips `www.`); on mismatch returns JSON `{ ok: false, action: 'dispute', companySlug }` (**HTTP 200**) so the client routes to **`/company/:slug/dispute`** (Task 7.4 dispute form). Otherwise if already claimed returns **`already_claimed`** (**HTTP 409**). If claimable: inserts token row (service role), emails verification link **`{SITE_URL}/verify-company-claim/{64-char hex}`** (7-day expiry) when `RESEND_API_KEY` is set.

**SSR route:** `GET /verify-company-claim/:token` — loader runs `redeem_company_claim_token` when the user is signed in; on success **`redirect`** to `/company/:slug?claimVerified=1`; if signed out, renders sign-in CTA with `redirect` back to the same path.

### Component 3c: `company_steward_requests` + `company_steward_request_approval_tokens` (Roadmap Phase 7 Task 7.3)

Non-owners can request steward access on **claimed** companies. Owners receive per-owner email links with opaque tokens.

```sql
CREATE TYPE public.company_steward_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.company_steward_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT ''::text,
  status public.company_steward_request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  requester_notified_at timestamptz,
  CONSTRAINT company_steward_requests_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX company_steward_requests_one_pending_per_user_company
  ON public.company_steward_requests (company_id, requester_user_id)
  WHERE status = 'pending';

CREATE TABLE public.company_steward_request_approval_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.company_steward_requests (id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_steward_request_approval_tokens_pkey PRIMARY KEY (id)
);
```

**RLS (`company_steward_requests`):** **SELECT** — admin, the row’s `requester_user_id`, or any steward of the same `company_id`. **INSERT** — authenticated user with `requester_user_id = auth.uid()`, company `claim_status = 'claimed'`, and **no** `company_stewards` row for that user and company.

**RLS (`company_steward_request_approval_tokens`):** enabled; **no** client policies — Edge Functions + `SECURITY DEFINER` RPC only.

**RPC:** `approve_company_steward_request(p_token_hex text)` — **authenticated**; 64-char hex → SHA-256 lookup; requires caller to be an **owner** steward of the request’s company; if request already **`approved`**, returns success (`already_processed: true`) and consumes the token when appropriate; if **`pending`**, inserts `company_stewards` (`role = steward`, `invited_by` = owner), sets request `approved` + `resolved_at`, consumes **all** approval tokens for that request. Returns `jsonb` `{ ok: true, company_slug, request_id, already_processed }` or `{ ok: false, error }` with `error` ∈ `not_authenticated` \| `invalid_token` \| `unknown_token` \| `expired` \| `already_used` \| `not_owner` \| `not_pending`.

**RPC:** `approve_company_steward_request_by_id(p_request_id uuid)` — **authenticated**; migration `20270835000000_steward_request_owner_dashboard_rpcs.sql`. Same approval semantics as the token RPC (owner-only, `pending` → approved, consumes all approval tokens, idempotent when already **`approved`**) but keyed by request id for the in-app company dashboard. Returns the same `jsonb` shape; `error` may also be `not_found` when the id is missing.

**RPC:** `reject_company_steward_request_by_id(p_request_id uuid)` — **authenticated**; same migration. **Owner** only; if **`pending`**, sets request `rejected` + `resolved_at` and consumes unconsumed approval tokens so email links cannot approve afterward. If already **`rejected`**, returns success with `already_processed: true`. Returns `jsonb` `{ ok: true, company_slug, request_id, already_processed }` or `{ ok: false, error }` with `error` ∈ `not_authenticated` \| `not_owner` \| `not_pending` \| `not_found` (e.g. already **`approved`** yields `not_pending`).

**Edge Functions:** `notify-steward-request` — `verify_jwt = false`; manual `getUser`; body `{ requestId }`; caller must be the requester; idempotent if approval tokens already exist for the request; creates one token row per **owner**, emails each owner `{SITE_URL}/approve-steward-request/{64-char hex}` (7-day expiry) when `RESEND_API_KEY` is set. `notify-steward-request-approved` — same auth pattern; body `{ requestId }`; caller must be an **owner** of the company; sends requester email when `RESEND_API_KEY` is set; sets `requester_notified_at` (idempotent).

**SSR route:** `GET /approve-steward-request/:token` — loader runs `approve_company_steward_request` when signed in, then invokes `notify-steward-request-approved`, then **`redirect`** to `/company/:slug?stewardApproved=1`.

### Component 3d: `company_claim_disputes` (Roadmap Phase 7 Task 7.4)

Users may dispute an existing company claim; admins resolve manually (Phase 8). Migration `20270831000000_company_claim_disputes.sql`.

```sql
CREATE TYPE public.company_claim_dispute_status AS ENUM ('open', 'resolved');

CREATE TABLE public.company_claim_disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  disputed_by_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reason text NOT NULL,
  evidence_url text,
  status public.company_claim_dispute_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_claim_disputes_pkey PRIMARY KEY (id),
  CONSTRAINT company_claim_disputes_reason_nonempty CHECK (length(trim(reason)) > 0)
);

CREATE UNIQUE INDEX company_claim_disputes_one_open_per_user_company
  ON public.company_claim_disputes (company_id, disputed_by_user_id)
  WHERE status = 'open';
```

**RLS (`company_claim_disputes`):** **SELECT** — admin or the row’s `disputed_by_user_id`. **INSERT** — authenticated user with `disputed_by_user_id = auth.uid()`, company `claim_status = 'claimed'`, and **no** `company_stewards` row for that user and company. **UPDATE** — admin only (for resolving disputes in Phase 8).

**Edge Function:** `notify-admin-dispute` — `verify_jwt = false`; manual `getUser`; body `{ disputeId }`; caller must be the disputant; dispute must be `open`; emails **`PLANO_ADMIN_NOTIFY_EMAIL`** or **`COMPANY_CLAIM_DISPUTE_NOTIFY_EMAIL`** if set, otherwise **`hello@plano.app`**, with company name, profile URL, reason, and evidence URL when `RESEND_API_KEY` is set.

**SSR route:** `GET /company/:slug/dispute` — claimed companies only; company stewards are redirected to `/company/:slug`; form submits `insert` + `notify-admin-dispute`, then **`redirect`** to `/company/:slug?disputeSubmitted=1`. Claimed company page shows **Dispute this claim** (or **Log in to dispute**) below the steward-request CTA, and a **Dispute under review** notice visible only to the submitter while an `open` row exists for them.

### Component 4: Application API — `companies` (Phase 2 Task 2.3)

Browser Supabase client wrappers live in `src/features/credits/api/companies.ts`. Payloads use camelCase TypeScript types from `src/features/credits/types.ts`:

| Function | Behaviour |
|----------|-----------|
| `getCompany(slug)` | `Company` + `credits: CompanyCreditWithBuilding[]` (each credit includes `building` summary and joined `person` / `company`); `null` if slug missing. |
| `searchCompanies(query)` | `CompanySummary[]` (`id`, `name`, `slug`, `claimStatus`, `country`, `logoUrl`, `creditCount` — visible `building_credits` count per company for picker disambiguation). |
| `createCompany(input)` | Zod-validated insert; slug via `slugifyCompanyName` (same rules as `slugify_person_name`) + numeric suffix on collision. |
| `updateCompany(id, input)` | Zod partial update; RLS (steward / admin). Returns `null` if row absent after update. |
| `getCompanyPortfolio(companyId, roleFilter?)` | `CompanyPortfolioPayload`: `byTier` (`CompanyPortfolioByTier`) plus `orderedFlat` — same credits with `building` + `person` joins; optional `.eq('role', roleFilter)`; `orderedFlat` sorts by `company_portfolio_rank` (non-null first, ascending), then `credit_tier`, `display_order`, `is_lead`. |
| `getCompanyStewards(companyId)` | `CompanySteward[]`; RLS yields empty for users who are not admin, a steward of that company, or the row’s `user_id`. |
| `getCompanyStewardsWithProfiles(companyId)` | `CompanyStewardWithProfile[]` — same as above plus `profiles.username` / `avatar_url` for display. |
| `removeCompanySteward(stewardRowId)` | `DELETE` on `company_stewards`; RLS per owner/self rules above. |
| `inviteCompanySteward(companyId, email)` | `supabase.functions.invoke('invite-company-steward')`; owner-only server-side check. |
| `redeemCompanyStewardInvite(tokenHex)` | Calls RPC `redeem_company_steward_invite`; browser must have a logged-in session whose email matches the invite. |
| `requestCompanyClaimVerification(companyId, email)` | Roadmap Task 7.2. `verify-company-claim` Edge Function; Zod email. Returns `{ ok: true }` or `{ action: 'dispute', companySlug }` when verified domain does not match (client navigates to `/company/:slug/dispute`). |
| `redeemCompanyClaimTokenWithClient(client, tokenHex)` | SSR / loader: calls RPC `redeem_company_claim_token`; requires authenticated server client session. |
| `parseRedeemCompanyClaimRpcPayload(data)` | Maps RPC `jsonb` to `{ ok, companySlug }` or `{ ok: false, error }`. |
| `getMyPendingCompanyStewardRequestId(companyId)` | Task 7.3. Returns pending request `id` for the current user or `null`. |
| `submitCompanyStewardRequest(companyId, message)` | Zod-trimmed message (max 2000); `insert` + `notify-steward-request`. |
| `approveCompanyStewardRequestWithClient(client, token)` | SSR: RPC `approve_company_steward_request`. |
| `approveCompanyStewardRequestById(requestId)` | Browser: RPC `approve_company_steward_request_by_id`; then call `notifyStewardRequestApprovedWithClient` when `alreadyProcessed` is false (Roadmap Task 9.2 dashboard). |
| `rejectCompanyStewardRequestById(requestId)` | Browser: RPC `reject_company_steward_request_by_id` (owner dashboard). |
| `getMyStewardCompaniesForNav()` | Current user’s `company_stewards` rows joined to `companies` (`id`, `name`, `slug`, steward `role`); sorted by name. |
| `listPendingStewardRequestsForCompany(companyId)` | `company_steward_requests` with `status = pending`, requester `profiles` username/avatar; stewards may SELECT. |
| `notifyStewardRequestApprovedWithClient(client, requestId)` | SSR: `notify-steward-request-approved` (best-effort). |
| `parseApproveCompanyStewardRequestRpcPayload(data)` | Maps approval RPC `jsonb` to typed result (includes `not_found` for the by-id RPC). |
| `parseRejectCompanyStewardRequestRpcPayload(data)` | Maps reject-by-id RPC `jsonb` to typed result. |
| `getMyOpenCompanyClaimDisputeId(companyId)` | Task 7.4. Returns `open` dispute `id` for the current user or `null`. |
| `submitCompanyClaimDispute(companyId, { reason, evidenceUrl? })` | Zod-validated; `insert` on `company_claim_disputes` + `notify-admin-dispute`. |
| `SubmitCompanyClaimDisputeSchema` | Exported Zod object for reason (required) and optional evidence URL. |

DTOs: `CompanyCreditWithBuilding`, `CompanyWithCredits`, `CompanyPortfolioItem`, `CompanyPortfolioByTier`, `CompanyPortfolioPayload`, `CompanyStewardWithProfile`. `slugifyCompanyName` mirrors SQL `public.slugify_person_name` (used for company slugs in migrations).

---

## 9c. Person–company affiliations (Building Credits v2)

Introduced in Roadmap Phase 1 Task 1.3. Links **`person_id`** → **`people`** and **`company_id`** → **`companies`**. Pre-v2 affiliation rows were copied here where both endpoints resolved; the source table was removed in migration **`20270837000000_drop_legacy_architect_tables.sql`**.

### Component 1: Database schema

```sql
CREATE TABLE public.person_company_affiliations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  year_from integer,
  year_to integer,
  role_note text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT person_company_affiliations_pkey PRIMARY KEY (id),
  CONSTRAINT person_company_affiliations_person_id_company_id_key UNIQUE (person_id, company_id)
);
```

**Migration notes:** `year_from`, `year_to`, and `role_note` may be null for rows imported from the pre-v2 affiliation data. `created_at` preserves the source row’s timestamp. Check constraints enforce sensible years and `year_to >= year_from` when both are set.

### Component 2: RLS (`person_company_affiliations`)

**SELECT** — public read

```sql
CREATE POLICY "person_company_affiliations_select" ON public.person_company_affiliations
  FOR SELECT USING (true);
```

**INSERT** — authenticated

```sql
CREATE POLICY "person_company_affiliations_insert" ON public.person_company_affiliations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
```

**UPDATE** / **DELETE** — admin, the person’s `claimed_by_user_id` (= auth user), or any steward of the affiliated company

Same predicate for `USING` and `WITH CHECK` on `UPDATE`; `DELETE` uses the same `USING` predicate.

---

## 9d. Building credits (Building Credits v2)

Introduced in Roadmap Phase 1 Task 1.4. **`building_credits`** is the **sole** junction between **`buildings`** and credited **`people`** / **`companies`**. It drives building headers, search, map credit filters, moderation, and **`is_verified_architect_for_building`**. Phase 1 backfill mapped each legacy building–entity link to `role = design_architect`, `credit_tier = primary`, `is_lead = true`, `status = active`, with `display_order` as `ROW_NUMBER()` per `building_id` ordered by creation time.

### Component 1: Database schema

```sql
CREATE TYPE public.credit_status_enum AS ENUM (
  'active',
  'verified',
  'flagged',
  'hidden'
);

CREATE TYPE public.credit_flag_reason_enum AS ENUM (
  'wrong_person',
  'never_involved',
  'wrong_role',
  'other'
);

CREATE TABLE public.building_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings (id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.people (id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE,
  role public.credit_role_enum NOT NULL,
  role_custom text,
  credit_tier public.credit_tier_enum NOT NULL DEFAULT 'contributor',
  is_lead boolean NOT NULL DEFAULT false,
  contribution_notes text,
  year_from integer,
  year_to integer,
  project_url text,
  status public.credit_status_enum NOT NULL DEFAULT 'active',
  flag_reason public.credit_flag_reason_enum,
  flag_notes text,
  flagged_at timestamptz,
  flagged_from_status public.credit_status_enum,
  flagged_by_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  added_by_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  display_order integer NOT NULL,
  company_portfolio_rank integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT building_credits_pkey PRIMARY KEY (id),
  CONSTRAINT building_credits_person_or_company_required
    CHECK (person_id IS NOT NULL OR company_id IS NOT NULL)
);
```

**Indexes:** `building_id`, `person_id`, `company_id`, `status`. Partial index **`building_credits_company_portfolio_rank_idx`** on `(company_id, company_portfolio_rank)` where both are non-null (migration **`20270864000000_building_credits_company_portfolio_rank.sql`**). Year check constraints mirror `person_company_affiliations` (reasonable range, `year_to >= year_from` when both set).

**`company_portfolio_rank`:** Optional ordering for the signed-in company steward portfolio (`/company-portfolio`). `NULL` means “use legacy sort” within the tier (`display_order`, `is_lead`). Stewards may `UPDATE` this column under existing `building_credits_update` RLS. Application DTO: `companyPortfolioRank` on `BuildingCredit` / `BuildingCreditWithEntities`.

**Migration notes (Phase 1 backfill):** Inserts skipped source rows that did not resolve to a **`people`** (individual) or **`companies`** (studio) row after Tasks 1.1–1.2. Counts were reconciled at cutover; the pre-v2 junction table was removed in migration **`20270837000000_drop_legacy_architect_tables.sql`**.

### Component 2: RLS (`building_credits`)

**SELECT** — rows with `status <> 'hidden'`, or any row for `public.is_admin()`

```sql
CREATE POLICY "building_credits_select" ON public.building_credits
  FOR SELECT
  USING (
    public.is_admin()
    OR status <> 'hidden'::public.credit_status_enum
  );
```

**INSERT** — authenticated; at least one of `person_id`, `company_id` must be non-null (`WITH CHECK`)

```sql
CREATE POLICY "building_credits_insert" ON public.building_credits
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (person_id IS NOT NULL OR company_id IS NOT NULL)
  );
```

**UPDATE** — admin; or the person row’s `claimed_by_user_id` (= auth user) when `person_id` is set; or any steward of `company_id` when `company_id` is set. Same `USING` and `WITH CHECK`.

**DELETE** — admin or `buildings.created_by` = auth user for the credit’s `building_id`.

### Component 3: Application API — `building_credits` (Phase 2 Task 2.4)

Browser Supabase client wrappers live in `src/features/credits/api/credits.ts`. Types from `src/features/credits/types.ts` (`BuildingCreditWithEntities`, etc.):

| Function | Behaviour |
|----------|-----------|
| `getBuildingCredits(buildingId)` | All credits for the building joined with `people` / `companies` summaries; RLS omits `hidden` for non-admins. Sorted by `credit_tier`, `display_order`, `is_lead` descending. |
| `addBuildingCredit(input)` | Zod-validated insert; requires at least one of `personId`, `companyId`; `added_by_user_id` from `auth.getUser()` (not client-supplied). `contribution_notes` max **500** characters; `role = other` requires non-empty `role_custom`. When `companyId` is set, sets `company_portfolio_rank` to the next integer after the current max for that company (or `0`). |
| `updateBuildingCredit(creditId, input)` | Zod partial update of `role`, `roleCustom`, `creditTier`, `isLead`, `contributionNotes`, `yearFrom`, `yearTo`, `projectUrl`, `companyPortfolioRank` (maps to `company_portfolio_rank`). Does not change `building_id`, `person_id`, or `company_id`. RLS as for other credit updates. |
| `flagCredit(creditId, reason, notes)` | Calls RPC `flag_building_credit` (SECURITY DEFINER). Sets `status = flagged`, `flagged_from_status` to the prior `active` / `verified` value, `flag_reason`, `flag_notes`, `flagged_at`; `flagged_by_user_id` is `auth.uid()` when signed in, else `NULL`. Only transitions `active` / `verified` → `flagged`. Refetches the row after RPC success. |
| `updateCreditStatus(creditId, { status })` | Status-only patch; RLS applies (admin / claim owner / steward per policies). |
| `getFlaggedCreditsForAdmin()` | Admin queue: `status = flagged`, ordered by `flagged_at` descending. Select joins `people` / `companies` (incl. `claim_status`), `buildings` (`id`, `name`, `slug`, `short_id`), `profiles` for `added_by_user_id` → `username`. Returns `FlaggedCreditModerationItem[]`. |
| `notifyCreditOutcome({ creditId, outcome })` | `outcome` ∈ `verified` \| `hidden`. Invokes Edge Function `notify-credit-outcome` after the credit row already matches that status; emails `added_by_user_id` (skips when null). Zod-validated. |
| `removeCreditByToken(token)` | Calls RPC `redeem_credit_removal_token(p_token_hex)`; returns `{ ok: true, creditId, buildingId?, buildingName?, buildingSlug? }` (building fields after migration `20270827000000`) or `{ ok: false, error }` (`invalid_token`, `unknown_token`, `expired`, `already_used`, `rpc_error`). **`removeCreditByTokenWithClient(client, token)`** is the same for SSR (server Supabase client). |
| `notifyCreditedEntities({ creditIds, emails })` | `supabase.functions.invoke('notify-credited-entities')`. **Zod:** unique `creditIds` (1–50 UUIDs), `emails` (1–15). Caller must be authenticated; the Edge Function checks each credit’s `added_by_user_id` matches the JWT user. |

### Component 4: RPC `flag_building_credit`

Migration `20270826000000_flag_building_credit_rpc.sql` (Roadmap Phase 5 Task 5.3), extended by **`20270832000000_building_credits_flagged_from_status.sql`** (Phase 8 Task 8.1) adding column **`flagged_from_status`** and setting it on flag to the row’s prior **`active` \| `verified`** status. **`SECURITY DEFINER`**. **`GRANT EXECUTE`** to **`anon`** and **`authenticated`**. Arguments: `p_credit_id`, `p_reason` (`credit_flag_reason_enum`), `p_notes` (nullable text, max 10 000 characters). Updates one row from `active` / `verified` to `flagged` with `flagged_from_status`, `flag_reason`, `flag_notes`, `flagged_at`, `flagged_by_user_id = auth.uid()` (null when anonymous), `updated_at`. Returns JSON `{ "ok": true, "credit_id": "<uuid>" }` or `{ "ok": false, "error": "not_found_or_not_flaggable" | "notes_too_long" }`.

**Edge Function:** `notify-credit-outcome` — `verify_jwt = false`; manual `getUser` + `is_admin()` RPC on user JWT; body `{ creditId, outcome }` with `outcome` ∈ `verified` \| `hidden`. Service role loads the credit (building + entity names); requires `building_credits.status` to already equal `outcome`; resolves contributor email via `added_by_user_id` + `auth.admin.getUserById`; sends React email `CreditOutcomeEmail` via Resend when `RESEND_API_KEY` is set (otherwise returns `{ ok: true, emailed: false }`). Uses `SITE_URL` for absolute links.

---

## 9e. Credit notification log & removal tokens (Building Credits v2)

Introduced in Roadmap Phase 1 Task 1.5. Supports post-notification one-click credit removal (Task 6.4): **no plaintext email** in the database; **hashes only** (`bytea`, 32-octet SHA-256 digests). Edge Functions use the **service role** for reads/writes; **RLS is enabled with no policies** so `anon` / `authenticated` have no access. `public.generate_credit_removal_token(credit_id uuid)` is **`SECURITY DEFINER`**, **`REVOKE ALL … FROM PUBLIC`**, **`GRANT EXECUTE` to `service_role` only** — clients must not call it with the user JWT.

### Component 1: `credit_removal_tokens`

```sql
CREATE TABLE public.credit_removal_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  credit_id uuid NOT NULL REFERENCES public.building_credits (id) ON DELETE CASCADE,
  token_hash bytea NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,

  CONSTRAINT credit_removal_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT credit_removal_tokens_token_hash_len CHECK (octet_length(token_hash) = 32)
);

CREATE UNIQUE INDEX credit_removal_tokens_token_hash_uidx ON public.credit_removal_tokens (token_hash);
CREATE INDEX credit_removal_tokens_credit_id_idx ON public.credit_removal_tokens (credit_id);
```

### Component 2: `credit_notification_log`

```sql
CREATE TABLE public.credit_notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  credit_id uuid NOT NULL REFERENCES public.building_credits (id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipient_hash bytea NOT NULL,
  token_hash bytea NOT NULL,

  CONSTRAINT credit_notification_log_pkey PRIMARY KEY (id),
  CONSTRAINT credit_notification_log_recipient_hash_len CHECK (octet_length(recipient_hash) = 32),
  CONSTRAINT credit_notification_log_token_hash_len CHECK (octet_length(token_hash) = 32)
);

CREATE INDEX credit_notification_log_credit_id_idx ON public.credit_notification_log (credit_id);
CREATE INDEX credit_notification_log_sent_at_idx ON public.credit_notification_log (sent_at DESC);
```

### Component 3: RPC `generate_credit_removal_token`

- Generates `32` random bytes, returns `encode(bytes, 'hex')` (64-character hex string — URL-safe).
- Inserts one row into `credit_removal_tokens` with `token_hash = digest(secret_bytes, 'sha256')`, `expires_at = now() + 30 days`, `used_at` null.
- Raises if `credit_id` is not found in `building_credits`.

### Component 4: RPC `redeem_credit_removal_token`

Introduced in Roadmap Phase 2 Task 2.4 (migration `20270824000000_redeem_credit_removal_token.sql`). **`SECURITY DEFINER`**. Callable by **`anon` and `authenticated`** so email removal links work without sign-in.

- Argument: `p_token_hex` — trimmed, lowercased; must match `^[0-9a-f]{64}$`.
- Computes `token_hash = digest(decode(hex, 'hex'), 'sha256')` and locks the matching `credit_removal_tokens` row (`FOR UPDATE`).
- Returns JSON on success after setting `building_credits.status = 'hidden'` and `credit_removal_tokens.used_at = now()`:
  - Baseline (migration `20270824`): `{ "ok": true, "credit_id": "<uuid>" }`.
  - Roadmap Task 6.4 (migration `20270827000000_redeem_credit_removal_token_building_payload.sql`): adds **`building_id`**, **`building_name`**, **`building_slug`** (from `buildings` joined via the credit) so the `/remove-credit/:token` page can link back without reading hidden `building_credits` under RLS.
- Returns `{ "ok": false, "error": "<code>" }` for `invalid_token`, `unknown_token`, `already_used`, `expired` (no row updates on failure paths).

`REVOKE ALL … FROM PUBLIC`; `GRANT EXECUTE` to `anon`, `authenticated`. Minting remains `generate_credit_removal_token` (**service_role** only).

### Component 5: RLS

`ALTER TABLE … ENABLE ROW LEVEL SECURITY` on both tables; **no policies** (default deny for JWT roles). Service role bypasses RLS for Edge Function access.

### Component 6: Edge Function `notify-credited-entities`

Roadmap Phase 6 Task 6.3. **`verify_jwt = false`**; manual `getUser` on `Authorization` (same pattern as `invite-company-steward`). **POST** JSON body: `creditIds: string[]`, `emails: string[]` (server enforces max 50 / 15, deduped normalized addresses).

- Loads credits by id with **service role**; rejects unless every row exists, shares one `building_id`, `added_by_user_id` equals the caller’s user id, and `status <> 'hidden'`.
- For each credit, calls **`generate_credit_removal_token(credit_id)`** (service role only), then sends **one Resend email per recipient** using the **`CreditNotificationEmail`** React template (`supabase/functions/_shared/emails/CreditNotificationEmail.tsx`): building name, optional hero image URL (`PUBLIC_STORAGE_URL` or Supabase public storage base + `main_image_url` / `community_preview_url`), per-credit role + entity line, **Remove this credit** link to `{SITE_URL}/remove-credit/{64-char hex}`, **Claim your profile** CTA to `SITE_URL`.
- After each successful send, inserts one **`credit_notification_log`** row per credit with **`recipient_hash`** = SHA-256(UTF-8 email) and **`token_hash`** = SHA-256(raw 32-byte secret) matching `credit_removal_tokens`. **No plaintext email** stored.
- Requires **`RESEND_API_KEY`** on the function; uses **`SITE_URL`** (default `https://plano.app`) for links. Optional **`PUBLIC_STORAGE_URL`** matches app `VITE_PUBLIC_STORAGE_URL` for image URLs in email.

---

## 9. Historical entity claims (admin) & legacy URL redirects

Migration **`20270837000000_drop_legacy_architect_tables.sql`** retires the pre-v2 catalog schema; **§9a–§9e** document the current model (**`people`**, **`companies`**, **`building_credits`**, tokens, stewards). **`profiles.verified_architect_id`** and **`notifications.architect_id`** may remain as nullable columns **without foreign keys** for historical data.

**App routes:** `/person/:slug`, `/company/:slug`, `/portfolio`, `/company-portfolio`. **`/architect/:uuid`** returns **301** to `/person/:slug` or `/company/:slug` when a row exists with that UUID (preserved from migration). **`/architect/dashboard`** redirects to **`/portfolio`**.

### Component 1: Database schema — `architect_claims` (admin queue)

```sql
-- architect_claims — admin review of historical claims; architect_id is an opaque UUID (no catalog FK).
CREATE TABLE public.architect_claims (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  architect_id uuid NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'verified', 'rejected')),
  proof_email  text NOT NULL,
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT architect_claims_pkey PRIMARY KEY (id),
  CONSTRAINT architect_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```

### Component 2: RLS — architect_claims

Unchanged intent: submitter and admins can read; submitter inserts; admins update.

### Component 3: Routes & RPCs (current product)

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /architect/:uuid | **301** to `/person/:slug` or `/company/:slug` when a row exists with that `id` | SSR loader |
| GET | /architect/:uuid/edit | **301** to person/company with `?edit=1` when allowed | SSR loader |
| GET | /portfolio | Person portfolio (claimed `people` row) | client |
| GET | /company-portfolio | Company steward portfolio | client |
| GET | /person/:slug | Public person + credits | client + SSR |
| GET | /company/:slug | Public company + credits | client + SSR |

**`get_architect_claim_status`** / **`handle_architect_claim_approval`** operate on **`architect_claims`**. **`is_verified_architect_for_building`** is defined in migration **`20270837000000_drop_legacy_architect_tables.sql`** to use **`building_credits`** plus claimed **`people`** / **`company_stewards`** (see RPC registry). **`sync_verified_architect_id`** may remain for legacy profile columns without a catalog FK. **Edge `og-tags`:** `?path=/architect/{uuid}` resolves OG metadata via **`people`** / **`companies`** and canonical **`/person/`** or **`/company/`** URLs. **Edge `sitemap`:** emits **`/person/{slug}`** and **`/company/{slug}`**.

### Component 4: Zod (historical claims UI only)

```typescript
import { z } from 'zod';

const SubmitArchitectClaimSchema = z.object({
  architectId: z.string().uuid(), // opaque UUID on architect_claims; no FK to people/companies
  proofEmail: z.string().email().max(320),
});
```

No additional environment variables required for this domain.

---

## 10. Map & Discovery Domain

This domain has no dedicated tables beyond `saved_views`. All map and search functionality is powered by PostgreSQL RPCs operating on the `buildings`, `user_buildings`, and taxonomy tables defined above.

### Component 1: Database Schema

```sql
CREATE TABLE public.saved_views (
  id         uuid    NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid    NOT NULL,
  name       text    NOT NULL,
  filters    jsonb   NOT NULL DEFAULT '{}',
  is_pinned  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT saved_views_pkey PRIMARY KEY (id),
  CONSTRAINT saved_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```

### Component 2: Security Policies

### RLS: saved_views

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "saved_views_select" ON saved_views
  FOR SELECT USING (user_id = (SELECT auth.uid()));
```

**INSERT**
```sql
CREATE POLICY "saved_views_insert" ON saved_views
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "saved_views_update" ON saved_views
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "saved_views_delete" ON saved_views
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | (RPC) get_map_clusters_v2 | Server-side clustered map data | supabase (RPC) |
| GET | (RPC) get_map_pins | Individual pin data | supabase (RPC) |
| GET | (RPC) get_buildings_list | Paginated sidebar building list | supabase (RPC) |
| GET | (RPC) find_nearby_buildings | Geographic proximity search | supabase (RPC) |
| GET | (RPC) search_buildings | Full-text + fuzzy building search | supabase (RPC) |
| GET | (RPC) get_discovery_filters | Available filter options | supabase (RPC) |
| GET | (RPC) get_building_leaderboards | Ranked building lists | supabase (RPC) |

**Map/list RPC filters (Phase 10 Task 10.2):** `get_map_clusters`, `get_map_clusters_v2`, and `get_buildings_list` accept optional JSON keys `credit_company_id` (UUID string) and `credit_roles` (text array of `credit_role_enum` values). A building matches if it has at least one non-`hidden` `building_credits` row satisfying each supplied constraint (company and role may be satisfied by different rows). Helper: `building_matches_credit_filters(building_id, company_id, roles)`.

```typescript
interface MapClusterDTO {
  clusterId: number;
  latitude: number;
  longitude: number;
  count: number;                        // Buildings in cluster
  expansionZoom: number;                // Zoom level to expand
  maxTier: string | null;               // Highest tier in cluster
}

interface MapPinDTO {
  id: string;
  name: string;
  slug: string | null;
  latitude: number;
  longitude: number;
  locationPrecision: 'exact' | 'approximate';
  tierRank: string | null;
  heroImageUrl: string | null;
  city: string | null;
  country: string | null;
  // Library mode additions:
  userRating: number | null;
  userStatus: string | null;
}

interface SavedViewDTO {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  isPinned: boolean;                    // Mapped: is_pinned
  createdAt: string;                    // ISO 8601
}

/*
Example payload (MapClusterDTO):
{
  "clusterId": 42,
  "latitude": 51.5074,
  "longitude": -0.1278,
  "count": 23,
  "expansionZoom": 14,
  "maxTier": "Top 1%"
}
*/

/*
Example payload (MapPinDTO):
{
  "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
  "name": "Barbican Centre",
  "slug": "barbican-centre",
  "latitude": 51.5200,
  "longitude": -0.0937,
  "locationPrecision": "exact",
  "tierRank": "Top 1%",
  "heroImageUrl": "review_images/b1c2d3e4/hero.jpg",
  "city": "London",
  "country": "United Kingdom",
  "userRating": 3,
  "userStatus": "visited"
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateSavedViewSchema = z.object({
  name: z.string().min(1).max(200),
  filters: z.record(z.string(), z.unknown()),
  isPinned: z.boolean().default(false),
});

const MapFilterSchema = z.object({
  bounds: z.object({
    north: z.number().min(-90).max(90),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    west: z.number().min(-180).max(180),
  }),
  zoom: z.number().min(0).max(22),
  mode: z.enum(['discover', 'library']).default('discover'),
  categoryIds: z.array(z.string().uuid()).optional(),
  typologyIds: z.array(z.string().uuid()).optional(),
  attributeIds: z.array(z.string().uuid()).optional(),
  styleIds: z.array(z.string().uuid()).optional(),
  people: z.array(z.string().uuid()).optional(), // URL `people=`; legacy bookmark key may still be read once client-side
  creditCompany: z.string().uuid().optional(),   // URL `creditCompany=` — filter map/list RPCs by `building_credits.company_id`
  creditRoles: z.array(z.string()).optional(),   // URL `creditRoles=` — subset of `credit_role_enum`
  statuses: z.array(z.enum(['Built', 'Under Construction', 'Unbuilt', 'Temporary', 'Lost'])).optional(),
  accessLevels: z.array(z.enum(['public', 'private', 'restricted', 'commercial'])).optional(),
  accessLogistics: z.array(z.enum(['walk-in', 'booking_required', 'tour_only', 'exterior_only'])).optional(),
  accessCosts: z.array(z.enum(['free', 'paid', 'customers_only'])).optional(),
  minRating: z.number().int().min(0).max(3).optional(),
  minPersonalRating: z.number().int().min(1).max(3).optional(),
  hideVisited: z.boolean().optional(),
  hideSaved: z.boolean().optional(),
  hideHidden: z.boolean().optional(),
  hideWithoutImages: z.boolean().optional(),
  collectionIds: z.array(z.string().uuid()).optional(),
  folderIds: z.array(z.string().uuid()).optional(),
  contactIds: z.array(z.string().uuid()).optional(),
});
```

No additional environment variables required for this domain.

---

## 11. Admin Domain

### Component 1: Database Schema

```sql
CREATE TABLE public.admin_audit_logs (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL,              -- acting user (submitter); for admin-only tools this is the admin user
  action_type text NOT NULL,              -- existing: merge, delete, edit, DIAGNOSTIC_ERROR, …
                                          -- entity/credit (Task 8.3): credit_added, credit_status_changed,
                                          -- person_claimed, company_claimed, steward_added, steward_removed
  target_type text NOT NULL,              -- 'building' | 'user' | 'credit' | 'person' | 'company' | …
  target_id   text NOT NULL,
  details     jsonb,                      -- for status-style events include old_value / new_value; credit_* include building_id (uuid string)
  created_at  timestamptz DEFAULT now(),

  CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id)
);

CREATE TABLE public.deletion_jobs (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  bucket_name text NOT NULL DEFAULT 'review_images',
  logs        jsonb DEFAULT '[]',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),

  CONSTRAINT deletion_jobs_pkey PRIMARY KEY (id)
);

-- Utility function used across all admin-gated policies:
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'app_admin')
  );
END;
$$;
```

### Component 2: Security Policies

### RLS: admin_audit_logs

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "admin_audit_logs_select" ON admin_audit_logs
  FOR SELECT USING (public.is_admin());
```

**INSERT**
```sql
CREATE POLICY "admin_audit_logs_insert" ON admin_audit_logs
  FOR INSERT
  WITH CHECK (public.is_admin());
```

**INSERT (authenticated actor — credit / steward removal)**  
Migration `20270834000000_entity_audit_logs.sql` adds `entity_audit_logs_actor_insert`: authenticated users may insert rows where `admin_id = auth.uid()` and `action_type` is one of `credit_added`, `credit_status_changed`, `steward_removed`. Claim and steward-add events are written from `SECURITY DEFINER` RPCs (`claim_person`, `redeem_company_claim_token`, `approve_company_steward_request`, `redeem_company_steward_invite`).

-- No UPDATE/DELETE policy: audit logs are append-only and immutable.

### RLS: deletion_jobs

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "deletion_jobs_select" ON deletion_jobs
  FOR SELECT USING (public.is_admin());
```

**INSERT**
```sql
CREATE POLICY "deletion_jobs_insert" ON deletion_jobs
  FOR INSERT
  WITH CHECK (public.is_admin());
```

**UPDATE**
```sql
CREATE POLICY "deletion_jobs_update" ON deletion_jobs
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

-- No DELETE policy: deletion jobs are not removed.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /admin | Admin dashboard | supabase (client-side, admin guard) |
| GET | (RPC) get_admin_pulse | Dashboard pulse metrics (JSON: `total_users`, `new_users_30d`, `new_users_24h`, `active_users_24h`, `active_users_30d`, `network_density`, `total_buildings` non-deleted, `total_reviews` = `user_buildings` with non-empty trimmed `content` excluding test/admin authors, `total_photos` = buildings with non-empty `hero_image_url`, `pending_reports`) — migration `20270869000000_admin_dashboard_metrics_overhaul.sql` | supabase (RPC, admin-only) |
| GET | (RPC) get_admin_trends | Activity trend data | supabase (RPC, admin-only) |
| GET | (RPC) get_admin_leaderboards | User leaderboard data | supabase (RPC, admin-only) |
| GET | (RPC) get_admin_content_stats | Content analytics | supabase (RPC, admin-only) |
| GET | (RPC) get_admin_retention | Retention analysis | supabase (RPC, admin-only) |
| GET | (RPC) get_admin_notifications | Notification analytics | supabase (RPC, admin-only) |
| GET | (RPC) get_photo_heatmap_data | Photo geographic density | supabase (RPC, admin-only) |
| POST | (RPC) merge_buildings | Merge duplicate buildings | supabase (RPC, admin-only) |
| POST | (RPC) admin_merge_people | Merge duplicate `people` rows (credits → target, delete source) | supabase (RPC, admin-only; migration `20270833000000_admin_merge_people_companies.sql`) |
| POST | (RPC) admin_merge_companies | Merge duplicate `companies` rows (credits, affiliations, stewards → target, delete source) | supabase (RPC, admin-only; same migration) |
| POST | (RPC) revert_building_change | Undo a building edit | supabase (RPC, admin-only) |
| POST | (RPC) fix_orphaned_user_buildings | Data integrity repair | supabase (RPC, admin-only) |

All admin routes MUST be protected by the `AdminGuard` component that checks `profiles.role = 'admin' OR 'app_admin'`.

```typescript
interface AdminPulseDTO {
  totalUsers: number;
  newUsers24h: number;
  newUsers30d: number;
  activeUsers24h: number;
  activeUsers30d: number;
  networkDensity: number;
  totalBuildings: number;
  /** User-building rows with non-empty text; all rows (any visibility); excludes test/admin profile authors. */
  totalReviews: number;
  /** Count of non-deleted buildings with a non-empty `hero_image_url` (not review image volume). */
  totalPhotos: number;
  pendingReports: number;
}

interface AdminAuditLogDTO {
  id: string;
  adminId: string;                 // Mapped: admin_id
  actionType: string;              // Mapped: action_type
  targetType: string;              // Mapped: target_type
  targetId: string;                // Mapped: target_id
  details: Record<string, unknown> | null;
  createdAt: string;               // ISO 8601
}

/*
Example payload (AdminPulseDTO):
{
  "totalUsers": 4823,
  "newUsers24h": 17,
  "newUsers30d": 342,
  "activeUsers24h": 891,
  "activeUsers30d": 2456,
  "networkDensity": 0.34,
  "totalBuildings": 18742,
  "totalReviews": 31204,
  "totalPhotos": 67891,
  "pendingReports": 3
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

Admin RPCs are SECURITY DEFINER functions that internally verify `is_admin()`. No additional Zod schemas are required for admin dashboard read operations.

### Component 5: Admin entity management UI (Roadmap Phase 8 Task 8.2)

Browser Supabase client helpers in `src/features/admin/api/entity-management.ts` (admin-guarded routes only):

| Function | Behaviour |
|----------|-----------|
| `searchAdminPeople(search)` | Requires `search.trim()` length ≥ 2 (commas stripped to avoid breaking `.or` filters). Up to 50 `people` rows matching name or slug (ilike); `creditCount` from `building_credits` aggregation. |
| `updateAdminPersonClaimStatus(personId, claimStatus)` | `claim_status` ∈ `unclaimed` \| `claimed` \| `verified`; RLS allows admin `people` UPDATE. |
| `adminMergePeople(sourcePersonId, targetPersonId)` | Calls RPC `admin_merge_people`; throws on `{ ok: false }` payload. |
| `searchAdminCompanies(search)` | Same search rules as people; adds `stewardCount` from `company_stewards`. |
| `updateAdminCompanyClaimStatus(companyId, claimStatus)` | Same enum; RLS allows admin `companies` UPDATE. |
| `adminMergeCompanies(sourceCompanyId, targetCompanyId)` | Calls RPC `admin_merge_companies`; throws on `{ ok: false }`. |
| `fetchOpenCompanyClaimDisputesForAdmin()` | `company_claim_disputes` where `status = open`, ordered by `created_at` desc; embeds `companies` (name, slug) and `profiles` (username). |
| `resolveCompanyClaimDispute(disputeId)` | Sets `status = resolved` where `id` matches and `status = open` (RLS: admin UPDATE). |

**RPC `admin_merge_people`:** arguments `p_source_person_id`, `p_target_person_id`. Returns JSON `{ "ok": true }` or `{ "ok": false, "error": "forbidden" \| "same_id" \| "source_not_found" \| "target_not_found" }`. Moves `building_credits.person_id`, deletes `person_company_affiliations` for the source person, deletes the source `people` row. **`GRANT EXECUTE` to `authenticated`** (authorization inside function).

**RPC `admin_merge_companies`:** arguments `p_source_company_id`, `p_target_company_id`; same error shape. Updates `building_credits.company_id`; dedupes `person_company_affiliations` then re-points remaining rows to the target; merges `company_stewards` with `ON CONFLICT (company_id, user_id) DO UPDATE` (owner role preferred); deletes the source `companies` row (CASCADE removes source-side invites, tokens, disputes, etc.).

**UI:** `EntityClaims.tsx` at `/admin/claims` — tabs for legacy `architect_claims` (pending) and open `company_claim_disputes` with **Resolved** action. `AdminPeople.tsx` at `/admin/credits/people`, `AdminCompanies.tsx` at `/admin/credits/companies` — directory search, inline claim status, side-by-side merge (patterned on `MergeBuildings.tsx`). Sidebar **Credits** group lists Flagged credits, Entity claims, People, Companies.

```
SUPABASE_SERVICE_ROLE_KEY
  Consumed by: Admin batch operations (merge, revert, deletion jobs)
  Vercel Dashboard: required
  Supabase Vault: required
  Notes: Restricted to admin-only operations. Must be registered in both Vercel Dashboard
         and Supabase Vault independently — they are separate secret stores and do not sync.
```

---

## 12. Infrastructure Domain

### Component 1: Database Schema

```sql
-- PostGIS spatial reference system (system table, not application-managed)
CREATE TABLE public.spatial_ref_sys (
  srid      integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext    character varying,
  proj4text character varying,

  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
-- This table is managed by PostGIS and MUST NOT be modified by application code.
```

### RPC Inventory (Cross-Domain Reference)

| Domain | Function | Auth | Description |
|--------|----------|------|-------------|
| Map | `get_map_clusters_v2` | anon | Server-side clustering with full filter support |
| Map | `get_map_pins` | anon | Individual map pin data |
| Map | `get_buildings_list` | anon | Paginated building list for sidebar |
| Map | `find_nearby_buildings` | anon | Geographic proximity search |
| Search | `search_buildings` | anon | Full-text + fuzzy building search |
| Search | `get_discovery_filters` | anon | Available filter options |
| Feed | `get_feed` | authenticated | Home feed (contacts + self) |
| Feed | `get_discovery_feed` | anon | Explore page feed |
| Feed | `get_suggested_posts` | authenticated | Algorithmically suggested content |
| Buildings | `calculate_building_score` | admin | Compute popularity score |
| Buildings | `update_building_tiers` | admin | Assign tier ranks |
| Buildings | `check_slug_availability` | authenticated | Verify slug uniqueness |
| Buildings | `merge_buildings` | admin | Merge duplicate records |
| Buildings | `get_potential_duplicate_buildings` | ambassador | Chapter-scoped name-similarity pairs (threshold 0.75), excluding the caller's dismissed pairs — see `building_duplicate_dismissals` |
| Buildings | `dismiss_building_duplicate_pair` | ambassador | Records a per-user "not a duplicate" dismissal for a pair into `building_duplicate_dismissals` |
| Collections | `get_collection_stats` | authenticated | Collection analytics |
| Collections | `get_collection_buildings` | authenticated | Buildings with coordinates |
| Collections | `get_collections_feed` | authenticated | Home feed: public collections owned by followed users |
| Social | `get_people_you_may_know` | authenticated | User suggestions |
| Social | `get_inviter_facepile` | anon | Referral attribution |
| Admin | `get_admin_pulse` | admin | Dashboard metrics |
| Admin | `get_admin_trends` | admin | Activity trends |
| Admin | `get_admin_leaderboards` | admin | User leaderboards |
| Admin | `get_admin_content_stats` | admin | Content analytics |
| Admin | `get_admin_retention` | admin | Retention analysis |
| Admin | `get_admin_notifications` | admin | Notification analytics |
| Admin | `get_photo_heatmap_data` | admin | Photo density heatmap |
| Legacy claims | `get_architect_claim_status` | authenticated | Status of rows in **`architect_claims`** (`architect_id` is not a foreign key) |
| Building updates | `is_verified_architect_for_building` | authenticated | True when **`building_credits`** links the building to the user’s claimed **`people`** row or **`company_stewards`** membership (non-hidden credits only); see **`20270837000000_drop_legacy_architect_tables.sql`** |
| Legacy claims | `handle_architect_claim_approval` | admin | Approve/reject **`architect_claims`** |
| Profiles (legacy) | `sync_verified_architect_id` | trigger | Historical sync with **`profiles.verified_architect_id`** (column may exist without FK) |
| Leaderboards | `get_building_leaderboards` | anon | Ranked building lists |
| Maintenance | `fix_orphaned_user_buildings` | admin | Data integrity repair |
| Maintenance | `handle_new_user` | trigger | Auto-create profile on signup |
| Audit | `log_building_changes` | trigger | Record building edit history |
| Audit | `revert_building_change` | admin | Undo a building edit |
| Storage | `trigger_delete_storage_recursive` | admin | Trigger recursive cleanup |
| Storage | `invoke_delete_storage_recursive` | admin | Execute recursive cleanup |

### Edge Function Registry

| Function | Purpose | Auth | Environment Variables |
|----------|---------|------|---------------------|
| `calculate-route` | Mapbox Directions API route calculation | manual JWT (`verify_jwt = false`) | `MAPBOX_ACCESS_TOKEN` |
| `generate-itinerary` | AI itinerary generation (k-means + routing) | manual JWT (`verify_jwt = false`) | `MAPBOX_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` |
| `generate-upload-url` | Presigned upload URL generation | manual JWT (`verify_jwt = false`) | `SUPABASE_SERVICE_ROLE_KEY` |
| `delete-file` | Single file deletion from storage | manual JWT (`verify_jwt = false`) | `SUPABASE_SERVICE_ROLE_KEY` |
| `delete-storage-recursive` | Recursive directory deletion | manual JWT (`verify_jwt = false`) | `SUPABASE_SERVICE_ROLE_KEY` |
| `fetch-url-metadata` | OpenGraph metadata scraping | manual JWT (`verify_jwt = false`) | — |
| `send-welcome-email` | Branded welcome email via React Email | webhook trigger | `SUPABASE_SERVICE_ROLE_KEY` |
| `og-tags` | Crawler-facing HTML with OG/Twitter meta for shared links (`?path=…`) | none (`verify_jwt = false`); anon reads only | Optional `STORAGE_PUBLIC_URL` to absolutize relative image paths (default S3 public base) |
| `sitemap` | Dynamic `sitemap.xml` for public buildings, **`/person/{slug}`**, **`/company/{slug}`**, profiles | none (`verify_jwt = false`); anon reads only | — |

### Global Environment Variable Registry

```
SUPABASE_URL
  Consumed by: all client-side queries, edge functions
  Vercel Dashboard: required
  Supabase Vault: not required (auto-available in edge functions)

SUPABASE_ANON_KEY
  Consumed by: all client-side queries
  Vercel Dashboard: required
  Supabase Vault: not required

SUPABASE_SERVICE_ROLE_KEY
  Consumed by: generate-upload-url, delete-file, delete-storage-recursive,
               generate-itinerary, send-welcome-email edge functions;
               admin batch operations
  Vercel Dashboard: required
  Supabase Vault: required
  Notes: MUST only be used in edge functions with manual JWT verification
         and admin-only operations. Using it in any other context is a blocking error.

MAPBOX_ACCESS_TOKEN
  Consumed by: calculate-route, generate-itinerary edge functions
  Vercel Dashboard: not required
  Supabase Vault: required

VITE_GA_MEASUREMENT_ID
  Consumed by: Google Analytics (client-side)
  Vercel Dashboard: required
  Supabase Vault: not required
  Notes: Public, safe to expose in client bundle

VITE_SENTRY_DSN
  Consumed by: Sentry browser SDK (`@sentry/react`) in production builds
  Vercel Dashboard: optional (empty = Sentry disabled)
  Supabase Vault: not required
  Notes: Set in deployment only; never commit real DSNs

STORAGE_PUBLIC_URL
  Consumed by: `og-tags` edge function (optional override for relative image URLs)
  Supabase Vault: optional secret for edge functions if the default public asset base differs
```
