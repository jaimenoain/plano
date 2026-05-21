# Plano — Core Team Management Platform: Roadmap

**Purpose:** A dedicated surface for the Plano central team to monitor the health of the ambassador programme, coordinate chapter presidents, and act on issues — without digging through CRUD admin tables.

**Audience:** Plano staff only (`app_admin` role). Chapter presidents and ambassadors are not affected by this work.

**Route:** `/admin/programme` (new section within the existing admin shell)

**Distinction from the existing admin panel:** `/admin/ambassadors` handles data operations — create chapters, manage memberships, review applications. This platform sits above that layer and answers: *Is the programme healthy? Where does it need attention? How do we communicate with the people running it?*

---

## What is already built

| Capability | Where it lives |
|---|---|
| Chapter CRUD (create, edit, status, cap) | `/admin/ambassadors` |
| Membership management (add, role, status) | `/admin/ambassadors/:chapterId` |
| Application review across all chapters | `/admin/ambassadors/applications` |
| Locality coverage map | `/admin/ambassadors/coverage` |
| Programme-wide stats (totals, by country) | `/admin/ambassadors/coverage` — Coverage tab |
| National chapter overview | `/admin/ambassadors/coverage` — National tab |

The phases below add coordination and monitoring capabilities that do not exist today.

---

## [x] Phase 1 — Programme Health Dashboard

**Goal:** Replace the current stats overview with a dashboard the core team can open each morning and immediately know the state of the programme.

### What it delivers

A new tab — **Programme Health** — at `/admin/programme/health`, containing four zones:

**Pulse zone (top row — four stat cards)**
- Active chapters / Forming chapters / Inactive chapters — with a 30-day delta indicator
- Pending applications unreviewed for > 7 days — count with a warning badge if > 0

**Activity zone (chart)**
- Edits and photos contributed per day over the last 30 days, with a 7-day rolling average line
- Sourced from `building_audit_logs`, the same data that powers the Embassy Leadership tab

**Chapters needing attention (flagged list)**
- Chapters with no president assigned
- Chapters whose president has been inactive (no audit log entries) for > 30 days
- Chapters in `forming` status for > 60 days
- Each row links directly to `/admin/ambassadors/:chapterId`

**Top 5 chapters this month**
- Ranked by combined edits + photos in the last 30 days, with member count alongside

### Data sources
- `ambassador_chapters` — chapter count and status
- `ambassador_memberships` — president identification (role = `president`, status = `active`)
- `ambassador_applications` — pending count and submission dates
- `building_audit_logs` — contribution activity

### New RPCs needed
- `get_programme_health_summary` — returns pulse stats, flagged chapters, and top chapters in one call

---

## [x] Phase 2 — Chapter President Directory

**Goal:** Give the core team a single place to see every chapter president, understand their chapter's health at a glance, and reach out directly.

### What it delivers

A new tab — **Presidents** — at `/admin/programme/presidents`, containing:

**Searchable, filterable table**
- Columns: President username / avatar, chapter name, country, chapter status, member count, last active date, edits (last 30 days), open applications
- Filter by: country, chapter status, activity (active / inactive > 30 days)
- Search by president username or chapter name

**President detail panel (slide-out)**
- Clicking a row opens a side panel with:
  - Profile avatar, username, chapter role, member since date
  - Chapter health summary (same metrics as the table row, expanded)
  - List of chapter ExCo members
  - Contact action: **Send message** (opens the broadcast composer pre-addressed to this chapter — see Phase 4)
  - Quick link to full chapter management at `/admin/ambassadors/:chapterId`

### Data sources
- `ambassador_memberships` joined with `profiles` — president identity and last active
- `ambassador_chapters` — chapter metadata
- `building_audit_logs` — per-president activity
- `ambassador_applications` — open application count per chapter

### New RPCs needed
- `get_president_directory` — returns all presidents with their chapter and activity metrics in one call

---

## [x] Phase 3 — Intervention Queue

**Goal:** Surface issues the core team needs to act on before they become problems, without requiring manual inspection of every chapter.

### What it delivers

A new tab — **Interventions** — at `/admin/programme/interventions`, containing:

**Automated flag list**

Each flag has: a severity badge (`urgent` / `warning` / `info`), a plain-English description of the issue, the affected chapter name + link, and a suggested action.

| Flag | Severity | Trigger condition | Suggested action |
|---|---|---|---|
| Chapter has no president | Urgent | `president` role membership does not exist for an `active` chapter | Assign a president |
| President inactive | Warning | President has no audit log entries in > 30 days | Review or reassign |
| Forming chapter stalled | Warning | Chapter in `forming` status for > 60 days | Follow up or close |
| Chapter at capacity with open applications | Warning | `active_members = max_ambassadors` and `pending_applications > 0` | Review cap |
| President location mismatch | Warning | President's profile `country_code` no longer matches chapter `country_code` | Review membership |
| No chapter activity | Info | Chapter has had zero edits or photos in the last 30 days | Check in with president |

**Dismiss / snooze actions**
- Each flag can be dismissed (won't reappear unless the condition recurs) or snoozed for 7 / 14 / 30 days
- Dismissals are stored per admin user — other team members still see the flag

**Flag count badge**
- The Interventions tab shows a count badge when there are active flags, so the core team sees it without opening the tab

### New table needed
- `admin_flag_dismissals (flag_type, entity_id, dismissed_by, dismissed_at, snooze_until)` — tracks which flags have been dismissed by whom

### New RPCs needed
- `get_programme_intervention_flags` — evaluates all flag conditions and returns the active list, excluding dismissed/snoozed entries

---

## Phase 3 Summary

**Completed:** 2026-05-20

**Deviations:**
- `president_location_mismatch` flag not implemented — `profiles` table has a free-text `country` column, not a `country_code` ISO field, so a reliable country-code comparison is not possible without a schema change. Deferred to a future iteration once profiles stores a normalised country code.

**Specs updated:**
- `docs/AI_STATUS.md` — updated current phase and architecture snapshot.

---

## [x] Phase 4 — Broadcast and Announcements

**Goal:** Let the core team send structured messages to chapter presidents (all, by country, or individually) and confirm receipt.

### What it delivers

**Compose broadcast** — accessible from the Presidents directory and from a new **Broadcasts** tab at `/admin/programme/broadcasts`

- **Recipient scope:** All presidents / Country / Individual chapter
- **Subject + body** (rich text, max 2000 characters)
- **Type:** `announcement` (programme news) / `action_required` (president must do something) / `check_in` (informal)
- **Preview** before sending

**Broadcasts tab — sent messages list**
- Columns: subject, type, recipient scope, sent date, read rate (recipients who have opened / total)
- Clicking a row shows the full message and a per-chapter read status table

**President read experience**
- Broadcasts appear as a notification in the president's existing notification feed (using the existing `notifications` table and `notification_type` system)
- `action_required` broadcasts also appear as a banner in the Embassy Leadership tab until acknowledged

**Pinned programme notices**
- One broadcast can be marked as `pinned` — it appears at the top of every Embassy Leadership tab for all active presidents until unpinned by the core team

### New tables needed
- `admin_broadcasts (id, subject, body, type, recipient_scope, scope_value, sent_by, sent_at, pinned)`
- `admin_broadcast_reads (broadcast_id, recipient_user_id, read_at)`

### New RPC needed
- `send_admin_broadcast` — creates the broadcast row, resolves recipients by scope, inserts notification rows for each, enforces rate limit (max 3 broadcasts per day)

---

## Phase 4 Summary

**Completed:** 2026-05-20

No deviations. All tasks delivered as planned.

**Specs updated:**
- `docs/AI_STATUS.md` — updated current phase.

---

## [x] Phase 5 — Coverage Gap Prioritisation

**Goal:** Upgrade the existing locality coverage map into a prioritised list of where the programme should expand next, and make it actionable in one click.

### What it delivers

**Replaces** the current coverage tab's locality table with a prioritised gap view:

**Gap table (filterable)**
- Rows: cities with > 10 buildings in the catalogue that have no chapter and no forming effort
- Columns: city, country, building count, estimated population (sourced from locality metadata if available), gap score (building count weighted)
- Sorted by gap score descending by default
- Filter by: country, minimum building count

**Create chapter from gap row**
- Each row has a **Create forming chapter** button
- Clicking opens a pre-filled chapter creation dialog (name auto-suggested as "Plano [City]", type = `local`, status = `forming`, locality pre-selected)
- After creation, the row moves out of the gap table and into the forming chapters view on the Health Dashboard

**Existing coverage map**
- The visual map view is preserved as a secondary tab for geographic orientation

### Changes to existing code
- `AmbassadorCoverage.tsx` — add a new "Gaps" tab alongside the existing tabs; the gap table is a new component
- Reuse `get_admin_ambassador_locality_coverage` RPC if it already returns building counts; otherwise extend it to include `has_chapter` and `has_forming_chapter` booleans

---

## Phase 5 Summary

**Completed:** 2026-05-21

**Deviations:**
- Population column not included — the `localities` table has no population field; column omitted rather than showing all-zeroes.
- Old "Opportunities" tab removed from `AmbassadorCoverage.tsx` — the new "Coverage gaps" tab supersedes it with lower threshold (> 10 buildings vs ≥ 20), filters, gap score column, and per-row chapter creation.
- No new migration required — the existing `get_admin_ambassador_locality_coverage` RPC already returns all data needed; gap logic computed client-side.

---

## [x] Phase 6 — Chapter Performance Ranking

**Goal:** Give the core team a ranked, side-by-side comparison of all chapters over a selectable period, to inform where to invest support and where to celebrate success.

### What it delivers

A new tab — **Rankings** — at `/admin/programme/rankings`:

**Period selector:** Last 7 days / 30 days / 90 days / All time

**Ranked table**
- Columns: rank, chapter name, country, type (local/national), member count, edits, photos added, new members, applications approved, last activity date
- Sortable by any column
- Row highlight for top 10% by overall score
- Row muted for chapters with zero activity in the period

**Chapter score**
- A composite score displayed alongside each chapter: `(edits × 1) + (photos × 2) + (new members × 5)`
- Weights are hardcoded initially; can be made configurable in a later iteration

**Export**
- CSV export of the current table view for programme reports

### Data sources
- `building_audit_logs` — edits and photos, filtered by `created_at` within the period and scoped to chapter geography
- `ambassador_memberships` — new members (by `created_at`)
- `ambassador_applications` — approved count

### New RPC needed
- `get_chapter_performance_ranking(period_days int)` — returns all chapters with their metrics for the given period

---

## Phase 6 Summary

**Completed:** 2026-05-21

No deviations. All tasks delivered as planned.

**Specs updated:**
- `docs/AI_STATUS.md` — updated current phase.

---

## [x] Phase 7 — President Onboarding Tracker

**Goal:** Ensure newly assigned chapter presidents complete their setup, and give the core team visibility into who is stuck.

### What it delivers

**Onboarding checklist — president view**
A new card appears in the Embassy Leadership tab for presidents who have been in role for < 60 days and have not completed all steps:

| Step | Completion condition |
|---|---|
| Profile complete | `profiles.avatar_url` is set and `profiles.bio` is non-empty |
| Chapter status active | `ambassador_chapters.status = 'active'` |
| First member invited | Chapter has at least 2 active members (including president) |
| First application reviewed | At least one application for the chapter has been approved or rejected |
| First task reviewed | President has at least one `building_audit_log` entry |

Completed steps are checked off; incomplete steps show a direct action link.

**Core team view — onboarding tracker table**
Added to the Presidents tab (Phase 2) as a sub-view filtered to presidents within their first 60 days:
- Columns: president, chapter, days in role, steps completed (e.g. 3/5), last active
- Sorted by days in role descending so the most overdue show first
- Clicking a row shows the full checklist state

### Data sources
- All completion conditions are derived from existing tables — no new data model needed

### New RPC needed
- `get_president_onboarding_status(membership_id uuid)` — evaluates and returns the checklist state for a given president membership

---

## Phase 7 Summary

**Completed:** 2026-05-21

No deviations. All tasks delivered as planned.

**Specs updated:**
- `docs/AI_STATUS.md` — updated current phase.

---

## Implementation order and rationale

| Phase | Priority | Rationale |
|---|---|---|
| 1 — Health Dashboard | Ship first | Immediate daily utility; establishes the `/admin/programme` section and the shared data patterns all later phases build on |
| 3 — Intervention Queue | Ship second | Prevents the programme from silently degrading; high value even with a small chapter count |
| 2 — President Directory | Ship third | The core team needs to see and contact presidents before broadcasting to them |
| 4 — Broadcasts | Ship fourth | Requires the directory to exist (Phase 2) and the intervention flags to know who to contact (Phase 3) |
| 5 — Coverage Gaps | Ship fifth | Strategic and valuable, but lower urgency than operational health |
| 6 — Rankings | Ship sixth | Useful once there are enough chapters to compare meaningfully (target: 10+ active chapters) |
| 7 — President Onboarding | Ship last | Relevant once the programme is onboarding new presidents regularly; low urgency at small scale |

---

## Routes summary

| Route | Phase | Description |
|---|---|---|
| `/admin/programme` | 1 | Redirects to `/admin/programme/health` |
| `/admin/programme/health` | 1 | Programme health dashboard |
| `/admin/programme/interventions` | 3 | Automated flag queue |
| `/admin/programme/presidents` | 2 | President directory with slide-out detail |
| `/admin/programme/broadcasts` | 4 | Broadcast composer and sent message history |
| `/admin/programme/rankings` | 6 | Chapter performance ranking table |
| `/admin/ambassadors/coverage` | 5 | Extended with Gaps tab (upgrade to existing route) |

---

## Phase 1 Summary

**Completed:** 2026-05-20

No deviations. All tasks delivered as planned.

**Specs updated:**
- `docs/DATA_CONTRACT.md` — added Phase 6 section documenting `get_programme_health_summary()` RPC, DTO shapes, and new routes.

---

## What this roadmap deliberately excludes

- **Individual building moderation** — belongs in `/admin/moderation`, not here
- **Ambassador-level management** — the Embassy and existing `/admin/ambassadors/:chapterId` cover this
- **Content quality tools** — a separate concern from programme coordination
- **Points, leaderboards, or gamification** — the ambassador rewards roadmap is a separate document
