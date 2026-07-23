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

## Phase 0 — Owner prerequisites (human-only, non-blocking)

- [ ] **0.1 — Confirm `SERPER_API_KEY` is set in production env.** The Events tool's
  discovery pipeline 503s without it. Task 1.5 makes the failure visible either way.
- [ ] **0.2 — Apply migration `20271182000000_embassy_flag_reports.sql` to prod.** Direct
  DB writes were permission-blocked in the agent session that shipped 1.2. One-liner:
  `eval "$(grep '^SUPABASE_DB_URL=' .env.local)" && psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20271182000000_embassy_flag_reports.sql`
  (or authorize the agent to run it). Until applied, the flag button shows an error toast.

## Phase 1 — Restore trust (fix what's broken)

- [x] **1.1 — Onboarding ↔ Contribute tool-preference contract.** Shipped 2026-07-23
  (PR #1626): legacy `moderation` key mapped on read via shared `toolPreferences.ts`,
  Events added as the 6th rankable tool, Moderation description corrected. Unit tests
  cover the legacy-key mapping.
- [x] **1.2 — Real flagging.** Shipped 2026-07-23 (PR #1627): flags insert typed pending
  `reports` rows the `/admin/moderation` queue consumes; migration `20271182000000` drops
  the mistaken `reported_id → profiles` FK and adds `content_type`.
  **⚠️ Migration awaiting prod apply (owner action 0.2)** — flags error honestly until then.
- [x] **1.3 — Campaign outreach progress.** Shipped 2026-07-23 (PR #1628): outreach
  matched against member user ids; helper extracted to `api/campaignProgress.ts` with a
  regression test.
- [x] **1.4 — One front door + dead code removal.** Shipped 2026-07-23 (PR #1629): all
  entries point at `/embassy`; dead `pages/Embassy.tsx` (729 lines) and the unreachable
  `embassy-index` mapping deleted.
- [x] **1.5 — Visible failure states for event discovery.** Shipped 2026-07-23 (PR #1630):
  Events tool reads the latest `embassy_event_search_runs` row — clear switched-off /
  failed / searching states, polling stops on failure, layout kick-offs log a warning.

## Phase 2 — Friction killers (the productive session)

- [ ] **2.1 — "Start here" task queue.** Dashboard (and `/embassy` landing) opens with 3–5
  ready tasks aggregated from the existing queues (research, moderation backlog, photo
  gaps, unclaimed firms, event discoveries), ranked by saved tool preference + chapter
  need, each deep-linking to the exact item. Extends `src/features/embassy/api/taskFeed.ts`.
- [ ] **2.2 — In-tool photo upload.** Photography map/list items open an in-place upload
  sheet (reuse `useBuildingInteractions` + `uploadFile`), mark the building done, advance
  to the next. Extracts `PhotographyTool` from `Contribute.tsx` (extract-on-touch policy,
  spec §2.5).
- [ ] **2.3 — Contribution outcome notifications.** New `contribution_approved` /
  `contribution_flagged` notification types fired from ambassador moderation actions,
  following the `notify-credit-outcome` pattern. Closes the silent-moderation loop.
- [ ] **2.4 — Suggested goals + broader metrics.** One-click suggested goal chips derived
  from chapter backlog; goal metrics extended to moderation, outreach, events, and
  research (borrow counting from the activity RPC).

## Phase 3 — Personal progress & return loops

- [ ] **3.1 — "My impact" page with streaks.** Every ambassador sees their totals by
  contribution type, weekly streak, and timeline (leader activity view scoped to self;
  streak computed in the RPC).
- [ ] **3.2 — Weekly digest.** In-app + email ("you did X, chapter did Y, 3 tasks
  waiting"), opt-out via notification preferences, auto-skips members inactive ≥4 weeks.
  pg_cron + edge function following `send-welcome-email`.
- [ ] **3.3 — Milestone recognition.** First contribution / 10 photos / 50 moderations /
  4-week streak, shown on My impact + as notifications. No public rankings (owner
  decision).

## Phase 4 — Bigger bets (gated: revisit after Phase 3 with metrics from spec §4)

- [ ] **4.1 — Pre-publish moderation for new buildings** from non-trusted contributors
  (pending → chapter approval → publish; requires 2.3 live so pending isn't a black hole).
- [ ] **4.2 — Missions.** Curated task bundles with progress + finish line, assembled by
  chapter leads on `programme_campaigns`.
- [ ] **4.3 — Field mode for photography.** Mobile-first nearest-gaps flow with camera
  capture — only if 2.2 measurably lifts photo contributions.

## Final UAT

Business claims to confirm at close-out:

- A brand-new ambassador can find and complete a first contribution in one sitting without
  guidance, and the portal acknowledges it.
- Flagging bad content produces a row an admin actually sees.
- An ambassador can see their own impact (not just leaders), and inactive members receive
  a weekly nudge they can switch off.
