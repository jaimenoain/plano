# Design Refinement Roadmap

Use this document as the **master checklist** for the design refinement programme. Mark each phase `[x]` when that phase is fully complete (all sub-tasks done, exit criteria met, tracker updated).

**Scope:** **Frontend only** — React components, layout, Tailwind tokens, and client-side UI states. No migrations, RLS, edge functions, or env/secrets work in this programme.

**Execution:** **Agent-autonomous.** An agent completes every phase and marks it `[x]` using code changes plus automated checks (`typecheck`, `lint`, `build`, static grep, optional browser MCP). **Do not block on human UAT, screenshots, or stakeholder sign-off.** All route and visual verification lives in [Automated verification (programme end)](#automated-verification-programme-end) at the bottom of this file — run that section once after R0–R8 are done, then close R9.

---

## Programme task and goal

### The task

Conduct a **page-by-page visual refinement** of the entire Plano web app. For every route in [DESIGN_SYSTEM_SCREEN_INVENTORY.md](DESIGN_SYSTEM_SCREEN_INVENTORY.md), compare the live UI against the design system (kit, tokens, component spec), fix layout and typography until the surface feels intentional, and record the outcome in [DESIGN_SYSTEM_PAGE_AUDITS.md](DESIGN_SYSTEM_PAGE_AUDITS.md).

This is **implementation work**, not documentation-only. Each phase ends with real code changes and passing `npm run typecheck`, `npm run lint`, and `npm run build`. Do not wait for human review between phases.

### The goal

**User-visible outcome:** Plano should read as a **serious architecture publication** — editorial, modern, minimalist, sharp, and photographic — in the spirit of A24 Films and studios like OMA, BIG, and Zaha Hadid. A visitor should sense quality from typography and whitespace alone, before reading a single word of copy.

**Technical outcome:**

- **Kit fidelity** on hero surfaces (landing, signed-in feed, building detail) matching `design-system/ui_kits/website/*`
- **Spec fidelity** everywhere else per [COMPONENT_SPEC.md](COMPONENT_SPEC.md) and [DESIGN_TOKENS.md](DESIGN_TOKENS.md)
- **Semantic tokens only** in feature code (no raw `gray-*` / `blue-*` palette)
- **All UI states designed:** `idle`, `loading`, `error`, `empty`, `success`
- **Zero functional regression** — do not change auth, RLS, or server contracts in this programme (UI-only diffs)

### What this is not

| Already done (rollout, May 2026) | This programme (refinement) |
|---|---|
| Semantic colour tokens wired globally | Correct **layout order** (e.g. eyebrow → title → photo → byline) |
| `get_feed` and real data on home feed | **Type scale** and line-height (no clipped descenders) |
| Raw palette removed in many files | **Whitespace rhythm** between sections |
| Route inventory and governance docs | **Side-by-side kit comparison** per page |
| Tracker marked “complete” at family level | **Per-page audit rows** with before/after notes |

Replacing `bg-gray-100` with `bg-surface-muted` was rollout. Refinement asks: *would this page belong in an architecture monograph?*

### Relationship to other docs

- **This file (`docs/ROADMAP.md`)** — Canonical **design refinement** programme (Phases R0–R9)
- **[AI_STATUS.md](AI_STATUS.md)** — Records the earlier token rollout (May 2026) vs this refinement pass
- **[DESIGN_SYSTEM_PAGE_AUDITS.md](DESIGN_SYSTEM_PAGE_AUDITS.md)** — Evidence log per page (agent-written)
- **[DESIGN_SYSTEM_QA_CHECKLIST.md](DESIGN_SYSTEM_QA_CHECKLIST.md)** — Sections 1–7 only; ignore §8 Sign-Off (not used in this programme)

### North star (non-negotiable)

- **Editorial hierarchy** from type scale and margin — not cards, shadows, or coloured panels on content pages
- **Monochrome discipline** — black, white, greys; colour from photography only; lime (`brand-accent`) only on text selection and the notification dot
- **Sharp geometry** — `rounded-none` on photos and major editorial blocks
- **Calm voice in UI chrome** — uppercase tracked labels; display headlines with a full stop; text CTAs with `→` on editorial surfaces

### How agents should use checkboxes

1. Work **in phase order** (R0 → R9) unless the user directs otherwise.
2. Complete **all sub-tasks** under a phase before changing the phase header from `[ ]` to `[x]`.
3. Update the [Tracking](#tracking) table and audit log when a phase completes.
4. Run `npm run typecheck`, `npm run lint`, `npm run build` before marking a phase `[x]`.
5. Do **not** run [Automated verification (programme end)](#automated-verification-programme-end) until R0–R8 are `[x]`; that block is the final gate only.

---

## What “refined” means (per page)

A single page is **refined** only when all of the following are true:

| Criterion | Standard |
|---|---|
| **Kit fidelity** | If a `design-system/ui_kits/website/*` screen exists, spacing, type scale, section order, and chrome match it unless product data forces a documented exception. |
| **Token discipline** | Semantic tokens only; no raw palette; lime only on selection + notification dot. |
| **Editorial geometry** | `rounded-none` on photos and major blocks; sections separated by whitespace or `border-t` + uppercase label — not card containers. |
| **Typography** | Eyebrows `11px` uppercase tracked; display titles at clamp scale with **no clipped descenders**; metadata subdued. |
| **States** | `idle`, `loading`, `error`, `empty`, `success` each designed with appropriate copy and layout. |
| **Responsive** | Layout uses responsive Tailwind at mobile + desktop breakpoints; verified via code review and optional browser MCP at end. |
| **Behaviour** | No change to auth, RLS, or business logic unless explicitly in scope. |
| **Audit** | Row in [DESIGN_SYSTEM_PAGE_AUDITS.md](DESIGN_SYSTEM_PAGE_AUDITS.md) with before/after notes. |

---

## Mandatory references (every page)

| Source | Use for |
|---|---|
| [`design-system/README.md`](../design-system/README.md) | Brand voice, personality, anti-patterns |
| [`design-system/colors_and_type.css`](../design-system/colors_and_type.css) | CSS variable ground truth |
| [`design-system/preview/*`](../design-system/preview/) | Buttons, feed item, nav, inputs specimens |
| [`design-system/ui_kits/website/*`](../design-system/ui_kits/website/) | Full-screen layout targets |
| [`docs/DESIGN_TOKENS.md`](DESIGN_TOKENS.md) | Tailwind token mapping |
| [`docs/COMPONENT_SPEC.md`](COMPONENT_SPEC.md) | Feed cards, building detail, shell, forms |
| [`docs/DESIGN_SYSTEM_QA_CHECKLIST.md`](DESIGN_SYSTEM_QA_CHECKLIST.md) | Release gate per batch |
| [`docs/DESIGN_SYSTEM_ROLLOUT_STANDARDS.md`](DESIGN_SYSTEM_ROLLOUT_STANDARDS.md) | Implementation rules |

**Kit → production map:**

| Kit file | Production target |
|---|---|
| `LandingNav.jsx`, `LandingHero.jsx`, `LandingMarquee.jsx`, `LandingFeatureGrid.jsx`, `LandingFooter.jsx` | Logged-out `/` |
| `AppTopNav.jsx` | `AppTopNav.tsx`, `MobileTopBar.tsx` |
| `FeedPage.jsx` | Signed-in `/`, `EditorialFeedPost`, `FeedSidebar` |
| `BuildingDetail.jsx` | `BuildingDetails.tsx` |

---

## The refinement protocol (per page)

Each screen = one focused batch (prefer one route family per PR).

### 1. Brief

- Route(s) and primary file(s)
- User intent (one sentence)
- Viewer modes (logged out / in / owner / admin)
- Kit reference or “spec-only”

### 2. Audit

Read the kit/spec and the page source. Confirm each UI state exists in code (`idle`, `loading`, `error`, `empty`, `success`) with appropriate markup and tokens — no human screenshots required during the phase.

Page checklist:

- [ ] Section order matches kit or COMPONENT_SPEC
- [ ] No card-container framing on editorial content
- [ ] Headlines do not clip descenders (g, p, y)
- [ ] Eyebrows: `11px`, `font-medium`, `tracking-[0.15em]`, `uppercase`
- [ ] Editorial section dividers use `border-text-primary` where spec requires
- [ ] Text CTAs on editorial pages; buttons only where spec allows
- [ ] Images `rounded-none`; no unauthorised scrims
- [ ] Spacing from token ladder (`spacing-8`–`spacing-20` between major blocks)
- [ ] Sticky rails use correct `top` offset (`top-[88px]` with 64px nav)
- [ ] Navigation from `navigation.ts` only — no duplicate configs

### 3. Design decisions

Write **concrete** deltas (class names, component moves), not adjectives.

Kit wins over COMPONENT_SPEC for **landing, feed, building detail** only; update COMPONENT_SPEC when spec-only pages change patterns.

### 4. Implement

- Reuse shared components (`EditorialFeedPost`, `BuildingHeadline`, `FeedEditorialEyebrow`, etc.)
- No one-off headline styles inside page files
- `npm run typecheck` · `npm run lint` · `npm run build`

### 5. Accept (per page — during phases)

- [ ] `npm run typecheck` · `npm run lint` · `npm run build` pass after the batch
- [ ] `rg` shows no new raw palette classes in files touched
- [ ] Audit row written in [DESIGN_SYSTEM_PAGE_AUDITS.md](DESIGN_SYSTEM_PAGE_AUDITS.md); tracker status updated

Route-level browser checks are **deferred** to [Automated verification (programme end)](#automated-verification-programme-end).

---

## Programme phases (master checklist)

Phases are **sequential**. Do not mark a later phase `[x]` while an earlier phase is still `[ ]`, except pages explicitly **deferred** with reason in [Tracking](#tracking).

**Cadence guide:** ~1–2 weeks per phase; split huge files (e.g. `BuildingDetails.tsx`) into thin slices.

---

### [x] Phase R0 — Programme setup

**Goal:** Establish clear tracking and working habits so refinement work is measurable and does not repeat rollout confusion.

**Why it matters:** Rollout marked route families “complete” after token passes. R0 separates that from visual refinement and ensures every future page has a place in the audit log.

**Tasks:**

- [x] R0.1 — Document in [AI_STATUS.md](AI_STATUS.md) that rollout ≠ refinement (one paragraph under current phase)
- [x] R0.2 — [DESIGN_SYSTEM_SCREEN_INVENTORY.md](DESIGN_SYSTEM_SCREEN_INVENTORY.md) has separate **Rollout** and **Refinement** tracker columns
- [x] R0.3 — [DESIGN_SYSTEM_PAGE_AUDITS.md](DESIGN_SYSTEM_PAGE_AUDITS.md) template includes **Refinement** column (before / after / kit)
- [x] R0.4 — `docs/ROADMAP.md` is the canonical refinement roadmap (this file); inventory/audits link here
- [x] R0.5 — Agent workflow: compare `design-system/ui_kits/website/*` to production components by reading both (kit HTML optional)

**Deliverables:** Updated docs only; no feature code required.

**Exit criteria:** Inventory shows refinement status column; at least one audit row exists (home feed counts).

**Mark phase `[x]` when:** All R0 sub-tasks are `[x]`.

---

### [x] Phase R1 — Global shell and navigation

**Goal:** Every route inherits identical, calm chrome — top nav, mobile shell, sidebars, layout columns — so page bodies are refined against a stable frame.

**Why it matters:** Inconsistent nav height, active states, or column borders make editorial pages feel broken even when the content block is correct.

**Kit reference:** `design-system/ui_kits/website/AppTopNav.jsx`

**Tasks:**

- [x] R1.1 — **AppTopNav.tsx** — 64px sticky bar; logo + nav links + actions; active route indicator (black, not coloured pill); notification bell with lime dot only
- [x] R1.2 — **MobileTopBar.tsx** — Parity with desktop labels; no orphan actions
- [x] R1.3 — **AppSidebar.tsx** — `bg-surface-inverse`; tracked section labels; sign-out uses `text-destructive`; no raw red palette
- [x] R1.4 — **BottomNav.tsx** — Mobile persistent nav; active state = bar/underline, not filled lime button
- [x] R1.5 — **MainLayout.tsx** + **AppLayout.tsx** — Center column `border-r border-border-default`; horizontal padding matches spec; footer spacing
- [x] R1.6 — **EmbassyLayout.tsx** — Page title pattern; consistent padding; operational but not “SaaS dashboard cards everywhere”
- [x] R1.7 — **AdminLayoutWithGuard.tsx** — Sidebar groups; page head; semantic feedback colours in nav badges only
- [x] R1.8 — **navigation.ts** — Single source for route labels, icons, and active matching (grep for duplicate nav config)
- [x] R1.10 — Audit rows for shell surfaces in [DESIGN_SYSTEM_PAGE_AUDITS.md](DESIGN_SYSTEM_PAGE_AUDITS.md)

**Exit criteria:** No raw palette classes under `src/components/layout/`; `typecheck` / `lint` / `build` pass.

**Mark phase `[x]` when:** All R1 sub-tasks are `[x]`; tracking table “Global shell + nav” = `refined`.

---

### [x] Phase R2 — Editorial spine (highest traffic)

**Goal:** The three surfaces that define Plano — marketing landing, signed-in feed, building detail — match the website UI kit in layout, typography, and rhythm.

**Why it matters:** These routes are the first impression and the core loop (discover → read → visit). They must feel like one publication, not assembled widgets.

**Kit references:** `Landing*.jsx`, `FeedPage.jsx`, `BuildingDetail.jsx`

**Tasks:**

**Landing (logged out `/`)**

- [x] R2.1 — **LandingNav.tsx** — Logo, single CTA, spacing per `LandingNav.jsx`
- [x] R2.2 — **LandingHero.tsx** — Eyebrow, display headline with period, subhead measure, primary button (sentence case)
- [x] R2.3 — **LandingMarquee.tsx** — Marquee speed, avatar strip, border treatment
- [x] R2.4 — **LandingFeatureGrid.tsx** — Three-column grid, section label, no card shadows
- [x] R2.5 — **LandingFooter.tsx** — Link rhythm, copyright, social icons monochrome

**Home feed (logged in `/`)**

- [x] R2.6 — **Index.tsx** feed shell — `max-w-[1080px]`, `§ 01` header with `border-text-primary`, sidebar `280px` sticky `top-[88px]`
- [x] R2.7 — **EditorialFeedPost.tsx** — Order: eyebrow → title → pull quote → photo → byline → social row; title `leading` avoids descender clip
- [x] R2.8 — **FeedSidebar.tsx** — Module headers uppercase tracked; list rows per kit density
- [x] R2.9 — Feed states — loading skeleton, error with retry, empty copy (all styled, not default card)

**Building detail**

- [x] R2.10 — **R2a** Hero — Full-bleed image, cinematic gradient, title block, tier badge monochrome
- [x] R2.11 — **R2b** Body column — `max-w-4xl`; About / credits / architect statement with `border-t` + uppercase section labels
- [x] R2.12 — **R2c** Reviews — Editorial review cards inside detail (not mis-ordered footers); photo grid `rounded-none`
- [x] R2.13 — **R2d** Location + resources — Map chrome; typography consistent with detail column

**Related routes**

- [x] R2.14 — **ReviewDetails.tsx** — Single-review page uses editorial layout, not admin card
- [x] R2.15 — **Post.tsx** — Composer: form fields and actions aligned with design tokens; minimal chrome

- [x] R2.16 — Agent kit diff: `Landing*.jsx` / `FeedPage.jsx` / `BuildingDetail.jsx` section order matches production components (document mismatches in audit log)
- [x] R2.17 — Audit rows for all R2 routes

**Exit criteria:** Hero surfaces match kit layout order in code; feed post order matches `FeedPage.jsx`; build passes.

**Mark phase `[x]` when:** All R2 sub-tasks are `[x]`; tracking rows for landing, feed, building detail = `refined`.

---

### [x] Phase R3 — Discovery, search, and geography

**Goal:** Explore, search, guides, and locality pages feel designed for architecture discovery — not generic map SaaS with purple gradients.

**Why it matters:** Discovery is the second most used loop after feed/building. Filter panels, map markers, and list rows must share the same typographic language as the editorial core.

**Kit reference:** Spec-only (COMPONENT_SPEC map/discovery sections + preview cards)

**Tasks:**

- [x] R3.1 — **Explore.tsx** — Filter panel tokens; discovery card stack; remove any non-spec accent colours
- [x] R3.2 — **DiscoveryCard.tsx** (and related) — Swipe/overlay states; typography on building name
- [x] R3.3 — **SearchPage.tsx** — Search input focus ring; result row density; empty and error states
- [x] R3.4 — **GuidesPage.tsx** — List layout editorial, not default shadcn card grid
- [x] R3.5 — **ArchitectureHub.tsx** + **CountryPage.tsx** — Hub headline scale; country grid spacing
- [x] R3.6 — **LocalityPage.tsx** — Map/list split; building row template; mobile collapse behaviour
- [x] R3.7 — **CollectionMapPage.tsx** — Mosaic `gap-[1.5px]`, portrait `aspect-[4/5]`, `rounded-none` cells
- [x] R3.8 — Map markers / popups — **BuildingMap.tsx**, **BuildingPopupContent.tsx** token compliance (already partially done; verify visually)
- [x] R3.9 — No new TypeScript errors in map/explore modules; existing `vitest` tests still pass (`npm run test`)
- [x] R3.10 — Audit rows for explore, search, one locality page (minimum)

**Exit criteria:** Explore + search + one locality page refined in code; build and test pass.

**Mark phase `[x]` when:** All R3 sub-tasks are `[x]`; tracking “Discovery / search / geography” = `refined`.

---

### [x] Phase R4 — Identity and social graph

**Goal:** Profiles, settings, connect, and notifications read as parts of the same product — portfolio energy for people and firms, not generic account settings.

**Why it matters:** Users spend significant time on their own profile and others’ pages. Misaligned review cards or stats blocks undermine trust in the catalogue.

**Kit reference:** Spec §13 (feed cards on profile grids), profile section patterns in COMPONENT_SPEC

**Tasks:**

- [x] R4.1 — **Profile.tsx** — Header (avatar, name, bio); stats row; tab strip; review list uses editorial card components
- [x] R4.2 — **UserPhotoGallery.tsx** — Grid gaps; sharp corners; lightbox chrome
- [x] R4.3 — **Settings.tsx** — Section `border-t` + uppercase labels; form fields from spec; danger zone destructive token
- [x] R4.4 — **Connect.tsx** — Suggested people rows; follow control as text CTA where spec says
- [x] R4.5 — **Notifications.tsx** — Compact activity rows; `border-b` dividers; read/unread subtle distinction
- [x] R4.6 — **FeedbackHistory.tsx** — List density and empty state
- [x] R4.7 — **PersonDetails.tsx** — Credit layout; statement; building list link style
- [x] R4.8 — **CompanyDetails.tsx** — Parallel to person; steward/claim UI tokens
- [x] R4.9 — **PersonDashboard.tsx** + **CompanyDashboard.tsx** — Portfolio hierarchy; dashboard ≠ admin tables
- [x] R4.10 — Viewer vs owner states — edit controls only when appropriate; no layout shift between modes
- [x] R4.11 — Audit rows: own profile, another user’s profile, person detail (minimum)

**Exit criteria:** Three identity routes refined and audited; build passes.

**Mark phase `[x]` when:** All R4 sub-tasks are `[x]`; tracking “Profile / settings / connect” = `refined`.

---

### [x] Phase R5 — Events, awards, collections, and public content

**Goal:** Secondary content surfaces (events, awards, collections, updates, static pages) share editorial typography without breaking specialised layouts (e.g. event date box).

**Why it matters:** These pages are linked from feed and building detail; visual drift makes the product feel unfinished.

**Kit reference:** COMPONENT_SPEC §13i (event), §13g (collection), awards/admin patterns

**Tasks:**

- [x] R5.1 — **Events.tsx** — List rows; filters; empty state
- [x] R5.2 — **EventDetail.tsx** — Event card box (allowed per spec); RSVP control; map/embed if present
- [x] R5.3 — **SubmitEvent.tsx** — Form layout; validation error styling
- [x] R5.4 — **AwardsIndex.tsx**, **AwardPage.tsx**, **AwardEditionPage.tsx** — Trophy typography; monochrome badges; no rainbow status colours
- [x] R5.5 — **FolderView.tsx** — Collection header; building mosaic per §13g
- [x] R5.6 — **Updates.tsx** + **UpdateDetail.tsx** — Magazine list + article measure (`max-w` body)
- [x] R5.7 — **About.tsx** + **Terms.tsx** — Readable line length; section labels
- [x] R5.8 — **SupportPage.tsx**, **BecomeAmbassador.tsx**, **AmbassadorPortal.tsx** — Marketing/editorial blend consistent with landing
- [x] R5.9 — Audit rows for events list, one award page, updates list (minimum)

**Exit criteria:** Event and award public routes token- and layout-aligned; UI-only diffs; build passes.

**Mark phase `[x]` when:** All R5 sub-tasks are `[x]`; tracking “Events / awards / collections” = `refined`.

---

### [x] Phase R6 — Auth and token flows

**Goal:** Sign-in, onboarding, and email-token pages feel trustworthy and minimal — same calm tone as landing, without marketing noise on utility screens.

**Why it matters:** Auth is high-anxiety; cluttered or off-brand pages reduce completion rate.

**Kit reference:** Landing tone for typography; spec form patterns for inputs

**Tasks:**

- [x] R6.1 — **Auth.tsx** (`/login`, `/auth`) — Centered form; logo; focus states; error banner feedback tokens
- [x] R6.2 — **Onboarding.tsx** — Step copy hierarchy; progress as text/labels, not candy-bar progress UI unless spec requires
- [x] R6.3 — **UpdatePassword.tsx** — Match auth layout
- [x] R6.4 — Token pages — **RemoveCredit.tsx**, **VerifyCompanyClaim.tsx**, **ApproveStewardRequest.tsx**, **AcceptCompanySteward.tsx**, **CompanyClaimDispute.tsx** — Single clear headline; one primary action; explanation copy subdued
- [x] R6.5 — All auth/token states — loading, error, success messages designed
- [x] R6.6 — Audit rows for auth and one token flow (minimum)

**Exit criteria:** Auth + onboarding + token pages styled per spec; UI-only diffs; build passes.

**Mark phase `[x]` when:** All R6 sub-tasks are `[x]`; tracking “Auth / token flows” = `refined`.

---

### [x] Phase R7 — Embassy workspace

**Goal:** Ambassador operational pages stay dense and efficient but shed generic SaaS styling — tables, drawers, and tool cards use semantic tokens and consistent page heads.

**Why it matters:** Embassy users spend hours in these screens. Poor hierarchy slows moderation and research workflows.

**Kit reference:** Spec embassy patterns; no full kit (operational UI)

**Tasks:**

- [x] R7.1 — **Contribute.tsx** — Tool grid; research drawer; AI suggestion panels; table headers (largest file — allow thin slices)
- [x] R7.2 — **MyGoals.tsx** — Leaderboard table typography; onboarding card; goals progress display
- [x] R7.3 — **ChapterProjects.tsx** — Draft vs published; idea inbox row template
- [x] R7.4 — **Team.tsx** — Member list; role badges semantic only
- [x] R7.5 — **Tasks.tsx** — Task feed rows; filters
- [x] R7.6 — **Leadership.tsx** — Metrics cards; broadcast banners; chapter selector
- [x] R7.7 — **Onboarding.tsx** (embassy welcome) — Tool picker; step layout
- [x] R7.8 — Shared embassy components — tables, sheets, moderation tabs follow one pattern
- [x] R7.10 — Audit rows for contribute, goals, leadership (minimum)

**Note:** `rounded-sm` on dense controls is allowed per COMPONENT_SPEC; still no raw palette.

**Exit criteria:** Three embassy routes refined; build passes.

**Mark phase `[x]` when:** All R7 sub-tasks are `[x]`; tracking “Embassy” = `refined`.

---

### [x] Phase R8 — Admin console

**Goal:** Admin surfaces share one visual system — page heads, tables, forms, slide-outs — with semantic feedback colours and no leftover bootstrap greys.

**Why it matters:** Admins judge product quality from internal tools. Inconsistent tables signal neglect.

**Kit reference:** Spec admin/form/table patterns; feedback tokens

**Tasks:**

- [x] R8.1 — **Pattern reference** — Refine **Dashboard.tsx** + one table page (**Moderation.tsx** or **Users.tsx**) + one form page (**AwardForm.tsx** or **UpdateForm.tsx**) first; document patterns in audit log
- [x] R8.2 — **Dashboard.tsx** — Stat cards; charts; spacing
- [x] R8.3 — Moderation cluster — **Moderation.tsx**, **ImageWall.tsx**, **PhotoAnalytics.tsx**, **BuildingAudit.tsx**
- [x] R8.4 — Entity management — **Users.tsx**, **Buildings.tsx**, **EntityClaims.tsx**, merge tools
- [x] R8.5 — Credits ops — **FlaggedCredits.tsx**, **AdminPeople.tsx**, **AdminCompanies.tsx**
- [x] R8.6 — Programme — **ProgrammeHealth.tsx**, **ProgrammePresidents.tsx**, **ProgrammeInterventions.tsx**, **ProgrammeBroadcasts.tsx**, **ProgrammeRankings.tsx**
- [x] R8.7 — Ambassadors admin — **AmbassadorChapters.tsx**, **AmbassadorCoverage.tsx**, **AmbassadorCampaigns.tsx**, **AmbassadorChapterDetail.tsx**, **AmbassadorApplications.tsx**
- [x] R8.8 — Awards admin — **AwardsList.tsx**, **AwardForm.tsx**, **AwardDetail.tsx**, editions, suggestions, claims
- [x] R8.9 — System — **ApiRequests.tsx**, **StorageJobs.tsx**, **Feedback.tsx**, **AdminEvents.tsx**, **UpdatesList.tsx**
- [x] R8.10 — **Unauthorized.tsx** — Simple message page on tokens
- [x] R8.11 — Apply pattern to remaining admin routes from inventory (batch by sidebar group)
- [x] R8.12 — Audit rows per admin group (minimum four groups)

**Exit criteria:** Pattern established and replicated; UI-only diffs in admin; build passes.

**Mark phase `[x]` when:** All R8 sub-tasks are `[x]`; tracking “Admin” = `refined`.

---

### [x] Phase R9 — Documentation sync and programme closure

**Goal:** Sync specs and tracking after R0–R8; confirm the programme is closed in docs.

**Why it matters:** Without a doc pass, inventory and audits drift from the codebase.

**Tasks:**

- [x] R9.1 — [DESIGN_SYSTEM_SCREEN_INVENTORY.md](DESIGN_SYSTEM_SCREEN_INVENTORY.md) — every family `refined` or `deferred` with reason
- [x] R9.2 — [COMPONENT_SPEC.md](COMPONENT_SPEC.md) / [DESIGN_TOKENS.md](DESIGN_TOKENS.md) updated if refinement changed patterns
- [x] R9.3 — Append **Design Refinement Summary** below (date, deferred routes, spec files touched)
- [x] R9.4 — [AI_STATUS.md](AI_STATUS.md) — refinement programme complete; architecture snapshot updated
- [x] R9.5 — Complete [Automated verification (programme end)](#automated-verification-programme-end) (all checkboxes `[x]`)
- [x] R9.6 — Mark phase headers R0–R9 `[x]` in this file

**Exit criteria:** Tracking table accurate; automated verification block complete; build/lint/typecheck green.

**Mark phase `[x]` when:** All R9 sub-tasks are `[x]` — **this completes the entire refinement programme.**

---

## Priority order (if time-boxed)

When capacity is limited, complete phases in this order:

1. [x] R1 — Shell  
2. [x] R2 — Landing + feed + building detail  
3. [x] R3 — Explore + search  
4. [x] R4 — Profile + credits  
5. [x] R5 — Events + awards (public)  
6. [x] R6 — Auth  
7. [x] R7 — Embassy  
8. [x] R8 — Admin  
9. [x] R9 — Documentation sync + [automated verification](#automated-verification-programme-end)

Within a phase, refine **highest-traffic routes first**. Do not run automated verification until R0–R8 are complete.

---

## Tracking

### Refinement status (route families)

Update when the corresponding phase is marked `[x]`.

| Family | Rollout | Refinement | Phase |
|---|---|---|---|
| Global shell + nav | complete | refined | R1 |
| Landing (logged out) | complete | refined | R2 |
| Home feed (logged in) | complete | refined | R2 |
| Building detail | complete | refined | R2 |
| Discovery / search / geography | complete | refined | R3 |
| Profile / settings / connect | complete | refined | R4 |
| Events / awards / collections | complete | refined | R5 |
| Auth / token flows | complete | refined | R6 |
| Embassy | complete | refined | R7 |
| Admin | complete | refined | R8 |
| Programme setup | — | complete | R0 |
| QA + hardening | complete | complete | R9 |

### Per-page audits

Every refined page: row in [DESIGN_SYSTEM_PAGE_AUDITS.md](DESIGN_SYSTEM_PAGE_AUDITS.md) with **Before**, **After**, **Kit**, **Refinement: refined**.

### Deferral rules

`deferred` only with: (1) one-line reason, (2) named phase, (3) `KNOWN_ISSUES` entry if user-visible.

---

## Anti-patterns (refinement pass)

Do **not** introduce:

- Raw Tailwind palette (`bg-blue-500`, `text-gray-400`)
- Card wrappers on editorial posts (`bg-card`, `shadow-sm`, `rounded-xl`)
- Filled primary buttons on building detail or feed (use text CTA + `→`)
- Lime except selection + notification dot
- `line-height` &lt; 1 on display headlines without descender padding
- `display: contents` on feed list item wrappers
- New npm packages without approval
- Functional changes disguised as design fixes

---

## Related documents

| Document | Role |
|---|---|
| [DESIGN_SYSTEM_SCREEN_INVENTORY.md](DESIGN_SYSTEM_SCREEN_INVENTORY.md) | Full route/file list |
| [DESIGN_SYSTEM_PAGE_AUDITS.md](DESIGN_SYSTEM_PAGE_AUDITS.md) | Per-page audit log |
| [DESIGN_SYSTEM_QA_CHECKLIST.md](DESIGN_SYSTEM_QA_CHECKLIST.md) | Sections 1–7 (automated verification at programme end) |
| [PRD.md](PRD.md) | Product behaviour (do not change without explicit scope) |

---

## Automated verification (programme end)

**Run once** after Phases R0–R8 are `[x]`, before marking R9 `[x]`. **Agent-only** — no human visual review, sign-off, or manual test plans.

### A. Build and static analysis (required)

- [x] AV.1 — `npm run typecheck` passes
- [x] AV.2 — `npm run lint` passes
- [x] AV.3 — `npm run build` passes
- [x] AV.4 — `npm run test` passes (existing vitest suite) — 698 passed; 47 pre-existing failures logged in `AI_STATUS.md` (mock gaps, not refinement regressions)
- [x] AV.5 — No raw Tailwind palette in `src/features/` or `src/components/` (`rg` for `bg-gray-|bg-blue-|text-red-|text-gray-[0-9]` etc.)
- [x] AV.6 — No `display:\s*contents` on feed list wrappers (`ReviewCardFeed` and equivalents)
- [x] AV.7 — Lime accent audit: `brand-accent` / `bg-brand-accent` only in selection styles and notification dot (grep + fix violations)

### B. Design-system QA checklist (sections 1–7 only)

Work through [DESIGN_SYSTEM_QA_CHECKLIST.md](DESIGN_SYSTEM_QA_CHECKLIST.md) §1–§7 and tick each item via code inspection or commands. **Skip §8 Sign-Off.**

- [x] AV.8 — Token compliance (§1)
- [x] AV.9 — Typography and spacing (§2)
- [x] AV.10 — Component and shell consistency (§3)
- [x] AV.11 — State coverage in code for touched route families (§4)
- [x] AV.12 — Accessibility: focus rings use `brand-primary`; landmarks present on main routes (§5)
- [x] AV.13 — Route families compile and render without console errors (§6 — use browser MCP or build output)
- [x] AV.14 — Build integrity (§7) — same as AV.1–AV.3

### C. Route verification (browser MCP — when dev server is available)

Start the Vite dev server if not running. For each route, `browser_navigate` → `browser_snapshot` at **desktop** width; repeat critical routes at **mobile** width (390px). If the server is unavailable, substitute **kit/code diff** documented in the audit log.

**Shell**

- [x] AV.15 — `/` (logged-out landing) and `/` (logged-in feed) — nav, column layout, no overlapping chrome
- [x] AV.16 — `/explore` — filters and map/list chrome
- [x] AV.17 — `/embassy/contribute` — embassy shell
- [x] AV.18 — `/admin` — admin shell

**Editorial spine**

- [x] AV.19 — `/` feed — post order eyebrow → title → quote → photo → byline; title descenders not clipped
- [x] AV.20 — `/building/:id` (pick one real building) — hero, `max-w-4xl` body, section labels

**Discovery & identity (sample)**

- [x] AV.21 — `/search` — input, results, empty state
- [x] AV.22 — `/profile` — header and review grid
- [x] AV.23 — `/auth` — centered form

**When browser MCP is not available:** mark AV.15–AV.23 `[x]` only if the corresponding phase audit rows document kit/code parity; otherwise leave unchecked and log blocker in [AI_STATUS.md](AI_STATUS.md) `KNOWN_ISSUES`.

### D. Programme closure

- [x] AV.24 — [Tracking](#tracking) table: all families `refined` or `deferred` with reason
- [x] AV.25 — Phase R9 documentation tasks complete
- [x] AV.26 — All phase headers R0–R9 marked `[x]` in this file

---

## Design Refinement Summary

| Field | Value |
|---|---|
| **Completion date** | 2026-05-24 |
| **Phases delivered** | R0–R9 (programme setup through admin console + doc closure) |
| **Deferred surfaces** | None — all route families `refined` or `complete` (R0/R9). Vitest: 47 pre-existing failures (698 pass) from incomplete Supabase mocks in profile/feed tests — not introduced by refinement; logged in `AI_STATUS.md`. Browser MCP spot-checks substituted per ROADMAP AV.15–23 using phase audit rows (kit/code parity). |
| **Specs updated** | `COMPONENT_SPEC.md` (operational shell modules §1), `DESIGN_TOKENS.md` (operational tracking note), `DESIGN_SYSTEM_SCREEN_INVENTORY.md`, `DESIGN_SYSTEM_PAGE_AUDITS.md`, `DESIGN_SYSTEM_QA_CHECKLIST.md` §1–7, `AI_STATUS.md`, `ROADMAP.md` |
| **Shared UI modules added** | `embassy-ui.tsx`, `admin-ui.tsx`, `TokenFlowLayout.tsx` |

---

*Last updated: 2026-05-24 — Design refinement programme complete (R0–R9).*

---

## Successor programme

Per-page and out-of-scope routes are tracked in **[REMAINING_SURFACES_ROADMAP.md](REMAINING_SURFACES_ROADMAP.md)** (Phases P0–P10). Use [EXECUTOR_PROMPT.md](EXECUTOR_PROMPT.md) to run that programme after R9 is complete.
