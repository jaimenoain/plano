# Remaining Surfaces Roadmap

Use this document as the **master checklist** for design refinement **after** [ROADMAP.md](ROADMAP.md) (Phases R0–R9). Mark each phase `[x]` when that phase is fully complete (all sub-tasks done, exit criteria met, per-page audit rows written).

**Predecessor:** [ROADMAP.md](ROADMAP.md) closed on 2026-05-24. It refined route **families** using pattern passes (`embassy-ui`, `admin-ui`, editorial spine kits) and **minimum** audit samples (e.g. three embassy routes, four admin groups). This programme finishes **every route and authoring surface** that was out of scope, unnamed, or never received a dedicated audit row.

**Scope:** **Frontend only** — React components, layout, Tailwind tokens, client UI states. No migrations, RLS, edge functions, or env/secrets unless a page is blocked by missing data (log in [AI_STATUS.md](AI_STATUS.md); do not fix in this programme).

**Execution:** **Agent-autonomous** (same rules as R0–R9). Run `npm run typecheck`, `npm run lint`, and `npm run build` before marking any phase `[x]`. Optional browser MCP at programme end only.

**Evidence:** One audit row per route in [DESIGN_SYSTEM_PAGE_AUDITS.md](DESIGN_SYSTEM_PAGE_AUDITS.md) with **Refinement** = `refined` (not “batch” or “pattern only”).

---

## What this programme covers (gap analysis)

### Category A — Never named in ROADMAP.md

These routes/files were absent from R0–R9 task lists. They need a full refinement pass, not just verification.

| Route | Primary file | Complexity |
|---|---|---:|
| `/add-building` | `src/features/buildings/pages/AddBuilding.tsx` | H |
| `/building/:id/edit`, `/building/:id/:slug/edit` | `src/features/buildings/pages/EditBuilding.tsx` | H |
| `/building/:id/note/:postId/edit` | `src/features/buildings/pages/EditNote.tsx` | M |
| `/award/:slug/admin` | `src/features/awards/pages/AwardAdminPage.tsx` | H |
| `/admin/merge`, `/admin/merge/:entityType/:targetId/:sourceId` | `MergeEntities.tsx`, `MergeComparisonEntities.tsx` | H |
| `/admin/system` | `src/pages/AdminSystemPlaceholder.tsx` | L |
| `/superadmin/cards` | `src/features/superadmin/pages/CardPlayground.tsx` | M |
| `*` (not found) | `src/pages/NotFound.tsx` | L |
| Shared | `src/features/buildings/components/BuildingForm.tsx`, `BuildingLocationPicker.tsx` | H |

### Category B — Named in ROADMAP.md but no dedicated audit row

Pattern components (`admin-ui`, `embassy-ui`) may already apply. Each route still needs **per-page audit**, all UI states verified, and any gaps fixed.

**Embassy**

| Route | File |
|---|---|
| `/embassy/projects` | `ChapterProjects.tsx` |
| `/embassy/team` | `Team.tsx` |
| `/embassy/tasks` | `Tasks.tsx` |
| `/embassy/welcome` | `Onboarding.tsx` (embassy) |

**Admin** (representative routes — all rows in [Gap route checklist](#gap-route-checklist-full-list))

| Area | Routes |
|---|---|
| Moderation & media | `/admin/images`, `/admin/photos`, `/admin/audit` |
| Entities | `/admin/buildings`, `/admin/claims`, merge |
| Credits | `/admin/credits/flagged`, `/admin/credits/people`, `/admin/credits/companies` |
| Ambassadors | `/admin/ambassadors`, applications, coverage, campaigns, `:chapterId` |
| Programme | `/admin/programme/health`, presidents, interventions, broadcasts, rankings |
| Awards CMS | list, detail, editions, claims, suggestions (+ forms) |
| Content & system | `/admin/updates*`, `/admin/events`, `/admin/api-requests`, `/admin/storage-jobs`, `/admin/feedback` |

**Public / content** (listed in R5 but not individually audited)

| Route | File |
|---|---|
| `/events/:slug/edit` | `SubmitEvent.tsx` (edit mode) |
| `/award/:slug/:editionSlug` | `AwardEditionPage.tsx` |
| `/become-ambassador`, `/ambassador-portal` | `BecomeAmbassador.tsx`, `AmbassadorPortal.tsx` |

### Category C — Out of scope (do not refine)

| Item | Reason |
|---|---|
| `/admin/programme` | Redirect only (`ProgrammeRedirect.tsx`) |
| `/architect/*` redirects | HTTP redirects, no UI |
| `/locality/:slug` | Legacy redirect (`LocalityRedirect.tsx`) |
| API resource routes (`/api/*`) | Not UI |
| `src/components/layout/Header.tsx` | Legacy; grep for usages — remove or fold into shell in a separate cleanup task if unused |

---

## Gap route checklist (full list)

Tick each route in [DESIGN_SYSTEM_PAGE_AUDITS.md](DESIGN_SYSTEM_PAGE_AUDITS.md) as phases complete.

| # | Route | File | Phase | Audited |
|---:|---|---|---|:---:|
| 1 | `/add-building` | `AddBuilding.tsx` | P1 | [x] |
| 2 | `/building/:id/edit` | `EditBuilding.tsx` | P1 | [x] |
| 3 | `/building/:id/note/:postId/edit` | `EditNote.tsx` | P1 | [x] |
| 4 | Building form shared | `BuildingForm.tsx`, `BuildingLocationPicker.tsx` | P1 | [x] |
| 5 | `/award/:slug/admin` | `AwardAdminPage.tsx` | P2 | [x] |
| 6 | `/award/:slug/:editionSlug` | `AwardEditionPage.tsx` | P2 | [x] |
| 7 | `/events/:slug/edit` | `SubmitEvent.tsx` | P2 | [x] |
| 8 | `/become-ambassador` | `BecomeAmbassador.tsx` | P3 | [x] |
| 9 | `/ambassador-portal` | `AmbassadorPortal.tsx` | P3 | [x] |
| 10 | `/embassy/projects` | `ChapterProjects.tsx` | P4 | [x] |
| 11 | `/embassy/team` | `Team.tsx` | P4 | [x] |
| 12 | `/embassy/tasks` | `Tasks.tsx` | P4 | [x] |
| 13 | `/embassy/welcome` | `Onboarding.tsx` | P4 | [x] |
| 14 | `/admin/images` | `ImageWall.tsx` | P5 | [x] |
| 15 | `/admin/photos` | `PhotoAnalytics.tsx` | P5 | [x] |
| 16 | `/admin/audit` | `BuildingAudit.tsx` | P5 | [x] |
| 17 | `/admin/buildings` | `Buildings.tsx` | P6 | [x] |
| 18 | `/admin/claims` | `EntityClaims.tsx` | P6 | [x] |
| 19 | `/admin/merge` | `MergeEntities.tsx` | P6 | [x] |
| 20 | `/admin/merge/.../compare` | `MergeComparisonEntities.tsx` | P6 | [x] |
| 21 | `/admin/credits/flagged` | `FlaggedCredits.tsx` | P6 | [x] |
| 22 | `/admin/credits/people` | `AdminPeople.tsx` | P6 | [x] |
| 23 | `/admin/credits/companies` | `AdminCompanies.tsx` | P6 | [x] |
| 24 | `/admin/ambassadors` | `AmbassadorChapters.tsx` | P7 | [x] |
| 25 | `/admin/ambassadors/applications` | `AmbassadorApplications.tsx` | P7 | [x] |
| 26 | `/admin/ambassadors/coverage` | `AmbassadorCoverage.tsx` | P7 | [x] |
| 27 | `/admin/ambassadors/campaigns` | `AmbassadorCampaigns.tsx` | P7 | [x] |
| 28 | `/admin/ambassadors/:chapterId` | `AmbassadorChapterDetail.tsx` | P7 | [x] |
| 29 | `/admin/programme/health` | `ProgrammeHealth.tsx` | P7 | [x] |
| 30 | `/admin/programme/presidents` | `ProgrammePresidents.tsx` | P7 | [x] |
| 31 | `/admin/programme/interventions` | `ProgrammeInterventions.tsx` | P7 | [x] |
| 32 | `/admin/programme/broadcasts` | `ProgrammeBroadcasts.tsx` | P7 | [x] |
| 33 | `/admin/programme/rankings` | `ProgrammeRankings.tsx` | P7 | [x] |
| 34 | `/admin/awards` | `AwardsList.tsx` | P8 | [x] |
| 35 | `/admin/awards/:awardId` | `AwardDetail.tsx` | P8 | [x] |
| 36 | `/admin/awards/new`, `.../edit` | `AwardForm.tsx` | P8 | [x] |
| 37 | `/admin/awards/.../editions/new` | `EditionForm.tsx` | P8 | [x] |
| 38 | `/admin/awards/.../editions/:editionId` | `EditionDetail.tsx` | P8 | [x] |
| 39 | `/admin/awards/claims` | `AwardClaimRequests.tsx` | P8 | [x] |
| 40 | `/admin/awards/suggestions` | `AwardSuggestions.tsx` | P8 | [x] |
| 41 | `/admin/awards/suggestions/:id` | `AwardSuggestionDetail.tsx` | P8 | [x] |
| 42 | `/admin/updates` | `UpdatesList.tsx` | P9 | [x] |
| 43 | `/admin/updates/new`, `/:updateId` | `UpdateForm.tsx` | P9 | [x] |
| 44 | `/admin/events` | `AdminEvents.tsx` | P9 | [x] |
| 45 | `/admin/api-requests` | `ApiRequests.tsx` | P9 | [x] |
| 46 | `/admin/storage-jobs` | `StorageJobs.tsx` | P9 | [x] |
| 47 | `/admin/feedback` | `Feedback.tsx` | P9 | [x] |
| 48 | `/admin/system` | `AdminSystemPlaceholder.tsx` | P9 | [x] |
| 49 | `*` | `NotFound.tsx` | P10 | [x] |
| 50 | `/superadmin/cards` | `CardPlayground.tsx` | P10 | [x] |

**Already audited in R0–R9 (do not duplicate unless regression):** shells, editorial spine, discovery sample, identity sample, events list/detail/new, awards index/detail (batch), folder/updates/about/terms/support, auth/token flows, embassy contribute/goals/leadership, admin dashboard/moderation/users/award-form batch.

---

## Standards (inherited from R0–R9)

Apply the same rules as [ROADMAP.md](ROADMAP.md):

- Semantic tokens only; no raw Tailwind palette in feature code
- Editorial pages: no card chrome on content; `rounded-none` on photos
- Operational pages (embassy/admin/forms): `admin-ui` / `embassy-ui` / form spec patterns from [COMPONENT_SPEC.md](COMPONENT_SPEC.md)
- All states: `idle`, `loading`, `error`, `empty`, `success` (and permission-denied where applicable)
- UI-only diffs — no auth/RLS/API contract changes

**Form-heavy surfaces (P1, P2, P8, P9):** Use `border-t` section labels, `AdminFormLabel` / uppercase tracked labels, feedback tokens for errors — not default `Card` stacks.

---

## Programme phases

Phases are **sequential**. Do not mark a later phase `[x]` while an earlier phase is still `[ ]`.

---

### [x] Phase P0 — Programme setup and gap sign-off

**Goal:** Make remaining work measurable and prevent duplicate effort with R0–R9.

**Tasks:**

- [x] P0.1 — Add **Remaining surfaces** tracker column to [DESIGN_SYSTEM_SCREEN_INVENTORY.md](DESIGN_SYSTEM_SCREEN_INVENTORY.md) (values: `not started` / `in progress` / `refined` / `n/a`)
- [x] P0.2 — Copy [Gap route checklist](#gap-route-checklist-full-list) statuses into inventory rows
- [x] P0.3 — Add **Phase P*** column to audit log template in [DESIGN_SYSTEM_PAGE_AUDITS.md](DESIGN_SYSTEM_PAGE_AUDITS.md)
- [x] P0.4 — Note in [AI_STATUS.md](AI_STATUS.md) that successor programme P0–P10 is active (one paragraph under Current Phase)
- [x] P0.5 — Grep `Header.tsx` usages; if zero, log removal as `KNOWN_ISSUES` deferral (do not delete in P0)

**Exit criteria:** Inventory + audits link here; checklist table exists; docs only.

**Mark phase `[x]` when:** All P0 sub-tasks are `[x]`.

---

### [x] Phase P1 — Building authoring

**Goal:** Add, edit, and note flows match building detail editorial quality — same typography, form sections, and map/location chrome.

**Why it matters:** Contributors and ambassadors create catalogue records here; these screens were never in the R2 building-detail phase.

**Kit reference:** [COMPONENT_SPEC.md](COMPONENT_SPEC.md) form + building detail sections; `BuildingDetail.jsx` for typographic tone

**Tasks:**

- [x] P1.1 — **AddBuilding.tsx** — Page head; multi-step or single-page layout; map picker chrome; empty/validation states
- [x] P1.2 — **EditBuilding.tsx** — Parity with add flow; owner vs moderator affordances; save/error states
- [x] P1.3 — **EditNote.tsx** — Narrow editorial column; image upload row; minimal chrome
- [x] P1.4 — **BuildingForm.tsx** + **BuildingLocationPicker.tsx** — Shared fields: labels, inputs, map control tokens (no raw palette)
- [x] P1.5 — Audit rows for routes 1–4 in [gap checklist](#gap-route-checklist-full-list)

**Exit criteria:** All four checklist rows audited; typecheck/lint/build pass.

**Mark phase `[x]` when:** All P1 sub-tasks are `[x]`.

---

### [x] Phase P2 — Awards portal and event edit

**Goal:** Award-owner portal and edition pages feel operational but on-brand; event edit reuses submit form patterns.

**Tasks:**

- [x] P2.1 — **AwardAdminPage.tsx** — Tab shell; tables; claim/suggestion states; semantic badges only
- [x] P2.2 — **AwardEditionPage.tsx** — Recipient grid; trophy monochrome; verify against R5 award public pages
- [x] P2.3 — **SubmitEvent.tsx** (edit mode `/events/:slug/edit`) — Same `FormSection` pattern as create; pre-filled state; error banner
- [x] P2.4 — Audit rows for routes 5–7

**Exit criteria:** Three routes + edit mode verified; build passes.

**Mark phase `[x]` when:** All P2 sub-tasks are `[x]`.

---

### [x] Phase P3 — Ambassador marketing pages

**Goal:** Recruitment surfaces match landing editorial tone (R2 / R5.8 intent) with per-page evidence.

**Tasks:**

- [x] P3.1 — **BecomeAmbassador.tsx** — Hero, steps, CTA hierarchy; no filled primary on editorial blocks
- [x] P3.2 — **AmbassadorPortal.tsx** — Link grid or dashboard; typography scale
- [x] P3.3 — Audit rows for routes 8–9

**Exit criteria:** Both routes audited; build passes.

**Mark phase `[x]` when:** All P3 sub-tasks are `[x]`.

---

### [x] Phase P4 — Embassy workspace (remaining routes)

**Goal:** Complete embassy refinement with per-page audits for projects, team, tasks, and welcome — not only pattern components.

**Tasks:**

- [x] P4.1 — **ChapterProjects.tsx** — Project cards; task drawer; draft inbox; inline edit sheets
- [x] P4.2 — **Team.tsx** — Role groups (`global_team`, `global_leaders`, etc.); member rows
- [x] P4.3 — **Tasks.tsx** — Task list; filters; detail drawer (align with projects drawer patterns)
- [x] P4.4 — **Onboarding.tsx** (embassy `/welcome`) — Tool picker; step copy; completion states
- [x] P4.5 — Audit rows for routes 10–13; confirm `EmbassyPageHeader` on all four

**Exit criteria:** Four embassy routes each have audit row; `embassy-ui` consistent.

**Mark phase `[x]` when:** All P4 sub-tasks are `[x]`.

---

### [x] Phase P5 — Admin moderation and media ops

**Goal:** Image wall, photo analytics, and building audit tools share admin table/head patterns from R8.

**Tasks:**

- [x] P5.1 — **ImageWall.tsx** — Grid density; selection chrome; loading skeletons
- [x] P5.2 — **PhotoAnalytics.tsx** — Charts/tables on tokens; no raw chart greys
- [x] P5.3 — **BuildingAudit.tsx** — Log table; filters; row expand if present
- [x] P5.4 — Audit rows for routes 14–16

**Mark phase `[x]` when:** All P5 sub-tasks are `[x]`.

---

### [x] Phase P6 — Admin entity and credits ops

**Goal:** Buildings, claims, merge, and credits admin queues are fully audited operational surfaces.

**Tasks:**

- [x] P6.1 — **Buildings.tsx** — Search/table; row actions; empty state
- [x] P6.2 — **EntityClaims.tsx** — Claim queue; status badges semantic
- [x] P6.3 — **MergeEntities.tsx** + **MergeComparisonEntities.tsx** — Step UI; diff layout; destructive actions use feedback-destructive
- [x] P6.4 — **FlaggedCredits.tsx**, **AdminPeople.tsx**, **AdminCompanies.tsx** — Table heads; slide-outs if any
- [x] P6.5 — Audit rows for routes 17–23

**Mark phase `[x]` when:** All P6 sub-tasks are `[x]`.

---

### [x] Phase P7 — Admin programme and ambassadors

**Goal:** Programme health/presidents/interventions/broadcasts/rankings and ambassador admin routes each documented.

**Tasks:**

- [x] P7.1 — **ProgrammeHealth.tsx** — Pulse cards; chart tokens; flagged list
- [x] P7.2 — **ProgrammePresidents.tsx** — Directory table; onboarding slide-out
- [x] P7.3 — **ProgrammeInterventions.tsx** — Flag cards; dismiss/snooze controls
- [x] P7.4 — **ProgrammeBroadcasts.tsx** — Composer; read-status table
- [x] P7.5 — **ProgrammeRankings.tsx** — Sortable table; CSV export button style
- [x] P7.6 — Ambassador admin cluster — **AmbassadorChapters.tsx**, **AmbassadorCoverage.tsx**, **AmbassadorCampaigns.tsx**, **AmbassadorChapterDetail.tsx**, **AmbassadorApplications.tsx**
- [x] P7.7 — Audit rows for routes 24–33

**Mark phase `[x]` when:** All P7 sub-tasks are `[x]`.

---

### [x] Phase P8 — Admin awards CMS

**Goal:** Every awards admin route (not only `AwardForm.tsx` sample from R8) has layout verification and audit row.

**Tasks:**

- [x] P8.1 — **AwardsList.tsx** + **AwardDetail.tsx** — List/detail heads; claim_status column
- [x] P8.2 — **AwardForm.tsx** — Verify create + edit routes; no regression from R8 sample
- [x] P8.3 — **EditionForm.tsx** + **EditionDetail.tsx** — Edition workflow; recipient management UI
- [x] P8.4 — **AwardClaimRequests.tsx**, **AwardSuggestions.tsx**, **AwardSuggestionDetail.tsx** — Queues; approve/reject tokens
- [x] P8.5 — Audit rows for routes 34–41

**Mark phase `[x]` when:** All P8 sub-tasks are `[x]`.

---

### [x] Phase P9 — Admin content and system tools

**Goal:** Updates CMS, events discover, API monitor, storage, feedback, and system placeholder aligned with admin patterns.

**Tasks:**

- [x] P9.1 — **UpdatesList.tsx** + **UpdateForm.tsx** — CMS list; markdown/body field layout
- [x] P9.2 — **AdminEvents.tsx** — Discovery UI; result rows
- [x] P9.3 — **ApiRequests.tsx** — Stat cards; log table; detail drawer (verify drawer tokens)
- [x] P9.4 — **StorageJobs.tsx** + **Feedback.tsx** — Operational tables; status chips semantic
- [x] P9.5 — **AdminSystemPlaceholder.tsx** — Calm empty/placeholder state (even if minimal copy)
- [x] P9.6 — Audit rows for routes 42–48

**Mark phase `[x]` when:** All P9 sub-tasks are `[x]`.

---

### [x] Phase P10 — Utility surfaces and programme closure

**Goal:** Error and internal playground pages on-brand; full checklist signed off.

**Tasks:**

- [x] P10.1 — **NotFound.tsx** — Editorial 404; text CTA home; works inside MainLayout
- [x] P10.2 — **CardPlayground.tsx** — Token demo only; label as internal; no production drift
- [x] P10.3 — Audit rows for routes 49–50
- [x] P10.4 — [Gap route checklist](#gap-route-checklist-full-list): all **Audited** columns `[x]`
- [x] P10.5 — Run automated verification (below); append **Remaining Surfaces Summary**
- [x] P10.6 — Update [AI_STATUS.md](AI_STATUS.md) — P0–P10 complete; link summary
- [x] P10.7 — Mark all phase headers P0–P10 `[x]` in this file

**Mark phase `[x]` when:** All P10 sub-tasks are `[x]` — **programme complete**.

---

## Tracking

| Phase | Focus | Routes (count) | Status |
|---|---|---:|---|
| P0 | Setup | — | complete |
| P1 | Building authoring | 4 | complete |
| P2 | Awards portal + event edit | 3 | complete |
| P3 | Ambassador marketing | 2 | complete |
| P4 | Embassy remainder | 4 | complete |
| P5 | Admin media/moderation | 3 | complete |
| P6 | Admin entity/credits | 7 | complete |
| P7 | Programme + ambassadors | 10 | complete |
| P8 | Awards CMS | 8 | complete |
| P9 | Admin system/CMS | 7 | complete |
| P10 | Utility + closure | 2 | complete |

**Total gap routes:** 50 checklist rows (47 user-facing + 2 utility + 1 shared form group).

---

## Automated verification (programme end)

Run once after P0–P9 are `[x]`, before marking P10 `[x]`.

### Build and static analysis

- [x] PV.1 — `npm run typecheck` passes
- [x] PV.2 — `npm run lint` passes
- [x] PV.3 — `npm run build` passes
- [x] PV.4 — Every row in [gap checklist](#gap-route-checklist-full-list) has **Audited** = `[x]`
- [x] PV.5 — `rg` shows no new raw palette in files touched in P1–P10
- [x] PV.6 — No unintended `console.log` in touched files

### Sample route verification (browser MCP or code parity)

- [x] PV.7 — `/add-building` — form sections and map control (code parity documented in P1 audit)
- [x] PV.8 — `/building/:id/edit` (one real building) (code parity documented in P1 audit)
- [x] PV.9 — `/award/:slug/admin` (if test award exists) or code audit documented (P2 audit)
- [x] PV.10 — `/embassy/tasks` and `/embassy/projects` (P4 audit)
- [x] PV.11 — `/admin/programme/health` and `/admin/awards` (P7/P8 audit)
- [x] PV.12 — Unknown URL → `NotFound.tsx` (P10 audit: `AppLayout` + editorial 404)

If browser MCP unavailable: document kit/code parity in audit **After** column and mark PV.7–PV.12 `[x]` only when audits are explicit.

---

## Remaining Surfaces Summary

| Field | Value |
|---|---|
| **Completion date** | 2026-05-24 |
| **Phases delivered** | P0–P10 (50 gap routes + shared building form components) |
| **Deferred routes** | None — all checklist rows audited |
| **Specs updated** | `DESIGN_SYSTEM_PAGE_AUDITS.md` (P1–P10 audit sections); `DESIGN_SYSTEM_SCREEN_INVENTORY.md` (all 50 rows `refined`); `AI_STATUS.md` (programme complete) |

---

## Related documents

| Document | Role |
|---|---|
| [ROADMAP.md](ROADMAP.md) | Completed family-level refinement (R0–R9) |
| [EXECUTOR_PROMPT.md](EXECUTOR_PROMPT.md) | Agent runner — point at **this file** once R0–R9 are complete |
| [DESIGN_SYSTEM_SCREEN_INVENTORY.md](DESIGN_SYSTEM_SCREEN_INVENTORY.md) | Full route/file list |
| [DESIGN_SYSTEM_PAGE_AUDITS.md](DESIGN_SYSTEM_PAGE_AUDITS.md) | Per-page evidence |
| [FEED_REDESIGN_ROADMAP.md](FEED_REDESIGN_ROADMAP.md) | Separate product work (ranker/mosaic) — not part of P0–P10 |

---

*Created: 2026-05-24 — Successor to design refinement R0–R9.*
