# Roadmap — Embassy ambassador experience

**Installed:** 2026-07-23 (subsequent mode; replaces the completed Principles-alignment
roadmap, archived as [`docs/roadmaps/0002-principles-alignment.md`](roadmaps/0002-principles-alignment.md)).
**Companion spec:** [`docs/specs/embassy-ambassador-experience.md`](specs/embassy-ambassador-experience.md)
— the full audit, design rationale, metrics, and out-of-scope list. Owner decisions
recorded there (2026-07-23): trust fixes ship immediately; motivation = personal progress
(no public competitive leaderboards); weekly digest email approved (opt-out).

**Goal.** An ambassador with 30 free minutes lands on `/embassy`, sees 3–5 concrete ready
tasks, completes the first in under 2 minutes, sees it counted, and has a reason to return
tomorrow. Phase 1 removes every "the portal lied to me" moment; Phase 2 builds the
productive session; Phase 3 the return loop; Phase 4 holds gated bigger bets.

## [X] Phase 0 — Owner prerequisites (human-only, non-blocking)

- **0.1 — Confirm `SERPER_API_KEY` is set in production env.** Confirmed by owner
  2026-07-23. The Events tool's discovery pipeline 503s without it.
- **0.2 — Apply migration `20271182000000_embassy_flag_reports.sql` to prod.** Applied
  2026-07-23 (psql via `SUPABASE_DB_URL`, owner-authorized): `reports` now has
  `content_type` and no longer carries the mistaken `reported_id → profiles` FK, so the
  Moderation flag button writes real rows in prod. (ALTERs ran idempotently — the schema
  was already in target state; the run settled and verified it.)

## [X] Phase 1 — Restore trust (fix what's broken)

- **1.1 — Onboarding ↔ Contribute tool-preference contract.** Shipped 2026-07-23
  (PR #1626): legacy `moderation` key mapped on read via shared `toolPreferences.ts`,
  Events added as the 6th rankable tool, Moderation description corrected. Unit tests
  cover the legacy-key mapping.
- **1.2 — Real flagging.** Shipped 2026-07-23 (PR #1627): flags insert typed pending
  `reports` rows the `/admin/moderation` queue consumes; migration `20271182000000` drops
  the mistaken `reported_id → profiles` FK and adds `content_type`.
  Migration applied to prod 2026-07-23 (owner action 0.2 done) — flagging now works live.
- **1.3 — Campaign outreach progress.** Shipped 2026-07-23 (PR #1628): outreach
  matched against member user ids; helper extracted to `api/campaignProgress.ts` with a
  regression test.
- **1.4 — One front door + dead code removal.** Shipped 2026-07-23 (PR #1629): all
  entries point at `/embassy`; dead `pages/Embassy.tsx` (729 lines) and the unreachable
  `embassy-index` mapping deleted.
- **1.5 — Visible failure states for event discovery.** Shipped 2026-07-23 (PR #1630):
  Events tool reads the latest `embassy_event_search_runs` row — clear switched-off /
  failed / searching states, polling stops on failure, layout kick-offs log a warning.

## [x] Phase 2 — Friction killers (the productive session)

- **2.1 — "Start here" task queue.** Shipped 2026-07-23: the Dashboard (and, via the
  existing redirect, the `/embassy` landing) opens with up to 5 ready tasks — the top live
  item of each queue (research, moderation, photo gaps, unclaimed firms, event
  discoveries) — ranked by saved tool preference then chapter backlog, each deep-linking
  into its tool with that item first. New `fetchStartHereTasks` + pure `rankStartHereTasks`
  (unit-tested) in `api/startHere.ts`; new `StartHereQueue` component; no new RPC/migration
  (reuses the existing chapter-scoped fetchers). Item-level auto-select left as follow-up.
  Amended 2026-07-29: the queue sits *below* "Open tasks" on the Dashboard — assigned
  chapter tasks with due dates are commitments and outrank suggested work; the open-tasks
  list also puts tasks assigned to the viewer ahead of the rest of the chapter's.
- **2.2 — In-tool photo upload.** Shipped 2026-07-23: Photography list rows and map
  gap-pins open an in-place `PhotoUploadSheet` (compress → `uploadFile` → `review_images`,
  mirroring the building-detail save path in a new `api/photoUpload.ts`); on success the
  building drops out of the gap queue / its pin count updates and the sheet advances to the
  next. Extract-on-touch (§2.5): `PhotographyTool` pulled out of `Contribute.tsx`
  (3087 → 2694 lines) with its empty/error states converted to the `embassy-ui` kit; the
  map "Add photo" action threads one guarded optional prop through the shared
  `PlanoMap`/`MapMarkers`/`BuildingPopupContent` (invisible outside gap mode). Pure
  `buildReviewImageRow` + `nextBuildingAfter` unit-tested. No migration (reuses existing
  tables/RPC). Item-level auto-select on the map is a follow-up.
- **2.3 — Contribution outcome notifications.** Shipped 2026-07-23: new
  `contribution_approved` / `contribution_flagged` notification types. All six
  `ambassador_approve_*` RPCs (building/photo/video/credit, plus the two global variants)
  now notify the original contributor right after stamping `moderated_at`; a new
  `AFTER INSERT` trigger on `reports` notifies the contributor when an ambassador flags
  their building/photo/video/credit via the Moderation tool's flag button. Migration
  `20271183000000_contribution_outcome_notifications.sql`. Closes the silent-moderation
  loop.
- **2.4 — Suggested goals + broader metrics.** Shipped 2026-07-23: one-click suggested
  goal chips on `/embassy/goals` (new `SuggestedGoalChips` + `api/suggestedGoals.ts`,
  pure `buildSuggestedGoals` unit-tested) derived from the same five backlog queues
  `StartHereQueue` uses — clicking a chip creates the goal immediately, no dialog.
  `ambassador_goals.metric` and `get_my_ambassador_goals()` extended with four new
  counting branches: moderation and outreach mirror `get_chapter_ambassador_activity`'s
  existing filters; events and research are new signals (`embassy_event_discoveries`
  publish stamps and the `ai_research_apply` audit-log tag respectively — the activity
  RPC doesn't count either today). Migration `20271184000000_embassy_goal_metrics_expansion.sql`.
  Known pre-existing gap, not fixed here: video approvals aren't tagged as moderation
  anywhere in the app, so they don't count toward a moderation goal either.

## [x] Phase 3 — Personal progress & return loops

- **3.1 — "My impact" page with streaks.** Shipped 2026-07-24: new `/embassy/impact`
  route, added to the workspace tab bar for every ambassador (not leader-gated, unlike
  `/embassy/leadership`). Backed by new `get_my_ambassador_impact()` — unions all 8
  contribution sources `get_my_ambassador_goals()` already knows how to count into one
  self-scoped row: all-time totals per type, a server-computed weekly streak (consecutive
  weeks with any activity, one week's grace), and a recent timeline. New
  `api/impact.ts` (`fetchMyImpact` + pure `summarizeImpactTotals`, unit-tested) and
  `pages/MyImpact.tsx`. Migration `20271185000000_embassy_my_impact.sql`. Same
  pre-existing gap as 2.4: video approvals aren't tagged as moderation anywhere, so they
  don't count here either.
- **3.2 — Weekly digest.** Shipped 2026-07-30: `embassy-weekly-digest` (pg_cron, Mondays
  09:00 UTC) calls new `run_weekly_digest()`, which snapshots one payload per active
  ambassador into the new `embassy_digest_deliveries` ledger, writes a `weekly_digest`
  in-app notification, and fires one `pg_net` call to the new `send-weekly-digest` edge
  function for the email. Migration `20271193000000_embassy_weekly_digest.sql`.
  Three decisions worth remembering:
  (a) **The numbers are chapter-scoped and week-windowed, so they deliberately do not
  match `/embassy/impact` (global, all-time) or the leaderboard.** `building_audit_logs`
  is split into three mutually exclusive buckets — edits / moderation / research — so
  `you.total` is a real sum; `get_my_ambassador_impact.edits_count` counts moderation and
  research rows as edits too, which would have made the email contradict itself.
  (b) **Self-actor convention**: `notifications.actor_id` is NOT NULL and there is no
  system profile, so system notifications use `actor_id = user_id`. 3.3 should reuse it.
  (c) **`REVOKE ... FROM PUBLIC` does not block anon on Supabase** — `ALTER DEFAULT
  PRIVILEGES` grants EXECUTE to `anon`/`authenticated` directly at creation. Caught live
  (an anonymous `rpc/run_weekly_digest` returned 200 and ran); every function here is now
  revoked from `PUBLIC, anon, authenticated` by name. The same hazard likely affects
  other RPCs in this repo — audited separately.
  The ≥4-week inactivity skip is implemented as `p_inactive_weeks DEFAULT 4`, so it can be
  reversed with a one-line `cron.schedule` change and no migration. On current prod data
  it silences 1 of 3 active ambassadors. Backlog counts are capped at 200 per queue and
  render as "200+"; the in-app half works today, the email half needs the edge function
  deployed.
- **3.3 — Milestone recognition.** Shipped 2026-07-30: the four badges the phase names —
  `first_contribution`, `photos_10`, `moderations_50`, `streak_4` — are awarded by new
  `sync_my_ambassador_milestones()` into the new `ambassador_milestones` ledger
  (PK `(user_id, key)`), announced once each as a new `milestone_earned` notification
  (self-actor, per 3.2's convention; opt-out toggle in notification settings), and shown
  as a shelf on `/embassy/impact` with live progress toward the unearned ones
  (`3 / 10`). The client calls it on any Embassy visit — not just the impact page, or the
  notification could only reach someone who had already looked — via one shared query key,
  and it is idempotent (`ON CONFLICT DO NOTHING`), so re-calls award nothing.
  Migration `20271195000000_embassy_milestones.sql`. Two decisions worth remembering:
  (a) **The function counts nothing itself** — it reads one row from
  `get_my_ambassador_impact(0)`, so a badge is judged on the exact numbers the page
  renders. `auth.uid()` reads the per-request JWT GUC and survives the nested
  SECURITY DEFINER call.
  (b) **Thresholds live only in SQL** — the RPC returns `target` + `progress`, so the UI
  cannot drift from the rule that awards the badge.
- **3.3a — Moderation counted zero everywhere (found while verifying 3.3, fixed).**
  Every Embassy moderation metric tested
  `building_audit_logs.table_name IN ('ambassador_approval', …)`, but those markers are
  written to `operation`; `table_name` holds the table the approval touched. On prod: **0**
  rows matched the old predicate against **1508** carrying those values in `operation`, so
  moderation read 0 for every ambassador and all 1508 approvals were tallied as plain
  edits. The `moderations_50` badge could never have been earned. Migration
  `20271196000000_fix_moderation_metric_predicate.sql` moves the predicate to `operation`
  in all three functions that carry it — `get_my_ambassador_impact` (3.1),
  `get_my_ambassador_goals` (2.4), `compute_weekly_digest_payloads` (3.2) — together,
  because they quote the same metric at the reader and fixing one would put two Embassy
  pages in open contradiction. It also closes the gap 2.4/3.1/3.2 had each documented as
  known-and-unfixed: `ambassador_video_approval` joins the list, so approving a video now
  counts like approving a photo. Owner decision 2026-07-30: fix everywhere. User-visible
  effect — moderation numbers jump from 0 to their true values (owner's own account: 161)
  on My impact, in goal progress, and in the next weekly digest email, where the "edits"
  number drops by the same amount.

## [ ] Phase 4 — Bigger bets (opened 2026-07-30 for 4.3 only)

Owner decision 2026-07-30: open Phase 4 with **4.3 alone**. 4.1 and 4.2 stay closed — not
dropped, just not started. 4.3's own gate ("only if 2.2 measurably lifts photo contributions")
was waived: the owner opened it without waiting for that metric.

- **4.1 — Pre-publish moderation for new buildings** — NOT OPENED. From non-trusted
  contributors (pending → chapter approval → publish; requires 2.3 live so pending isn't a
  black hole).
- **4.2 — Missions** — NOT OPENED. Curated task bundles with progress + finish line, assembled
  by chapter leads on `programme_campaigns`.
- **4.3 — Field mode for photography.** Shipped 2026-07-30: new `/embassy/field` (its own tab
  in the workspace bar, plus a link from the Photography tool) asks for the ambassador's
  location and lists their chapter's photo gaps **nearest first**, each row one tap from the
  camera. Backed by new `get_ambassador_nearby_photo_gaps()` — chapter scope inlined, not the
  per-row helper; radius and limit clamped; 3.8 ms on prod for a 2 km London query against
  `buildings_location_idx`. New `api/fieldMode.ts` (`fetchNearbyPhotoGaps` + pure unit-tested
  `formatDistance` / `nextRadiusAfter`); `PhotoUploadSheet` gained an opt-in `cameraFirst`
  which adds a second input carrying `capture="environment"` — the first use of that attribute
  in the repo, so the desktop tool is untouched. Migration `20271197000000`.
  Three decisions worth remembering:
  (a) **Chapter-scoped** (owner decision) — outside your chapter you get an honest empty state,
  because photos there wouldn't count toward your chapter.
  (b) **Radius ladder, not an unbounded query** — 2 km, then one tap to 10 km. Around the
  Barbican that is 6 gaps vs 45, so the step matters.
  (c) **No `watchPosition`** — a Recentre button instead; continuous tracking costs battery and
  the list re-queries after every upload anyway. If location is refused the page falls back to
  the chapter's centre and *says so on screen* rather than silently pretending.
- **4.3a — The gap predicate never excluded anything (found while building 4.3, fixed).**
  `get_ambassador_buildings_without_photos` tested `NOT EXISTS (… user_buildings ub JOIN
  review_images ri ON ri.review_id = ub.id …)`, but `review_images.review_id` is a foreign key
  to `building_posts.id`. It matched only by accident — 18009 of 18021 `building_posts` rows
  carry the same uuid as their `user_buildings` row, a legacy 1:1 artefact — and was blind to
  every post written by current code, including 2.2's in-tool uploads. Field mode would have
  broken on its most important beat: photograph a building and it never leaves the list. Both
  functions now join through `building_posts` (same migration). User-visible effect: buildings
  that already have photos stop being offered as gaps (3 on prod today).

## Final UAT

Business claims to confirm at close-out:

- A brand-new ambassador can find and complete a first contribution in one sitting without
  guidance, and the portal acknowledges it.
- Flagging bad content produces a row an admin actually sees.
- An ambassador can see their own impact (not just leaders), and inactive members receive
  a weekly nudge they can switch off.
