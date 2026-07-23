# Spec — Embassy ambassador experience

**Status:** audit complete 2026-07-23; remediation roadmap installed the same day as the
active [`docs/ROADMAP.md`](../Roadmap.md) ("Embassy ambassador experience"). This is the
standing companion audit and design rationale for that roadmap. Owner decisions recorded
2026-07-23: ship the trust fixes immediately; motivation phase uses **personal progress**
(streaks/milestones — no public competitive leaderboards); a **weekly digest email is
approved** (opt-out, respects notification preferences).

The Embassy (`/embassy`) is the portal where volunteer **ambassadors** find the tools and
resources to support the project: reviewing AI research on buildings, filling photo gaps,
architect outreach, moderating new content, growing the community, and publishing
discovered events. This spec audits the portal as shipped, names what works against the
volunteer, and specifies the improvement programme the roadmap executes.

---

## 1. The 30-minute session — today vs. target

**Today.** An ambassador lands on `/embassy` → is redirected to `/embassy/goals`, which
shows self-set goals (usually empty — setup is manual and blank-page), open chapter tasks,
and a timeline. To contribute they must go to Contribute and *choose* among six tools with
no signal about what actually needs doing. If they moderate content, the contributor never
hears about it. If they flag something, nothing happens at all (the button is a no-op). If
their onboarding said "I prefer Moderation," that preference was silently discarded on a
key mismatch. The portal repeatedly breaks its promises, and contributions vanish into
silence.

**Target.** Land → see 3–5 concrete, ready-to-complete tasks with context inline → finish
the first one in under 2 minutes → see it counted immediately → have a reason to return
tomorrow (streak, acknowledgment, weekly digest).

### Guiding principles

1. **First contribution in under 2 minutes.** The landing surface must present *tasks*,
   not *tools*. A tool menu forces a decision; a queue offers a next action with context.
2. **Never lie to the ambassador.** Every no-op button, dead progress bar, and ignored
   preference teaches volunteers their effort doesn't matter. Fixing broken feedback beats
   any new feature.
3. **Close every loop.** Every contribution gets an acknowledgment: the contributor whose
   photo was approved, the moderator whose flag went somewhere, the ambassador whose weekly
   total ticked up. Silent work is why volunteers churn.
4. **Complete the task where it starts.** No bouncing to building pages to upload a photo.
   Context in, outcome recorded, next task offered — in one surface.
5. **Vertical slices on existing rails.** Reuse the notifications system and `notify-*`
   edge-function patterns, the `get_chapter_*` RPCs, the `embassy-ui.tsx` kit, the
   photo-upload hooks, and `building_audit_logs`. No new platforms; no big-bang rewrite.

---

## 2. Audit — current state

### 2.1 Surface map

| Route | Page | Purpose |
|---|---|---|
| `/embassy` → redirects to `/embassy/goals` | — | entry |
| `/embassy/goals` ("Dashboard") | `MyGoals.tsx` | self-set goals, open tasks, personal timeline |
| `/embassy/contribute` | `Contribute.tsx` | hub of 6 contribution tools (via `?tool=`) |
| `/embassy/projects` | `ChapterProjects.tsx` | chapter projects, campaigns, ideas inbox |
| `/embassy/team` | `Team.tsx` | chapter roster |
| `/embassy/tasks` | `Tasks.tsx` | chapter task board |
| `/embassy/leadership` | `Leadership.tsx` | leader-only: metrics, activity, applications |
| `/embassy/welcome` | `Onboarding.tsx` | 3-step onboarding with tool-preference ranking |

The six Contribute tools: **Data & Research** (AI research queue + duplicate detection),
**Photography** (map/list of photo gaps), **Architect Outreach** (mini-CRM over
`outreach_log`), **Moderation** (approve recent buildings/photos/videos/credits),
**Grow Community** (link to `/connect`), **Events** (review AI-discovered events).

### 2.2 Broken — feedback loops that lie (roadmap Phase 1)

1. **Onboarding ↔ Contribute tool-key mismatch.** `Onboarding.tsx` saves the preference
   key `"moderation"`; `Contribute.tsx` sorts by key `"curation"`. A saved Moderation
   preference is silently dropped. Onboarding also offers only 5 rankable tools — Events is
   missing — and its Moderation description ("Review tags, group buildings into
   collections, and highlight gems") describes features that don't exist.
2. **The Moderation Flag button is a no-op.** `FlagButton` (Contribute.tsx `handleFlag`)
   shows a "Flagged for admin review" toast and hides the card locally — nothing is
   written anywhere. Relatedly, **no code path in the app writes to the `reports` table**,
   so the admin moderation queue (`/admin/moderation`) is starved by design.
3. **Campaign outreach progress is permanently 0.** `fetchCampaignProgress` in
   `ChapterProjects.tsx` counts `outreach_log` rows matching `ambassador_id IN
   (membership ids)`, but that column stores **profile/user ids** (see migration
   `20271115000000_fix_outreach_log_ambassador_fk_to_profiles.sql` and every other
   consumer). Outreach campaigns can never show progress.
4. **Inconsistent front door + dead code.** The avatar menu links to `/embassy/contribute`
   while `/embassy` redirects to `/embassy/goals`; the `embassy-index` route mapping is
   unreachable dead config. `src/features/embassy/pages/Embassy.tsx` (729 lines) is
   unrouted, imported nowhere, and duplicates logic with drifted role labels.
5. **Invisible failures.** `/api/embassy/event-search` returns 503 when `SERPER_API_KEY`
   is unset, and `EmbassyLayout`'s fire-and-forget kick-offs swallow all errors — a
   misconfigured backend renders as an inexplicably empty Events tool.

### 2.3 Friction — the productive session is harder than it should be (Phase 2)

- **Tool menu, not task feed.** The dashboard doesn't answer "I have 30 minutes — what
  should I do?" All the queues already exist (research queue, moderation backlog, photo
  gaps, unclaimed firms, event discoveries); nothing aggregates them into next actions.
- **Photography is discovery-only.** The tool finds buildings lacking photos but the
  upload requires navigating to each building page — a full round-trip per photo.
- **Moderation is silent for contributors.** No `contribution_approved` /
  `contribution_flagged` notification types exist; a member whose building, photo, video,
  or credit was reviewed never learns of it.
- **Goals have a blank-page problem.** "Set a goal" starts from an empty form; goal
  metrics cover only edits/photos/visits/firms_claimed — moderation, outreach, events, and
  research contributions can't count toward any goal.

### 2.4 Motivation — no reason to return tomorrow (Phase 3)

- The only activity view (per-member counts, 30-day window, `total_score`) is
  **leader-only**; an ambassador cannot see their own cumulative impact.
- No streaks, no milestones; the only recognition is a profile badge marker.
- No pull-back mechanism — return visits depend entirely on the volunteer's memory.

### 2.5 Debt observed (fixed opportunistically, extract-on-touch)

- `Contribute.tsx` is **3,086 lines** hosting all six tools inline — already flagged in
  `docs/CODEBASE_STRUCTURE_AUDIT.md`.
- Three different empty-state treatments in one workspace (dashed-border panels, the
  canonical `EmbassyEmptyState`, bare `<p>`); off-system shadcn tokens in Contribute.
- `window.confirm()` for destructive actions (Tasks, Projects) instead of app dialogs.
- Developer-facing error copy shown to volunteers ("Check if the ambassador_goals table
  exists.", "Check your database migrations…"); `@anonymous` / "Another ambassador"
  fallbacks.
- Duplicated leader/president role arrays declared inline in ≥6 files.

**Policy:** no pure-refactor PR. Any Phase-2+ task that touches a tool extracts it from
`Contribute.tsx` into its own file, converts its empty/error states to the
`embassy-ui.tsx` kit, replaces `window.confirm`, and rewrites dev-facing copy — in the
same PR as the feature work.

---

## 3. Programme design (what the roadmap executes)

### Phase 1 — Restore trust (fix what's broken)

Small, immediate, all verifiable: fix the tool-key contract (map legacy saved values, add
Events as the 6th rankable tool, correct the Moderation description); make the Flag button
write real `reports` rows the admin queue consumes; fix the campaign outreach query to
match on profile ids; align the front door and delete the dead page; surface event-search
misconfiguration as a clear in-tool state.

### Phase 2 — Friction killers (the productive session)

- **"Start here" task queue** at the top of the dashboard (and as the `/embassy` landing):
  3–5 ready tasks aggregated from the existing queues, ranked by the (now-working) saved
  tool preference and chapter need, each deep-linking into the exact item. Extension of
  `src/features/embassy/api/taskFeed.ts`; no new task types.
- **In-tool photo upload:** upload sheet directly on Photography map/list items (reuse
  `useBuildingInteractions` + `uploadFile`), mark done, advance to next.
- **Contribution outcome notifications:** new `contribution_approved` /
  `contribution_flagged` types fired from the ambassador moderation actions, following the
  `notify-credit-outcome` edge-function pattern.
- **Suggested goals:** replace the blank form as the primary path with one-click suggested
  goal chips derived from chapter backlog; extend goal metrics to moderation, outreach,
  events, and research (the counting logic already exists in the activity RPC).

### Phase 3 — Personal progress & return loops (owner decision: no public rankings)

- **"My impact"** for every ambassador: totals by contribution type, weekly streak,
  personal timeline — the leader activity view scoped to self, plus streak computation in
  the RPC.
- **Weekly digest** (in-app + email, opt-out via notification preferences; skips members
  inactive ≥4 weeks — no guilt-spam): "you did X, your chapter did Y, 3 tasks are
  waiting" — reusing the task-feed aggregation.
- **Milestone recognition** (first contribution, 10 photos, 50 moderations, 4-week
  streak) surfaced on My impact and as notifications. Explicitly *not* a competitive
  leaderboard: milestones reward everyone's own progress without incentivizing quantity
  over data quality.

### Phase 4 — Bigger bets (gated on Phases 1–3 metrics)

- **Pre-publish moderation for new buildings** from non-trusted contributors (`pending` →
  chapter approval → publish, with the Phase-2 notification closing the loop). Today
  buildings insert directly with retroactive best-effort review — a data-quality risk that
  grows with ambassador success. Deliberately sequenced after notifications exist, so
  pending items don't feel like a black hole.
- **Missions:** curated task bundles with a progress bar and a finish line ("10 buildings
  in Chamberí missing architects"), assembled by chapter leads on `programme_campaigns`.
- **Field mode for photography:** mobile-first nearest-gaps flow with camera capture —
  only if in-tool upload measurably lifts photo contributions.

---

## 4. Success metrics (all derivable from existing tables)

| Metric | Source | Target phase |
|---|---|---|
| Weekly active contributors (north star) | distinct users/week across `building_audit_logs`, `review_images`, `outreach_log`, moderation + research + event decisions | all |
| Contributions per active ambassador per week, by type | same tables, grouped | 2 |
| Week-over-week retention / streak length | week-N vs week-N+1 activity | 3 |
| Onboarding → first contribution (conversion + latency) | `onboarded_at` vs first activity row | 1–2 |
| Moderation latency | content `created_at` → approval timestamp | 2 |
| Report volume | `reports` rows/week (baseline is literally 0) | 1 |
| Goal adoption + completion | `ambassador_goals` rows; progress RPC | 2 |

---

## 5. Out of scope, with reasons

- **Competitive public leaderboards / points economy.** Owner decision 2026-07-23:
  personal progress instead. Rankings demotivate the median volunteer and reward quantity
  over accuracy on a catalog-quality platform.
- **Big-bang `Contribute.tsx` rewrite.** Extract-on-touch (§2.5 policy) pays the debt down
  inside feature PRs without freezing feature work.
- **New task types from `docs/AMBASSADOR_TASKS.md`.** Six tools exist and usage is not yet
  instrumented; measure first, expand later.
- **Community/chat features inside the Embassy.** `/connect` exists; Grow Community stays
  a link.
- **Expanding the Tasks board into project management.** Adequate for chapter
  coordination; the leverage is in the contribution loop.
- **Native mobile app.** The Phase-4 responsive field mode covers the need.
- **More AI supply pipelines.** The existing research/event queues already outpace review
  throughput; fix throughput (task feed) before adding supply.
