# AI Status

> This file is the cross-session status ledger (known issues, schema drift, completed work). Structural facts about the stack live in `AGENTS.md` — read that first.

## Current Phase
**UX Refinement Round** (installed 2026-08-05, [`docs/Roadmap.md`](Roadmap.md)) — 35 tasks across 8 phases generated from the owner's 34-prompt task list, plus a Final UAT. Phase 1 complete: Tasks 1.1 (My log block), 1.2 (Overview empty state), 1.3 ("Saved & visited" — savers/visitors on the Overview tab, [ADR 0029](decisions/0029-building-activity-is-visible-to-members.md)) and 1.4 (building-detail maps gated behind MapLibre `cooperativeGestures` so page scroll never zooms) done. Phase 2 started: Task 2.1 (the "broken" person search is an empty `people` table — [ADR 0030](decisions/0030-person-search-falls-back-to-companies.md)) and Task 2.2 (credits are editable from the Credits tab; saving closes with a toast — [ADR 0031](decisions/0031-credit-edits-open-to-members.md)) done.

Most recently closed: **Embassy ambassador experience** — archived as [`docs/roadmaps/0003-embassy-ambassador-experience.md`](roadmaps/0003-embassy-ambassador-experience.md) (installed 2026-07-23, closed 2026-07-30). Phases 0–3 complete; Phase 4 opened for **4.3 field mode only** — **4.1 pre-publish moderation and 4.2 missions were closed unstarted by owner decision, not dropped on merit**, and are the obvious candidates for a future roadmap. The Final UAT in that file records what was verified against prod and the one claim that is only partially verified (a real photo upload was never exercised end-to-end on production data).

Earlier programmes, still complete: **Remaining surfaces refinement** (2026-05-24, P0–P10 per [REMAINING_SURFACES_ROADMAP.md](REMAINING_SURFACES_ROADMAP.md)), **design refinement** (R0–R9), **Design Precision Programme** ([0001](roadmaps/0001-design-precision-programme.md)), **Principles alignment** ([0002](roadmaps/0002-principles-alignment.md)). Programme platform remains shipped.

**Rollout ≠ refinement:** The May 2026 rollout (Phases 0–7) wired semantic tokens, removed raw palette classes, and connected real data (e.g. `get_feed` on the home feed). That work is **complete**. The refinement programme ([ROADMAP.md](ROADMAP.md), Phases R0–R9) delivered editorial layout, typography rhythm, kit fidelity, and per-page audit evidence across shell, editorial spine, discovery, identity, events, auth/token flows, embassy, and admin. Tracking: all families `refined` or `complete` in [DESIGN_SYSTEM_SCREEN_INVENTORY.md](DESIGN_SYSTEM_SCREEN_INVENTORY.md).

## CURRENT_ARCHITECTURE_SNAPSHOT
- **Credit edits are now as open as building edits, and the guard trigger keys on
  `current_user` not `auth.uid()` (2026-08-05):** `building_credits_update` admitted only
  `is_admin()`, a claimed person's owner, and a company steward — so the member who mistyped a
  credit could not fix it, and the bulk-imported credits (all `added_by_user_id IS NULL`) were
  admin-only forever. Migration `20271202000000_building_credits_member_edits.sql` adds a fourth
  branch: any authenticated user on `status = 'active'` rows, with `WITH CHECK` pinning the new
  row to `'active'` (no self-verifying) and requiring an entity. Matches `canEditOfficialData`,
  which has always been `!!user`. [ADR 0031](decisions/0031-credit-edits-open-to-members.md).
  **The trap to know:** the provenance trigger that pins `building_id`/`added_by_user_id` must
  discriminate on `current_user`, never `auth.uid()`. Inside a SECURITY DEFINER RPC —
  `flag_building_credit`, `redeem_credit_removal_token`, `merge_buildings`, the ambassador
  approval batches — `auth.uid()` is still the *member* who called it, so an `auth.uid()` guard
  fires on the app's own moderation flows; `current_user` is `authenticated` only for a direct
  PostgREST write and becomes `postgres` inside those functions. The trigger function is therefore
  SECURITY **INVOKER** on purpose. Second trap: the edit's audit row is `credit_edited`, which had
  to be added to the `entity_audit_logs_actor_insert` whitelist in the same migration — otherwise
  the credit saves and the audit insert then throws. `tests/unit/building-credits-member-edits-migration.test.ts`
  fails if any of that is loosened; `canEditCredit` in `BuildingCredits.tsx` is the client mirror
  and moves with it.
- **`public.people` is effectively empty — every architect was imported as a *company*
  (2026-08-05):** Roadmap Task 2.1 was filed as a broken person dropdown in the Add-credits drawer.
  It is not a query, RPC or filtering bug. On production, `foster`, `renzo`, `zaha`, `john` and
  `maria` each return **People (0)** with a full page of company hits, and Centre Pompidou's credited
  humans — Renzo Piano, Richard Rogers, Peter Rice, Su Rogers, Mike Davies, Gianfranco Franchini —
  every one links to `/company/…`. "Norman Foster" holds 28 credits as a company. `search_people_v2`
  and `CreditEntityPicker` both work; there is nobody to find. **Task 7.4 owns the cure** (reclassify
  companies → people) and inherits this evidence — do not re-investigate. Until then the Person box
  offers the matching company record under a `Listed as companies` heading so nobody creates a
  duplicate human ([ADR 0030](decisions/0030-person-search-falls-back-to-companies.md)); the group is
  conditional on zero person hits, so it disappears by itself the day 7.4 lands. The same dead end
  still exists in `CreditedEntitiesSelect` (Add/Edit building) — left for Task 2.5.
- **Explore's feed is a controlled pager, not a scroller, and must never be refetched
  mid-session (2026-08-05):** `/explore` used `snap-y snap-mandatory`. iOS momentum can't be
  cancelled once released, so one iPad flick crossed three or four snap children — and since a
  card leaving frame wrote `user_buildings.status = 'ignored'`, and `get_discovery_feed` excludes
  every building with such a row, each flick permanently destroyed buildings the user never saw.
  Three compounding faults sat on top: `invalidateQueries(["discovery_feed"])` after a save/hide
  re-ran every page and returned a completely different queue under the user's finger (the
  reported "flash then jump"); optimistically splicing the swiped card out shortened the list
  under the scroll offset; and `OFFSET = pages * LIMIT` paged over rows that had dropped out of a
  shrinking result set. Now: `useVerticalPager` owns an index and translates the track itself
  (`resolvePagerCommit` returns ±1, never ±2), swiped cards stay in the array wearing a badge,
  the feed query is never invalidated while browsing, and pagination is a
  `(save_count, id)` keyset cursor (`20271200000000_discovery_feed_keyset_pagination.sql`).
  **The traps to know:** any effect keyed on a pager callback must get a *stable* callback — the
  hook reads `count` through a ref precisely so a landing page can't re-fire the reset effect and
  throw the user back to building one; and DiscoveryCard is `touch-none` unconditionally, because
  leaving the browser `pan-y` is what let momentum run.
- **`review_images.review_id` points at `building_posts.id`, and the two id spaces overlap by
  accident (2026-07-30):** 18009 of 18021 `building_posts` rows carry the *same uuid* as their
  `user_buildings` row — a legacy 1:1 artefact — so a join written as
  `review_images ri ON ri.review_id = ub.id` (user_buildings) appears to work against historical
  data and silently misses **every** row written by current code, which allocates a fresh
  `building_posts.id`. That is what the ambassador photo-gap queue did: it never excluded a
  building photographed through 2.2's in-tool sheet. Fixed in
  `20271197000000_embassy_field_mode.sql` (**applied + verified**) for both
  `get_ambassador_buildings_without_photos` and the new `get_ambassador_nearby_photo_gaps`.
  **The trap to know:** anything counting or excluding photos must join
  `review_images → building_posts → buildings`; a `user_buildings` join will pass review, pass
  eyeballing against prod, and still be wrong for anything recent. `tests/unit/field-mode-migration.test.ts`
  fails if the old join shape returns.
- **Ambassador approvals live in `building_audit_logs.operation`, never `table_name` (2026-07-30):**
  every Embassy moderation metric was written as
  `table_name IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval')`,
  but `table_name` records the table the approval *touched* (`review_images`,
  `building_credits`, `building_posts`) and the marker goes in `operation`. On prod the old
  predicate matched **0** rows against **1508** carrying those values in `operation`, so
  "buildings moderated" read 0 for every ambassador since the metric existed and all 1508
  approvals were tallied as plain edits. Found while verifying roadmap 3.3, whose
  "50 moderations" badge could never have been earned. Migration
  `20271196000000_fix_moderation_metric_predicate.sql` (**applied + verified 2026-07-30**)
  moves the predicate to `operation` in all three functions that carry it —
  `get_my_ambassador_impact`, `get_my_ambassador_goals`, `compute_weekly_digest_payloads` —
  and adds `ambassador_video_approval`, closing the gap three earlier migration headers had
  each documented as known-and-unfixed. **The trap to know:** these three functions are the
  same metric shown to the same reader on three surfaces, so this predicate must never be
  fixed in one of them alone; and the digest's `NOT IN` legs need
  `COALESCE(al.operation, '')` because `NULL NOT IN (...)` is NULL, which would drop every
  audit row with no operation from the edits bucket.
- **`REVOKE ... FROM PUBLIC` never locked our RPCs down — 33 functions swept (2026-07-30):** Supabase
  configures this project with `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS
  TO anon, authenticated`, so every function created in `public` gets a **direct** grant to both roles
  at creation. The `revoke ... from public` line in this repo's template and ~all its migrations drops
  only the `PUBLIC` pseudo-role and leaves those direct grants intact. Found live while shipping the
  weekly digest: an anonymous `POST /rest/v1/rpc/run_weekly_digest` returned 200 and ran the function
  (fixed #1671). The audit found **227** project-owned functions anon-executable; migration
  `20271194000000_revoke_anon_execute_internal_rpcs.sql` (**applied + verified 2026-07-30**) revokes
  `anon`+`authenticated` from the **33** `SECURITY DEFINER` ones that are internal helpers
  (`_building_in_ambassador_chapter_scope`, `building_matches_*`), privileged mutators
  (`rls_auto_enable`, `refresh_locality_hero_images`, `send_session_reminders`,
  `migrate_tags_to_collections`), superseded cross-user readers (`get_main_feed`,
  `get_explorer_feed`, `get_admin_dashboard_stats`), or orphans from the forked film-club codebase
  (`is_group_member`, `update_group_stats`, `search_films_debug` — the `group*` tables do not exist).
  **The trap to know:** an RLS policy's `USING`/`WITH CHECK` expression is evaluated as the *querying*
  role and Postgres checks that role's `EXECUTE` privilege, so revoking a policy helper turns every
  read of the protected table into `permission denied for function` — verified empirically before
  writing the migration. Nine helpers are therefore deliberately left granted (`is_admin`,
  `_ambassador_can_access_chapter`, `is_collection_admin`, `plano_auth_is_company_steward`, …), several
  of whose policies are `TO PUBLIC` so `anon` must keep `EXECUTE` too. Also left alone: helpers reached
  from a `SECURITY INVOKER` caller anon can hit (`is_ambassador`, `get_locality_collections` via
  `get_country_guide`; `main_image_url`), all `SECURITY INVOKER` functions (they run with the caller's
  own rights, RLS applies, so no escalation is possible), and trigger functions (Postgres skips the
  `EXECUTE` check when firing a trigger and PostgREST cannot call them). `postgres`/`service_role` keep
  `EXECUTE` throughout and the four pg_cron jobs run as `postgres`. Guardrails: the template, `AGENTS.md`,
  `.cursor/rules/01-database.mdc` and `docs/migrations.md` now require naming the roles, and
  `scripts/check-migrations.mjs` warns when a migration re-asserts grants without naming
  `anon`/`authenticated`.
- **A building is now findable by its architect (2026-07-30):** `buildings.search_vector` is built by
  the `buildings_search_vector_update` trigger from six of the building's *own* columns and has never
  held credits, so `search_buildings_v2` — the authoritative text search behind `/search` Find mode
  and the collection "not in this collection" suggestions — could not find a building by its
  architect. Against prod, `zaha` returned *Hanaha* and *Zazzle*; `zaha hadid` returned *Hanaha*
  alone. Two other surfaces already matched credits (`get_buildings_list` ILIKEs credit names; the
  client-side `filterCollectionItems.ts` folds them into its haystack), so an item findable *inside* a
  collection by its architect was unfindable in the database. Migration
  `20271192000000_search_buildings_v2_credit_name_search.sql` (**applied + verified 2026-07-30**)
  adds a `credit_hits` CTE resolving `people`/`companies` names through `building_credits`, qualifying
  on `strict_word_similarity(query, name) >= 0.6` behind two index-driven predicates
  (`ILIKE` + `<<%`) over the existing `people_name_trgm_idx`/`companies_name_trgm_idx`, and adds
  `0.35 × sim` to `rank_score`. Folding credits *into* `search_vector` was rejected — it would
  write-amplify all 31,563 `building_credits` rows and fan a company rename across its whole
  portfolio; see [ADR 0023](decisions/0023-architect-name-search.md). Verified on prod: `zaha` → 20
  hits led by Zaha Hadid Architects buildings at ~0.42; `oma`, `renzo piano` put the literally-named
  building first; the typo `zha hadid` still finds her work. **No measurable cost** — warm timings are
  ~310–370ms with or without credit hits (the RPC's pre-existing per-row cost dominates). Gotchas
  worth keeping: plain `word_similarity` is far too loose (`ar` matched 4,938 of 16,447 companies) and
  whole-string `similarity` far too tight (`'Zaha Hadid Architects'` vs `zaha` = 0.227, under the
  RPC's own 0.2 floor); and a function-level `SET pg_trgm.strict_word_similarity_threshold` **cannot
  be used** — Supabase's `postgres` role may only put an extension GUC in a function's SET clause
  while that extension's library happens to be loaded in the backend, so `CREATE FUNCTION` fails with
  *"permission denied to set parameter"* on some pooled connections and succeeds on others.
- **Circular building merges fixed — "Farnsworth House" was unfindable (2026-07-30):** `/search`
  returned zero results for the first building ever added, because the catalogue held two Farnsworth
  rows and `admin_audit_logs` shows the same admin merging them **twice in opposite directions**
  (2026-02-03 short_id 3745 → 3342, 2026-02-19 short_id 3342 → 3745). The second merge absorbed a
  record into an already-deleted one, so both rows ended up `is_deleted = true` pointing at each
  other — and since every discovery RPC filters `is_deleted`, the building vanished everywhere at
  once while its content (2 notes, 1 credit, 1 style, 5 attributes) still hung off 3745. **The search
  stack was not at fault:** across all 18,129 live buildings there are zero rows with a null
  `location`, `search_vector`, or `name`. Three invariants now hold (I1 a live row never carries
  `merged_into_id`; I2 pointers resolve to a live row in one hop; I3 every component has exactly one
  live survivor) — see [ADR 0022](decisions/0022-building-merge-invariants.md) and
  `scripts/verify_merge_chains.sql`. Migration `20271190000000_repair_orphaned_merge_chains.sql`
  (cycle-safe recursive walk with a `path uuid[]` guard + 64-hop bound; **resurrected 1 row — 3745,
  chosen by dependent-row count — and flattened 3 chains**: 16067→17543, 17125→17670, 15714→17670)
  and `20271191000000_harden_merge_buildings.sql` (state + cycle guards under `FOR UPDATE` locks,
  inbound `merged_into_id` re-point, and re-pointing for the **ten tables the old body silently
  orphaned**: `building_attributes`, `building_styles`, `building_functional_typologies`,
  `event_buildings`, `collection_items` — which has *no* unique `(collection_id, building_id)` index,
  so at most one source row is promoted per collection — `ambassador_building_research_queue`,
  `award_recipients`, `award_recipient_suggestions`, `building_audit_logs`,
  `building_duplicate_dismissals`). Both **APPLIED to prod**. `BuildingDetails.loader.ts` now 301s a
  merged building to its survivor (reusing `getBuildingWithLocality` + `resolveBuildingUrl`), fixing
  112 dead URLs; the admin merge page gained `mergeState.ts` + `MergeStateWarning.tsx`, badges, a
  `handleSwap`/`handleMerge` guard and a disabled confirm button. Gotchas: **there is no `min(uuid)`**
  in Postgres (use `ORDER BY … LIMIT 1`); `admin_audit_logs.admin_id` is `NOT NULL`, so a migration
  must not write there and a psql-driven `merge_buildings` test needs
  `SET LOCAL request.jwt.claims` to give `auth.uid()` a value; `BuildingRedirect.tsx` is unrouted
  dead code. Merging deliberately **stays open to all authenticated users** (owner decision).
- **Stranded migration `20271175000000` applied (2026-07-30):** the "authoritative name search" fix
  (PR #1579), whose own header names the *"Farnsworth House is missing"* report, was merged to `main`
  in July but **never applied to the database**. Prod was still running the older bodies:
  `search_buildings_v2` kept its `location IS NOT NULL` gate, and `get_buildings_list` kept
  `similarity > 0.3` plus a server-side `Demolished/Lost/Under Construction/Unbuilt` default that the
  client was supposed to own. Now applied and verified. Every other recent migration
  (`20271183`, `20271186`–`20271189`) was already applied — a single contained gap, not general
  drift. Reminder that `supabase_migrations.schema_migrations` holds only 23 rows against 503
  migration files, so **it cannot be trusted to tell you what is applied — probe the DB objects.**
- **Embassy in-tool photo upload (roadmap 2.2, 2026-07-23):** The Photography tool no longer
  bounces to the building page to add a photo. New `PhotoUploadSheet` (opened from list rows
  and from map gap-pin popups) picks + compresses photos and uploads them via new
  `src/features/embassy/api/photoUpload.ts` (`uploadBuildingPhotos` mirrors the building-detail
  `handleSaveNote` image path: ensure `user_buildings` → `building_posts` → `review_images`,
  with the `.select().single()` silent-RLS guard; pure `buildReviewImageRow` + `nextBuildingAfter`
  are unit-tested). On success the gap queue (`get_ambassador_buildings_without_photos`) and
  `map-clusters-v3` are invalidated so the building drops out / the pin count updates, then the
  sheet advances to the next building. Extract-on-touch: `PhotographyTool` moved to its own file
  (`src/features/embassy/pages/PhotographyTool.tsx`), `Contribute.tsx` 3087 → 2694 lines,
  empty/error states now use the `embassy-ui` kit. The map path adds one optional `onAddPhoto`
  prop threaded `PlanoMap → MapMarkers → BuildingPopupContent`, rendered only when the
  photography-gaps filter is active (other map surfaces unaffected); the popup's rating strip was
  extracted to `PopupRatingBar.tsx` to keep the file under budget. `maps`/`buildings` barrels
  gained the public exports the new code imports. **No migration** — reuses existing tables/RPC.
- **Map pin/cluster visual code redesigned (2026-07-16):** pins now follow a monochrome **5-rank ladder** (30px black/white-ring → 26px white/black-ring → 22px white/strong-border → 18px muted → 14px muted-80), mode-scoped: discover mode = global percentile bands **Top 1%/5%/10%/20%/Rest** (+ centre "saved" dot for library buildings), library mode = personal points **3/2/1/saved-unrated/unsaved** with 1–3 Michelin dots inside rated pins. The rank-5 pulse animation was removed (`ping-large-slow` keyframes deleted from `index.css`). Clusters mirror the ladder via `max_tier` (now numeric **1–5**, strictly mode-separated — previously global mixed rating+tier via GREATEST up to 4 which the client rendered as the quietest face). Core files: `src/features/maps/utils/pinStyling.ts` (exports `getGlobalTierRank`/`getPersonalTierRank`, `PinRank`; `PinTier` S/A/B/C deleted), `MapPin.tsx`, `MapMarkers.tsx`. Migration `20271172000000_five_rank_map_tiers.sql`: re-tiers `update_building_tiers()` quotas to **1/5/10/20%** (retiring `Top 25%` — enum value remains but is no longer assigned; client tolerates the legacy label as the Top 20% band), recreates `get_map_clusters_v3` to also return per-point `rating` and the 1–5 `max_tier`, then re-runs the tiering once.
- **Remaining surfaces (P0–P10, complete 2026-05-24):** All 50 gap routes refined — building authoring, awards portal, ambassador marketing, embassy remainder, admin media/entity/credits/programme/awards CMS/content/system, utility pages (`NotFound`, `CardPlayground`). Shared kits: `building-form-ui`, `award-admin-ui`, `ambassador-marketing-ui`, `embassy-ui`, `admin-ui`. Audit evidence in `DESIGN_SYSTEM_PAGE_AUDITS.md`; inventory all `refined`. Summary in `REMAINING_SURFACES_ROADMAP.md`.
- **Design refinement (R0–R9, complete 2026-05-24):** Editorial spine (landing, feed, building detail); discovery/search/geography; profile/settings/connect; events/awards/collections; auth + token flows (`TokenFlowLayout`); embassy workspace (`embassy-ui`); admin console (`admin-ui`). Shared patterns: uppercase `tracking-[0.15em]` section labels, `text-3xl` page heads, hairline tabs, semantic feedback tokens (no raw amber/gray palette in features). Audit evidence in `DESIGN_SYSTEM_PAGE_AUDITS.md`. Automated verification in `ROADMAP.md` (typecheck/lint/build green; vitest 47 pre-existing failures documented below).
- **Global ambassador roles (2026-05-21)**: Two new `ambassador_memberships.role` values: `global_team` (≈ ExCo, manages project globally) and `global_leaders` (≈ President, manages global_team). Migration `20271142000000_add_global_ambassador_roles.sql` extends role CHECK constraint, recreates `is_chapter_leader()` and `is_chapter_president()` to include new roles, recreates `get_chapter_team()` with updated sort order. All `isLeader`/`isPresident` frontend predicates updated. Team page shows new role groups; admin chapter detail role selects include new options. **Applied** (verified against the live DB 2026-07-06).
- **Embassy Events review (Slices 0–3, complete)**: tables `embassy_event_discoveries` (review queue) and `embassy_event_search_runs` (audit log), plus column `ambassador_chapters.last_event_search_at`. Route `POST /api/embassy/event-search` runs serper.dev → Claude → dedup → bulk insert pipeline gated by a 4-day staleness check. `EmbassyLayout.tsx` fires a fire-and-forget trigger on every `/embassy/*` visit. RPCs `ambassador_publish_event_discovery` and `ambassador_discard_event_discovery` (SECURITY DEFINER) allow ambassadors to publish discoveries to `events` or discard them. Events tool card on `/embassy/contribute` with inline edit Sheet, Publish/Discard actions, duplicate-detection amber banner, and last-searched pill. Migrations `20271140000000`, `20271141000000`, and `20271148000000` all applied (verified 2026-07-06). Requires `SERPER_API_KEY` in env. Types regenerated 2026-07-06.
- Single-app repo: React Router v7 SSR (Vite 7) + React 19 + Supabase backend
- Routing: React Router v7 framework mode — manifest in `app/routes.ts`
- State: TanStack Query for server state
- Auth guard: AdminGuard checks `profile.role IN ('admin','app_admin')`
- **Programme platform** shipped (Phase 7):
  - Phase 7: President Onboarding Tracker. New RPC `get_president_onboarding_status(p_membership_id uuid)` returns a JSON checklist (5 steps: profile_complete, chapter_active, first_member_invited, first_application_reviewed, first_audit_entry) and `days_in_role`. New RPC `get_president_onboarding_list()` (admin-only via `is_admin()`) returns all presidents in their first 60 days with `steps_completed` count, sorted by `days_in_role DESC`. Embassy Leadership tab shows an `OnboardingCard` for presidents < 60 days in role with < 5 steps done — each step shows a check icon or an action link (settings, applications tab, contribute). Admin Presidents page gains an "Onboarding" tab alongside "All Presidents" showing the tracker table; clicking a row opens a slide-out panel that fetches and renders the full checklist. Migration `20271141000000_president_onboarding_rpc.sql`. **Applied** (verified against the live DB 2026-07-06).
- **Programme platform** shipped (Phase 6):
  - Phase 6: `/admin/programme/rankings` — Chapter Performance Ranking table. Period selector (7/30/90 days/All time). Sortable table: rank, chapter name, country, type, member count, edits, photos, new members, applications approved, last activity, score. Top 10% rows highlighted with brand-primary rank badge. Zero-activity rows muted. CSV export. RPC `get_chapter_performance_ranking(p_period_days int)` (migration `20271136000000_chapter_performance_ranking_rpc.sql`). "Rankings" sidebar entry added to Programme group.
- **Programme platform** shipped (Phases 1–4):
  - Phase 5: `/admin/ambassadors/coverage` — new "Coverage gaps" tab with filterable gap table (cities > 10 buildings, no chapter), country/min-building filters, gap score column, per-row "Create forming chapter" button opening a pre-filled dialog (name="Plano [City]", type=local, status=forming, locality pre-selected). No new migration needed; existing `get_admin_ambassador_locality_coverage` RPC reused. Old "Opportunities" tab removed.
  - Phase 4: `/admin/programme/broadcasts` — Broadcast composer and sent-message history with per-president read status. Tables `admin_broadcasts`, `admin_broadcast_reads`. Notifications type extended with `admin_broadcast`. RPCs: `send_admin_broadcast()` (rate-limited 3/day, resolves recipients by scope all/country/chapter), `toggle_broadcast_pin()`, `get_admin_broadcasts()`, `get_broadcast_read_status()`, `get_ambassador_broadcast_banners()`, `mark_broadcast_read()`. Embassy Leadership tab shows pinned + unread action_required banners. Presidents "Send message" button now links to broadcasts composer pre-addressed. Migration `20271125000000_admin_broadcasts.sql`.
- **Programme platform** shipped (Phases 1–3):
  - Phase 3: `/admin/programme/interventions` — Intervention Queue with 5 automated flag types (no_president, president_inactive, forming_stalled, at_capacity_open_apps, no_chapter_activity). Per-admin dismiss/snooze (7/14/30 days) via `admin_flag_dismissals` table. Sidebar badge shows active flag count. RPC `get_programme_intervention_flags()`, `dismiss_intervention_flag()` (migration `20271123000000_intervention_queue.sql`).
  - Phase 2: `/admin/programme/presidents` — president directory with slide-out panel. RPC `get_president_directory()` (migration `20271122000000_president_directory_rpc.sql`).
- **Programme platform** shipped (Phase 1):
  - Routes: `/admin/programme` (redirect) → `/admin/programme/health`
  - RPC `get_programme_health_summary` (migration `20271120000000_programme_health_rpc.sql`)
  - Sidebar: new "Programme" group with "Health Dashboard" entry
  - Pulse zone (4 stat cards), 30-day activity chart (edits + photos + 7-day rolling avg), flagged chapters list, top-5 chapters table
- **Plano Updates** feature shipped:
  - Table `plano_updates` (migration `20271026000000_plano_updates.sql`)
  - Storage bucket `plano-updates` (public read, admin write)
  - Public routes: `/updates` (listing), `/updates/:slug` (detail)
  - Admin routes: `/admin/updates`, `/admin/updates/new`, `/admin/updates/:updateId`
  - Footer link added to "Plano" section after "About"
  - Admin sidebar: "Updates" item added under Content group

## SCHEMA_DRIFT_LOG

- 2026-08-05 `20271200000000_discovery_feed_keyset_pagination.sql` — **applied + verified** on
  prod. Adds `p_after_save_count` / `p_after_id` to `get_discovery_feed`. Two things bit here and
  will bite again: (1) **adding parameters creates a new overload, it does not replace the old
  one** — the first apply left two live signatures, which makes the RPC ambiguous to PostgREST;
  the migration now drops the 19-arg signature explicitly (same cleanup 20270863000000 had to
  do). (2) **`npm run gen-types` served a stale schema for minutes after the DDL landed**, while
  the REST API already accepted the new args (verified with a direct `curl` → 200). Don't
  conclude a migration didn't apply because the generated types lack it — probe `pg_proc` or the
  REST endpoint. `gen-types` was still serving the pre-migration `Args` for this RPC an hour
  later, across ~10 runs and two `NOTIFY pgrst, 'reload schema'`; `--db-url` is not an escape
  hatch (it needs Docker). The two args were therefore written into
  `src/integrations/supabase/types.ts` by hand, matching the generator exactly — it sorts `Args`
  alphabetically and renders `bigint`→`number`, `uuid`→`string`, `DEFAULT NULL`→`?`. That is safe
  *only* because repeated `gen-types` runs reproduced the committed file byte-for-byte, so those
  two lines were provably the whole pending delta. If you hit this again, verify the same way
  before hand-editing. Verified against prod: keyset page 2 equals rows 11–20 of an unpaged read with
  zero overlap, and after simulating a session's worth of `ignored` writes, OFFSET paging skipped
  all 10 of page 2's buildings where the cursor skipped none.

<details>
<summary>Earlier entries (9) — moved to <a href="archive/AI_STATUS-ARCHIVE.md">the archive</a></summary>

- - 2026-07-30 20271175000000_search_buildings_v2_authoritative_name_search.sql was merged but never applied. Prod still h · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-07-30-20271175000000searchbuildingsv2authorit)
- - 2026-07-30 docs/DATA_CONTRACT.md omitted user_buildings' UNIQUE (user_id, building_id) constraint (live since 20260704 · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-07-30-docsdatacontractmd-omitted-userbuilding)
- - 2026-07-06 Full drift audit — every "needs apply" migration was already live. Probed the live DB for every object crea · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-07-06-full-drift-audit-every-needs-apply-migr)
- - 2026-07-01 Full npm run gen-types (run after the /search filter-parity migrations) surfaces pre-existing drift unrelat · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-07-01-full-npm-run-gen-types-run-after-the-se)
- - 2026-05-25 find_nearby_buildings did not return tier_rank_label or location_approximate, so nearby building markers on · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-25-findnearbybuildings-did-not-return-tier)
- - 2026-05-18 ambassador_goals.current_value defaults to 0 and has no writer (no trigger, no client update), so the count · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-18-ambassadorgoalscurrentvalue-defaults-to)
- - 2026-05-18 find_nearby_buildings had two overloads live in the DB: the original 3-arg (lat, long, radius_meters) from  · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-18-findnearbybuildings-had-two-overloads-l)
- - 2026-05-17 Generated types (src/integrations/supabase/types.ts) do not yet include plano_updates, programme_campaigns, · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-17-generated-types-srcintegrationssupabase)
- - 2026-05-17 credit_role_enum rename never reached the live DB: migration 20270896000000_rename_credit_roles_to_discipli · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-17-creditroleenum-rename-never-reached-the)

</details>

## SCHEMA_DRIFT_FIXED

<details>
<summary>Earlier entries (11) — moved to <a href="archive/AI_STATUS-ARCHIVE.md">the archive</a></summary>

- - 2026-05-20 /embassy/goals — 500 errors on get_ambassador_my_audit_timeline and get_chapter_ambassador_activity. Migrat · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-embassygoals-500-errors-on-getambassado)
- - 2026-05-20 Leaderboard on /embassy/goals only showed the top 10 chapter members. MyGoals.tsx applied a leaderboard.sli · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-leaderboard-on-embassygoals-only-showed)
- - 2026-05-20 /admin/ambassadors/campaigns "Ambassador ideas inbox" hid drafts from chapters where the admin was not an a · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-adminambassadorscampaigns-ambassador-id)
- - 2026-05-20 fetchModerationCredits() fetched ALL unmoderated credits globally without chapter scope. ambassador_approve · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-fetchmoderationcredits-fetched-all-unmo)
- - 2026-05-20 fetchModerationVideos in taskFeed.ts used profiles(username) without an FK hint when querying from building · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-fetchmoderationvideos-in-taskfeedts-use)
- - 2026-05-20 get_ambassador_recent_buildings function body referenced b.n but the actual column on buildings is b.commun · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-getambassadorrecentbuildings-function-b)
- - 2026-05-20 get_map_clusters_v3 was missing exclude_construction_statuses support — it was added in 20270906000000 but  · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-getmapclustersv3-was-missing-excludecon)
- - 2026-05-20 get_ambassador_buildings_missing_metadata (defined in 20270870200000_ambassador_task_feed_rpcs.sql) still c · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-getambassadorbuildingsmissingmetadata-d)
- - 2026-05-18 get_discovery_feed referenced ub.video_url (user_buildings) in its HAVING clause. Migration 20270872000000  · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-18-getdiscoveryfeed-referenced-ubvideourl-)
- - 2026-05-20 AI research ambassador_apply_building_research RPC field mismatch — live DB had the original 20271108000000 · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-ai-research-ambassadorapplybuildingrese)
- - 2026-05-20 AI research missing taxonomy fields (category, typologies, style, materiality, context) — the system prompt · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-ai-research-missing-taxonomy-fields-cat)

</details>

## SCHEMA_DRIFT_FIXED

<details>
<summary>Earlier entries (6) — moved to <a href="archive/AI_STATUS-ARCHIVE.md">the archive</a></summary>

- - 2026-05-22 Leaderboard "Could not load the leaderboard" on /embassy/goals — forensic rewrite (feedback 258d60ac, 552a5 · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-22-leaderboard-could-not-load-the-leaderbo)
- - 2026-05-21 complete_ambassador_onboarding RPC rejected 'moderation' tool key on /embassy/welcome with "Failed to save  · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-21-completeambassadoronboarding-rpc-reject)
- - 2026-05-21 get_chapter_metrics 500 error on /embassy/leadership (feedback 033ee938, ee2b3fd3-9b44-4f13-97b0-a0e81e698c · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-21-getchaptermetrics-500-error-on-embassyl)
- - 2026-05-20 Video approval in Embassy → Contribute → Moderation → Videos did not persist. VideosModerationTab only muta · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-video-approval-in-embassy-contribute-mo)
- - 2026-05-20 get_chapter_metrics.total_photos_added and get_chapter_ambassador_activity.photos_added counted only buildi · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-getchaptermetricstotalphotosadded-and-g)
- - 2026-05-20 protect_review_image_fields trigger (check_review_image_update) and protect_building_official_fields trigge · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-protectreviewimagefields-trigger-checkr)

</details>

## KNOWN_ISSUES

- [2026-08-01] — **Nightly red on `main` again since 2026-07-31 (issue #1610), `E2E` only.** Six of the eight nightly runs to 2026-08-01 failed on `E2E` while `guard`, `review` and `alert` all passed — the same class of QA-credential/flake failure documented under 2026-07-22, not a new code regression. **Not fixed here**, but its side effect was: because the nightly `guard` resolved its baseline from the last *successful run*, a red `E2E` pinned the AI review's baseline and the reviewer re-read the same growing diff at full Sonnet price every night. The review was extracted to its own workflow with its own baseline (ADR-0027), so the two now fail independently. #1610 still needs the E2E fix.

- [2026-07-30] — **Content gaps found while redesigning the country guides (`/architecture/:cc`).** All verified against live prod; each one is a *data* gap, not a code bug, so the guide simply omits the section rather than rendering an empty shell.
  - **`events.country_code` / `events.city_slug` are NULL on every row** (9 of 9, all London events). Nothing geo-scoped can surface them — no country guide, no city guide, no `/events/:cc/:city` listing. `ambassador_publish_event_discovery` does populate both columns, so this affects only the events that predate it. **Fix:** backfill from each event's `locality_id`/address, then an events section can be added to the country guide (it was designed and deliberately left out for this reason).
  - **127 orphan localities carry `buildings_count = 0`** (121 of them in Spain), verified to have zero live buildings — rows left behind when their buildings were renamed, moved or soft-deleted. `get_country_guide` filters them out, but they still inflate any raw `localities` count (Spain reads 807 vs 686 real cities) and each one is a linkable, empty `/architecture/:cc/:city` page. **Fix:** prune them, or have `sync_building_locality` clean up on the way out.
  - **`localities.hero_image_url` is set on 1 row of 6,420.** The old country page rendered one photo card per city, so for Spain that was 807 grey placeholders. The redesign takes a city's photo from its best-photographed building instead; the column is still worth curating for the city guides' own heroes.
  - **`buildings.access_*` is effectively empty** (`access_level` 53, `access` 43, `access_cost` 49, `access_logistics` 50, `access_notes` **2** — of 18,129 live buildings) and **`building_styles` has 6 rows total**. Both would be first-class visitor content ("can you get in?", "what style am I looking at?") and neither can carry a UI section yet. `/search` already exposes access filters that therefore match almost nothing.
  - **`building_credits.person_id` is never populated** — all 31,562 active credits are company-attributed (`role`: 16,942 `design_architecture`, 14,618 `other`). The guide's "Architects to know" list therefore reads from `companies`, which is correct today but means individual architects have no country-level presence.

- [2026-06-01] — **Stale-content / hard-refresh issue — THIRD root cause found (the one that mattered) + apex-domain blocker.** After the server-side fixes below shipped, forensic checks against live prod proved the server is now correct: `https://www.plano.app/` and `/architecture` both return `x-vercel-cache: MISS` + `cache-control: public, max-age=0, must-revalidate` (HTML no longer CDN-cached — the loader fix worked), `/api/version` returns the latest deploy's git SHA, `sw.js` is valid `application/javascript`, and the live service worker is clean (`skipWaiting`, `clientsClaim`, `cleanupOutdatedCaches`, **no** `NavigationRoute`). So the persistent staleness was **client-side**, and the reason every prior fix failed is now clear:
  - **Why all prior fixes failed:** every recovery path — `updatefound`, `controllerchange`, and the `/api/version` poll — ended in `window.location.reload()`. A plain reload re-enters the **controlling service worker**, so if a stale SW is serving a stale app shell (builds before `navigateFallback: null` landed on 2026-04-09 used Workbox's default navigation handling and could precache/serve an old shell), the reload returns the *same stale page*. Only a hard refresh — which bypasses the SW — escaped. None of the prior fixes ever unregistered the SW or cleared caches.
  - **Fix (2026-06-01):** added a real **escape hatch**. `usePwaInstall.tsx` `hardReloadEscape()` now deletes all Cache Storage entries and unregisters all service workers *before* reloading, guarded by a 60s `sessionStorage` one-shot to rule out loops; the version-mismatch path calls it instead of a bare reload. Plus a pre-hydration **kill switch** inlined into every SSR document head (`src/root.tsx` `STALE_BUNDLE_KILL_SWITCH`): on load it fetches `/api/version` and, if the served document's `__BUILD_ID__` no longer matches the server, purges caches + SWs and reloads once — recovering before the (possibly stale) React bundle even runs. Typecheck/lint/build green; inline JS syntax-verified.
  - **Remaining blocker (needs infra action — NOT fixable from the repo):** the apex domain `plano.app` 307-redirects **everything** to `www.plano.app`, **including `/sw.js`**. Per the service-worker spec, a redirected SW-script request is a hard update failure — so any service worker ever registered on the apex origin can **never update or self-heal**, and the code kill-switch cannot reach users whose stale apex SW keeps serving stale HTML. The app's own canonical is the apex (`SITE_URL = https://plano.app`, OG tags, sitemaps), so a large population likely registered SWs on the apex before the www redirect was added. **Action:** serve the app on `plano.app` directly (stop the apex→www redirect in Vercel Domains; serve both, or make apex primary and redirect www→apex). Once apex serves a real `sw.js`, the orphaned apex SWs finally update to the clean SW and self-heal. This is a Vercel dashboard change; verify auth/OAuth callback + Supabase redirect allow-lists cover the apex before flipping.

- [2026-05-24] [R9] — **Vitest suite: 47 failing / 698 passing** — Pre-existing mock gaps (e.g. `Profile.view-persistence.test.tsx` — `supabase.rpc is not a function`). Not introduced by design refinement R0–R8. `npm run typecheck`, `lint`, and `build` pass. Resolution: extend test mocks in a dedicated test-hygiene task.

- [2026-05-20] — PostGIS `public.spatial_ref_sys`: migrations must **not** use `ALTER TABLE … ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` on hosted Supabase (table owner `supabase_admin`; SQL Editor runs as `postgres` → **42501**). `REVOKE ALL` on `anon`/`authenticated`/`PUBLIC` (see `20260624202125`, `20270807000000`, `20270818000000` [superseded no-op], `20271101000000_enable_rls_on_public_tables.sql`) is a documented no-op when run as `postgres`, since the grants belong to `supabase_admin`. The mitigation that actually works is a **write-guard trigger** (`20260624202545_guard_spatial_ref_sys_writes_from_api_roles.sql`) — `postgres` holds `TRIGGER` privilege even without owning the table, so it blocks INSERT/UPDATE/DELETE/TRUNCATE from `anon`/`authenticated` at the trigger level. `scripts/check-rls-coverage.mjs` treats this table as a deliberate, documented exception from RLS-coverage CI. The security linter (`rls_disabled_in_public`) checks RLS state specifically, not triggers, so it will keep firing regardless of this mitigation until Supabase enables RLS or transfers ownership as `supabase_admin` — that requires a Supabase Support ticket (ref `supabase/supabase#29122`), not something fixable from this repo. [2026-07-28] — re-verified: still the only public table without RLS; no new alert.
- [2026-05-17] — `UpdateDetail.tsx` renders body as plain `whitespace-pre-wrap` text; if Markdown rendering is needed in future, add a library (e.g. `react-markdown`).
- [2026-05-20] — Pre-existing TypeScript errors in two files (not related to credits fix): (1) `src/features/guides/useGuides.ts` — `queryFn` receives TanStack Query context object but is typed to accept `number | undefined`; causes cascade errors in `GuidesPage.tsx`. (2) `src/features/localities/pages/LocalityPage.tsx` — two unused variable declarations (`VolunteerTeamMemberCard`, `LocalityBuildingsGrid`) flagged by `noUnusedLocals`. Note: `DiscoveryCard.tsx` temporal dead zone bug (block-scoped `y` used before declaration) was fixed on 2026-05-20 — it was causing the explore page to crash with an AppErrorBoundary render error.

<details>
<summary>Earlier entries (9) — moved to <a href="archive/AI_STATUS-ARCHIVE.md">the archive</a></summary>

- - 2026-07-22 — RESOLVED 2026-07-22: Nightly green on main (run 29956331929; issues 1572 + 1600 closed). Fixes: the QA ac · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-07-22-resolved-2026-07-22-nightly-green-on-ma)
- - 2026-06-22 — RESOLVED 2026-06-24: backend speed pass migrations applied via MCP (20271156–20271158 appear in the live  · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-06-22-resolved-2026-06-24-backend-speed-pass-)
- - 2026-05-27 — Stale-content / hard-refresh issue — FIXED, deploy required. Two independent root causes confirmed forens · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-27-stale-content-hard-refresh-issue-fixed-)
- - 2026-05-25 — RESOLVED 2026-07-06: 20271155000000 verified applied (building duplicate detection, feedback 570af7a4). O · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-25-resolved-2026-07-06-20271155000000-veri)
- - 2026-05-23 — RESOLVED 2026-07-06: 20271154000000 verified applied (global moderation batch, feedback 14c1a488). Origin · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-23-resolved-2026-07-06-20271154000000-veri)
- - 2026-05-23 — RESOLVED 2026-07-06: 20271153000000 verified applied (research queue, feedback 4b3489a0). Original entry: · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-23-resolved-2026-07-06-20271153000000-veri)
- - 2026-05-21 — RESOLVED 2026-07-06: 20271148000000 verified applied (events tool RLS fix, feedback ee4e5e00). Original e · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-21-resolved-2026-07-06-20271148000000-veri)
- - 2026-05-20 — RESOLVED 2026-07-06: 20271107000001 verified applied. "Failed to submit idea" on /embassy/projects (feedb · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-20-resolved-2026-07-06-20271107000001-veri)
- - 2026-05-17 — Pre-existing: generated types stale; multiple tables from recent migrations missing. Non-blocking (api fi · [full entry](archive/AI_STATUS-ARCHIVE.md#2026-05-17-pre-existing-generated-types-stale-mult)

</details>

## Completed Tasks

> **Note (2026-07-06):** entries below are historical logs. Any "needs apply" / "Apply `X` in the Supabase SQL Editor" instruction in them is obsolete — the 2026-07-06 drift audit verified every migration through `20271170000000` is live.

- [2026-07-15] **PR-sizing policy — one PR = one complete feature** (owner directive; docs-only): replaced the prior "small single-concern PRs, reviewable in ~15 min" standard with **one PR = one complete, independently shippable vertical slice** (schema/DB → backend/API → frontend/UI). Horizontal slicing (separate DB / API / UI PRs for one feature) is now forbidden; roadmaps target ~15–30 feature tasks; meta work (docs, rules, CI, refactors, design passes) is sized by the largest coherent reviewable chunk, not the feature band. Canonical rule now lives in a new **PR Sizing** section in `AGENTS.md`; derivative statements realigned in `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/05-vertical-slice.mdc` (thresholds relaxed to >4 tables / 2+ integrations; added the "Granularity Self-Check" section that `06-agent-behaviour.mdc` referenced but which didn't exist), `docs/FEED_REDESIGN_ROADMAP.md` (was "bias toward smaller PRs"), and `docs/Roadmap.md` (design-precision passes flagged as meta work).

- [2026-07-09] **Standards-pack gap-fill** (PR `chore/standards-pack-gap-fill`): the July CI/quality audit left a few standards gaps, now closed. New: **Definition of Done** + boring-technology rule in `AGENTS.md` (tests + doc updates ship in the same PR; small single-concern PRs; baselines never edited upward); `docs/RUNBOOK.md` (verified fresh-clone → run → test → deploy → troubleshooting guide); **ADR 0004** documenting the owner-approved exception that E2E runs against production Supabase with QA accounts; `npm run check` (local mirror of the blocking CI checks) and `npm run test:e2e` scripts; `.githooks/pre-push` (lint + typecheck + unit tests, ~66 s measured); `ACTIVE_USER_EMAIL/PASSWORD` placeholders added to `.env.example`; `CONTRIBUTING.md` updated to list all 9 required checks (was 6) and the new hooks/scripts; pointer maps + DoD summary added to `CLAUDE.md`/`GEMINI.md`. Advisory CI jobs (E2E, RLS coverage, dep audit, strict typecheck) are due for promotion to blocking ~2026-07-22 if green. Known local quirk: `npm run check` fails on the file-size ratchet while the uncommitted 2026-07-08 `BuildingDetails.tsx` edit (2948 → 2959 loc) sits in the working tree — that pending change must shed 11 lines (or extract a component) before it can land.
- [2026-07-08] **Building Info "Edit" pencil button dead-end fixed** (flagged by the 2026-07-08 repo quality audit): the hover-reveal Edit button in `BuildingInfoSection` (`BuildingDetails.tsx`) had a `/* TODO: open edit modal */` no-op `onClick`. A full edit flow already existed (`EditBuilding.tsx` page, routed at `/building/:id/edit` and `/building/:id/:slug/edit`, reusing the same `BuildingForm` used for building creation) — no new modal/page was needed. Wired the button to `navigate(getBuildingUrl(...) + "/edit")`, matching the identical pattern already used by the (unreferenced) `BuildingHeader.tsx` component. Also gated the button on `canEditOfficialData` (previously destructured as `_canEditOfficialData` and unused) so logged-out users no longer see a control that would just bounce them through the edit page's own auth redirect. Verified in-browser: logged in as a test user, clicking Edit on the Guggenheim Museum page navigates to `/building/2059/guggenheim-museum/edit` with the form pre-filled. `typecheck` and `lint` pass with zero new errors.
- [2026-07-01] **/search — surface construction status (Lost / Unbuilt / Under Construction / Temporary) on pins + list + drawer.** Construction status (`buildings.status`) was filter-only and never shown; revealed buildings were visually identical to standing ones. **3 migrations applied via MCP `apply_migration`** (`20271168000000`–`20271170000000`) — each `DROP`s then recreates its function (a new RETURNS TABLE column changes the return type, which `CREATE OR REPLACE` can't do) and re-asserts `GRANT EXECUTE`:
  - `get_buildings_list`, `search_buildings_v2`, and `get_map_clusters_v3` now also return `construction_status` = `b.status::text` (distinct from the existing `status` = user-library status). In the cluster RPC it's per-pin only (`CASE WHEN count(*)=1 …`; NULL for clusters). Verified at the DB level that all three return the column with values (Unbuilt/Under Construction/Lost/Built).
  - Client: new helpers `getConstructionTreatment` / `shouldFlagConstructionStatus` in `src/lib/buildingStatus.ts` (single source for map + list). `getPinStyle` applies a de-emphasized modifier on top of the tier style — Lost → `opacity-50`, Unbuilt/Under Construction → `border-dashed`; Temporary and clusters unchanged. SERP rows (`BuildingSidebar`) and the detail drawer (`BuildingDrawerBody`) render a bordered chip. `construction_status` threaded through `ClusterResponse`, `Building`, `BuildingSearchHit`, and the hand-built cluster objects in `BuildingSidebar`/`PlanoMap`.
  - **Product note:** Temporary is chip-only (no pin change) — it's a standing building, so fading/dashing would misrepresent it. `npm run typecheck` + targeted vitest (37 tests) green. `gen-types` is a no-op here (these RPCs are cast-through-unknown, not in generated types).
- [2026-07-01] **/search filter parity — SERP list ↔ map pins ↔ Find mode.** Audit found several drawer filters shaped only one surface (the list RPC `get_buildings_list` applied fewer keys than the pin RPC `get_map_clusters_v3`), and two filters (Folders/Collections, Curators & friends) were dead on both surfaces. Fixed end-to-end; **6 migrations applied via MCP `apply_migration`** (`20271162000000`–`20271167000000`):
  - `get_buildings_list` now parses/applies construction-status (`construction_statuses`/`exclude_construction_statuses`, replacing a hardcoded `status NOT IN (Demolished,Lost,Unbuilt)` exclusion), awards, `hide_saved`/`hide_visited`, and the B.C.-aware century clause — matching `get_map_clusters_v3`. `search_buildings_v2` gained `exclude_construction_statuses` + the B.C. century clause.
  - New shared SQL helpers `get_buildings_in_collections(collection_ids, folder_ids)` and `building_matches_contact_filters(building_id, rated_by, filter_contacts, contact_min_rating)` (both SECURITY DEFINER, guarded no-op), wired into all three RPCs so Folders/Collections and Curators & friends finally filter results. Verified at the DB level: list count == pin count for a collection filter (29 == 29) and a curator filter (13651 == 13651).
  - Client: extracted `resolveConstructionStatuses` to `src/lib/buildingStatus.ts` (shared by `useMapData` + `BuildingSidebar` so defaults can't drift); `BuildingSidebar` now forwards construction/awards/access/`folders`; `useMapData` forwards `folders`; `SearchPage.findModeFilters` forwards construction (via the helper), collections/folders, and curator filters so Find mode matches Browse.
  - **User-visible default change:** the SERP list now hides "Under Construction" buildings by default (it previously showed them), matching the map's `DEFAULT_EXCLUDED_CONSTRUCTION_STATUSES`. Intentional — the two surfaces were out of sync in both directions.
  - Out of scope (documented, not implemented): mode-driven list ordering (`ranking_preference` affects pin tiering only — cosmetic, no membership change).
  - `typecheck`/`lint` green; new unit tests for `resolveConstructionStatuses`; all tests for the changed files pass (the branch's 10 pre-existing rebuild-related failures in BuildingPopupContent/FilterDrawer/DiscoveryBuildingCard/useURLMapState are unaffected — verified by stash-isolation).

*121 earlier entries (- Plano Updates (2026-05-17): Created pl … - 2026-06-22 Backend speed forensic pass) are in [the archive](archive/AI_STATUS-ARCHIVE.md#completed-tasks), verbatim and with one heading each.*

