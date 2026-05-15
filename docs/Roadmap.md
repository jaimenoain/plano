# Plano — Ambassador Portal
## Implementation Roadmap
Version 1.0 · May 2026

---

## Context & guiding principles

This roadmap covers the build of the Plano Ambassador Portal — a dedicated space for chapter ambassadors, ExCo members, and presidents to contribute to the catalogue, track their progress, and coordinate with their chapter.

It is written as a "what to build" document. Claude Code has access to the repository and will determine implementation details. This document focuses on outcomes, not code.

### What the codebase already provides

A thorough audit of the repository confirmed that the vast majority of data infrastructure is already in place. The portal is primarily a frontend build over existing backend RPCs and data models.

| Already exists | Notes |
|---|---|
| `get_ambassador_buildings_without_photos` | Primary data source for the Photography map — no new RPC needed |
| `get_ambassador_buildings_missing_metadata` | Returns `missing_fields` array — drives Data & research filter chips directly |
| `get_ambassador_unclaimed_firms` | Powers the Architect outreach tool — no new RPC needed |
| `get_chapter_metrics` | Drives Leadership tab stats (member count, contribution count, etc.) |
| `PlanoMap` + clustering + popups | Photography map is a new "gap layer" on existing map infrastructure, not a new map |
| `ambassador_chapters`, `ambassador_memberships`, roles | Full ambassador data model exists — no schema changes needed for core portal |
| `building_audit_logs` + `admin_audit_logs` | Leaderboard attribution is already trackable from existing logs |
| `building_activity_rolling` (materialised view) | `photos_count` per building without a join — use for photo count thresholds |
| `taskFeed.ts` | Existing embassy task feed RPCs — portal reuses and extends, does not replace |

### Guiding principles

- Reuse existing RPCs wherever possible. Do not duplicate backend logic.
- The portal is a new surface (`/embassy` routes), not a replacement for existing admin tools.
- Keep new database schema additions minimal. New tables are only introduced where clearly necessary.
- Each phase is independently shippable — the portal should be usable after Phase 1 even without Phase 2 or 3.
- Focus on the "what", not the "how". Implementation decisions belong with the developer.

---

## Portal structure

The portal lives at `/embassy` and comprises five screens. Role-based visibility is enforced at the component and RPC level — ambassadors cannot access leadership routes.

| Screen | Description & visibility |
|---|---|
| Onboarding `/embassy/welcome` | First-time setup. Sets contributor type preference and first goal. Shown once on first approved login. All roles. |
| Contribute `/embassy/contribute` | Default landing page after onboarding. Hub of five contribution tools, each with the right interface for its job. All roles. |
| My goals `/embassy/goals` | Personal contribution targets (self-set), auto-tracked from audit logs. Monthly leaderboard scoped to chapter and contribution type. All roles. |
| Chapter projects `/embassy/projects` | Lightweight pinboard of collective campaigns and events. All ambassadors can view and join. ExCo and president can post. |
| Leadership `/embassy/leadership` | Chapter health dashboard — member activity, pending applications, chapter priorities. ExCo and president only. |

---

## [x] Phase 1 — Portal foundation

**Complexity: low — primarily frontend over existing RPCs**

Phase 1 delivers a complete, working portal. Every screen is present. The only tool not yet at full capability is Photography (map view comes in Phase 2 — Phase 1 renders it as a simple list as a placeholder). All other contribution tools are fully functional.

| Screen / feature | What to build | Backend | New? |
|---|---|---|---|
| Portal shell | Next.js route group at `/embassy` with shared nav (tab bar: Contribute / My goals / Chapter projects / Leadership). Auth-gated to approved `ambassador_memberships`. | `ambassador_memberships` role check | New |
| Onboarding flow | Three-step first-time screen: (1) welcome + badge confirmation, (2) contributor type picker (5 options, sets a profile preference field), (3) first goal selection from preset list. Shown once, skippable. | `contributor_type` field on `ambassador_memberships` (new field) | New |
| Data & research tool | Filterable list of buildings with metadata gaps. Filter chips map directly onto `missing_fields` array from `get_ambassador_buildings_missing_metadata`. Click row → open building edit. Sort by `tier_rank`. | `get_ambassador_buildings_missing_metadata` (exists) | Frontend only |
| Architect outreach tool | Filterable list of unclaimed firms and people in chapter geography. Filters: has website, 5+ buildings, active since year. Click → open profile + send claim invite. Logs outreach to prevent chapter duplicates. | `get_ambassador_unclaimed_firms` (exists). New: `outreach_log` table to track who contacted whom. | Frontend + 1 new table |
| Curation tool | List of well-documented buildings not yet in any collection, and areas with no walking itinerary. Links directly to existing collection creator and itinerary tool. | Query on buildings joined to collections — no new RPC needed. | Frontend only |
| Community tool | Activity feed showing new users in chapter geography and unclaimed architect profiles. Surfaces as a simple notification-style list. Links to user profile and architect profile. | Existing user location data + `get_ambassador_unclaimed_firms` | Frontend only |
| Photography tool (placeholder) | Phase 1 renders the Photography tool as a simple list (same data as the map, without the map UI). Labelled clearly as "map coming soon". Functional — ambassadors can use it immediately. | `get_ambassador_buildings_without_photos` (exists) | Frontend only |
| Chapter projects board | Pinboard of chapter campaigns and events. Ambassadors can view and express interest. ExCo/president can create and manage posts. Programme campaigns (from admin) appear with a distinct visual treatment. | New table: `chapter_projects`. FK to `ambassador_chapters`. Fields: title, description, type (event / campaign / outreach), dates, created_by. | New table |
| My goals | Ambassador sets 1–3 personal goals from a preset list (e.g. "add 10 photos this month"). Progress tracked automatically from `building_audit_logs` and `review_images` inserts. No manual logging. | New table: `ambassador_goals`. Query audit logs for progress. Resets monthly. | New table + query |
| Leaderboard | Monthly leaderboard scoped to chapter, filterable by contribution type (photography / data / outreach). Reads from `building_audit_logs` and `review_images`. Shows top contributors and the current user's rank. | Query on existing audit logs — no new tables. May benefit from a materialised view if query is slow at scale. | New query |
| Leadership tab | Member activity table (last 30 days), pending applications list, location-flagged members, chapter priority bars. President-only actions: invite member, change role, post chapter project. | `get_chapter_metrics` (exists). `ambassador_applications` (exists). `ambassador_memberships` (exists). | Frontend only |

### New database additions in Phase 1

| Table / field | Purpose |
|---|---|
| `ambassador_memberships.contributor_type` (field) | Stores contributor type preference (enum: photography / data / outreach / curation / community). Set during onboarding, editable in settings. |
| `chapter_projects` (table) | Stores chapter-level projects and events posted by ExCo/president. Fields: id, chapter_id, title, description, type, start_date, end_date, created_by, created_at. Separate join table `chapter_project_members` for expressing interest. |
| `ambassador_goals` (table) | Stores personal monthly goals. Fields: id, membership_id, goal_type (enum matching contribution types), target_value, month (date truncated to month). Progress computed at query time from audit logs. |
| `outreach_log` (table) | Tracks ambassador outreach to unclaimed firms/people. Fields: id, membership_id, entity_type (person/company), entity_id, contacted_at. Prevents duplicate outreach within a chapter. |

### Suggested build sequence within Phase 1

| Step | Why this order |
|---|---|
| [x] 1. Portal shell + auth gating | Everything else depends on the `/embassy` route group and role-based access existing first. |
| [x] 2. Leadership tab | Highest value to chapter presidents immediately. Almost entirely a frontend build — no new tables. |
| [x] 3. Data & research tool | Pure frontend over an existing RPC. Quick win that delivers real value to researcher ambassadors. |
| [x] 4. Architect outreach tool | Frontend over existing RPC + one small new table (`outreach_log`). Can ship without the log table initially if needed. |
| [x] 5. Onboarding flow | Requires `contributor_type` field on `ambassador_memberships`. Straightforward once the portal shell exists. |
| [x] 6. Chapter projects board | Requires the `chapter_projects` table. The most "social" feature — worth getting right rather than rushing. |
| [x] 7. My goals + leaderboard | Requires the `ambassador_goals` table and the audit log query. Can be developed in parallel with step 6. |
| [x] 8. Curation + community tools | Simplest tools. Build last in Phase 1 to ensure the higher-value tools are solid first. |
| [x] 9. Photography tool (list placeholder) | Trivial once the portal shell exists — same data as Data & research, different filter. Needed so the Contribute hub feels complete. |

---

## [x] Phase 2 — Photography map

**Complexity: medium — new map layer on existing infrastructure**

Phase 2 replaces the Photography tool placeholder with a proper map view. The underlying data already exists — this is a UI build that extends the existing `PlanoMap` infrastructure with a "gap layer".

| Screen / feature | What to build | Backend | New? |
|---|---|---|---|
| Photography map — gap layer | Add a "gap layer" to `PlanoMap` that renders building pins coloured by photo coverage: red (0 photos), amber (1–2 photos), green (3+ photos). Threshold values from `building_activity_rolling.photos_count`. Pin colour computed server-side or client-side from photo count. | `get_ambassador_buildings_without_photos` for red pins. `building_activity_rolling` for amber/green distinction. Extend existing `PlanoMap` + `MapContext`. | New layer on existing map |
| Filter chips on map | Three filter chips: No photos / Fewer than 3 photos / All gaps. Active filters update pin visibility without a new RPC call — filter client-side on already-fetched data within the viewport. | Client-side filter on existing data | Frontend only |
| Cluster callout | When zoomed out, show a callout for the densest cluster of gaps (e.g. "12 unphotographed buildings in Hackney — see list"). Computed server-side using existing `get_map_clusters_v3` infrastructure, filtered to gap buildings only. | `get_map_clusters_v3` (exists) — add gap filter parameter | Extend existing RPC |
| Mobile optimisation | Photography tool is the most mobile-used feature (ambassadors on the go). Map view should be touch-friendly: large tap targets on pins, bottom-sheet building preview on tap (reuse `BuildingPopupContent.tsx`), "Near me" filter using device geolocation for initial map centre only — not as a hard filter. | `BuildingPopupContent.tsx` (exists) | Frontend only |
| List / map toggle | Toggle between map view and the Phase 1 list view. Persists the active filters across both views. Useful for desk-based planning vs. in-field use. | Client-side state only | Frontend only |

---

## [ ] Phase 3 — Campaigns

**Complexity: low-to-medium — new admin UI + one new table**

Phase 3 adds the Campaigns feature: a mechanism for the Plano central team to coordinate all chapters simultaneously without per-chapter admin overhead. A campaign posted in the admin panel appears automatically in every chapter's projects board with a live progress counter.

> Campaigns can initially launch with manual progress reporting (a number the admin updates) and be upgraded to auto-tracking from audit logs in a later iteration. Ship the UI first.

| Screen / feature | What to build | Backend | New? |
|---|---|---|---|
| Admin campaigns tab `/admin/ambassadors/campaigns` | New tab in the ambassador admin panel. Central team can create a campaign: name, brief text, date range, target metric type (photos / edits / outreach), target value, and scope (all chapters or specific chapters). Campaigns are published to all in-scope chapter project boards automatically. | New table: `programme_campaigns`. Fields: id, title, description, start_date, end_date, metric_type, target_value, chapter_scope (all / specific), created_by. | New table |
| Campaign progress tracking | Progress counter on each campaign reads from `building_audit_logs` filtered by metric_type and date range. For photo campaigns: count of `review_images` inserts in the period. For edit campaigns: count of `building_audit_logs` rows. Computed at query time — no separate tracking table needed. | Query on existing audit logs scoped to campaign date range and chapter geography. | New query |
| Campaign display in portal | Campaigns appear in the Chapter projects board with a distinct visual treatment (e.g. left border accent, "Programme campaign" label). Show chapter-scoped progress vs. target. All chapters see the same campaign; progress shown is local to the user's chapter. | Reads `programme_campaigns` + progress query | Frontend only |
| Admin overview — chapter health | Revamp the `/admin/ambassadors` overview to surface a "Needs attention" callout (pending applications, location reviews, chapters without presidents) and a chapter health table (member count, contribution count, status). Replaces raw data tables with an action-oriented summary. | `get_chapter_metrics` (exists). `ambassador_applications` (exists). | Frontend only |

---

## Resolved design decisions

| Question | Decision |
|---|---|
| Public contributor profile — how much of "My goals" is visible publicly? | Show a contribution summary (e.g. "34 photos · 61 edits · London Chapter") and the Ambassador badge. Monthly goal progress is internal only. |
| Chapter projects — can ambassadors propose projects? | ExCo/president-only posting at launch. A proposal flow can be added in a later iteration if engagement warrants it. |
| Inter-chapter communication — portal or external tool? | External tool (Discord or WhatsApp) for informal chat. The portal handles structured coordination only. Out of scope for the portal. |
| Sponsorship / booster fund — where does a president request a grant? | Not in scope for the portal at launch. If adopted, a simple form in the Leadership tab pointing to an external process is sufficient. |
| Leaderboard — all-time vs. monthly? | Monthly resets to keep it motivating for newcomers. All-time totals shown on the public profile. Both read from the same audit log data. |
| Photography map — "near me" filter accuracy? | Use browser geolocation for initial map centre only, not as a hard filter. Ambassadors pan and zoom freely. |

---

*Plano Ambassador Portal Roadmap · v1.0 · May 2026*