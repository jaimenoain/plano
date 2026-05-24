# Design-System Rollout Roadmap

## Objective

Apply the new `design-system/` across all key web surfaces with deep page-level review, explicit design decisions, and zero functional regression.

This roadmap treats each major page/screen as its own mini-project with:

- design audit
- state and interaction audit
- component/token alignment decisions
- implementation + QA acceptance criteria

## Required Sources (mandatory for every page review)

Every page review and redesign decision must explicitly reference:

- `design-system/README.md`
- `design-system/colors_and_type.css`
- `design-system/preview/*`
- `design-system/ui_kits/website/*`
- `docs/DESIGN_TOKENS.md`
- `docs/COMPONENT_SPEC.md`

## Working Method (per page)

For each page/screen, execute this sequence:

1. Define user goal and page intent
2. Audit current UI against tokens/components and design-system references
3. Audit all states: `idle`, `loading`, `error`, `empty`, `success`
4. Record design deltas and proposed refinements with rationale
5. Implement and run visual + interaction QA
6. Mark page complete only after acceptance checks pass

---

## Phase 0 — Foundations and Governance

Goal: set execution guardrails before deep page work.

Deliverables:

- complete route-to-screen inventory
- design QA checklist
- release/freeze plan
- explicit source-of-truth sync workflow

Status artifacts:

- `docs/DESIGN_SYSTEM_SCREEN_INVENTORY.md`
- `docs/DESIGN_SYSTEM_QA_CHECKLIST.md`
- `docs/DESIGN_SYSTEM_RELEASE_PLAN.md`
- `docs/DESIGN_SYSTEM_ROLLOUT_STANDARDS.md`

---

## Phase 1 — Token + Shell Alignment

Goal: remove global visual drift before feature-by-feature redesign.

Scope:

- `tailwind.config.ts`
- `src/index.css`
- shared layout shell and navigation surfaces

Key outcomes:

- token parity with `design-system/colors_and_type.css`
- centralized navigation model used by top/sidebar/bottom nav
- shell spacing and behavior consistency across desktop/mobile

---

## Phase 2 — Editorial Core (Landing, Feed, Building Detail)

Goal: match highest-visibility surfaces to new design language.

Primary files:

- `src/features/feed/pages/Index.tsx`
- `src/features/feed/components/*`
- `src/features/buildings/pages/BuildingDetails.tsx`

Reference targets:

- `design-system/ui_kits/website/Landing*.jsx`
- `design-system/ui_kits/website/FeedPage.jsx`
- `design-system/ui_kits/website/BuildingDetail.jsx`

Acceptance:

- typography hierarchy matches editorial spec
- monochrome discipline preserved
- corner/shadow rules applied correctly

---

## Phase 3 — Discovery and Map Surfaces

Goal: unify map/list experiences while preserving performance and usability.

Primary files:

- `src/features/explore/pages/Explore.tsx`
- `src/features/search/SearchPage.tsx`
- `src/features/guides/GuidesPage.tsx`
- `src/features/localities/pages/*`

Acceptance:

- consistent filter and map/list patterns
- responsive behavior validated
- no regression in map interactions

---

## Phase 4 — Identity and Public Content Ecosystem

Goal: align profile and content ecosystems with shared design patterns.

Primary paths:

- `src/features/profile/*`
- `src/features/credits/*`
- `src/features/events/*`
- `src/features/awards/*`
- `src/features/connect/*`
- `src/features/notifications/*`

Acceptance:

- owner/viewer state clarity
- auth/public variants visually consistent
- reusable patterns applied across sections

---

## Phase 5 — Embassy Workspace

Goal: redesign high-density operational pages with clarity and speed.

Primary paths:

- `src/features/embassy/pages/*`
- `src/features/embassy/components/*`

Acceptance:

- all operational states reviewed and improved
- drawer/table/task patterns standardized
- throughput-oriented workflows remain efficient

---

## Phase 6 — Admin Console

Goal: align all admin pages to the design system without reducing operational readability.

Primary paths:

- `src/features/admin/pages/*`
- `src/features/admin/components/*`

Acceptance:

- tables/forms/panels follow common patterns
- visual hierarchy consistent across admin sections
- action discoverability preserved for dense workflows

---

## Phase 7 — Hardening, Accessibility, Release

Goal: finalize with full quality and release readiness checks.

Required checks:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

Validation:

- desktop/mobile visual regression checks
- keyboard/focus/contrast accessibility checks
- route-family smoke tests

Release gate:

- design sign-off + QA sign-off complete for each phase batch

---

## Key Route-Family Review Order

1. Global shell + navigation
2. Landing/feed/building detail
3. Search/explore/maps/locality
4. Profile/credits/events/awards
5. Embassy workspace
6. Admin console
7. Final hardening and release

---

## Phase Summary (2026-05-24)

**Completion date:** 2026-05-24

**Delivered:**
- Phase 0 governance: screen inventory verified against `app/routes.ts`, per-page audit log at `docs/DESIGN_SYSTEM_PAGE_AUDITS.md`
- Phase 1: semantic tokens on mobile sidebar dropdowns; global `ds-rollout` on `app/root.tsx` body
- Phase 2: signed-in home feed wired to `get_feed` via `useHomeFeed` + editorial `ReviewCardFeed` cards; building detail hero gradient, `max-w-4xl` content column, typography scale
- Phases 3–6: raw palette utilities replaced with semantic tokens across discovery maps, embassy, admin, credits, and building flows
- Phase 7: `npm run typecheck`, `npm run lint`, `npm run build` passing; route-family tracker marked complete in `docs/DESIGN_SYSTEM_SCREEN_INVENTORY.md`

**Descoped:** Full restoration of feed ranker/mosaic/cold-start pipeline (removed in prior refactor); home feed uses `get_feed` + existing FeedCard A/B/C resolution.

**Specs updated:** `docs/DESIGN_SYSTEM_SCREEN_INVENTORY.md`, `docs/DESIGN_SYSTEM_PAGE_AUDITS.md`, `docs/AI_STATUS.md`
