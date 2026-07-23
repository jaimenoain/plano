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

## [ ] Phase 2 — Friction killers (the productive session)

- **2.1 — "Start here" task queue.** Shipped 2026-07-23: the Dashboard (and, via the
  existing redirect, the `/embassy` landing) opens with up to 5 ready tasks — the top live
  item of each queue (research, moderation, photo gaps, unclaimed firms, event
  discoveries) — ranked by saved tool preference then chapter backlog, each deep-linking
  into its tool with that item first. New `fetchStartHereTasks` + pure `rankStartHereTasks`
  (unit-tested) in `api/startHere.ts`; new `StartHereQueue` component; no new RPC/migration
  (reuses the existing chapter-scoped fetchers). Item-level auto-select left as follow-up.
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
- **2.3 — Contribution outcome notifications.** New `contribution_approved` /
  `contribution_flagged` notification types fired from ambassador moderation actions,
  following the `notify-credit-outcome` pattern. Closes the silent-moderation loop.
- **2.4 — Suggested goals + broader metrics.** One-click suggested goal chips derived
  from chapter backlog; goal metrics extended to moderation, outreach, events, and
  research (borrow counting from the activity RPC).

## [ ] Phase 3 — Personal progress & return loops

- **3.1 — "My impact" page with streaks.** Every ambassador sees their totals by
  contribution type, weekly streak, and timeline (leader activity view scoped to self;
  streak computed in the RPC).
- **3.2 — Weekly digest.** In-app + email ("you did X, chapter did Y, 3 tasks
  waiting"), opt-out via notification preferences, auto-skips members inactive ≥4 weeks.
  pg_cron + edge function following `send-welcome-email`.
- **3.3 — Milestone recognition.** First contribution / 10 photos / 50 moderations /
  4-week streak, shown on My impact + as notifications. No public rankings (owner
  decision).

## [ ] Phase 4 — Bigger bets (gated: revisit after Phase 3 with metrics from spec §4)

- **4.1 — Pre-publish moderation for new buildings** from non-trusted contributors
  (pending → chapter approval → publish; requires 2.3 live so pending isn't a black hole).
- **4.2 — Missions.** Curated task bundles with progress + finish line, assembled by
  chapter leads on `programme_campaigns`.
- **4.3 — Field mode for photography.** Mobile-first nearest-gaps flow with camera
  capture — only if 2.2 measurably lifts photo contributions.

## Final UAT

Business claims to confirm at close-out:

- A brand-new ambassador can find and complete a first contribution in one sitting without
  guidance, and the portal acknowledges it.
- Flagging bad content produces a row an admin actually sees.
- An ambassador can see their own impact (not just leaders), and inactive members receive
  a weekly nudge they can switch off.
