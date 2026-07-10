# Design Precision Programme — spec & phased roadmap

**Status:** active. **Phase 1 (entity detail family) shipped** in PR #1535 (branch `design/building-detail-precision`).

**Read order for a fresh conversation:** this file → [`AGENTS.md`](../AGENTS.md) → [`design-system/README.md`](../design-system/README.md) (brand rules) → [`docs/DESIGN_TOKENS.md`](DESIGN_TOKENS.md) → [`docs/SCREEN_INVENTORY.md`](SCREEN_INVENTORY.md) (**authoritative full catalogue** — ~90 route screens + ~30 modal/drawer surfaces + in-page view modes; the roadmap below covers all of it). Then pick a phase below and run it end-to-end.

---

## 1. Why this exists (the bar)

PLANO is an editorial, photography-first, **monochrome** platform where **design precision *is* the product**. A prior programme (R0–R9 family polish, P0–P10 remaining surfaces — see `ROADMAP.md`/`REMAINING_SURFACES_ROADMAP.md`) made screens **conformant** (right tokens, right patterns). This programme goes one level deeper: **pixel precision** — the spacing, alignment, hero treatment, content width, and mobile behaviour that separate "uses the design system" from "slick."

Editorial/monochrome has a **tiny error budget**: no shadows or rounded corners to hide a 4px mistake, so any misalignment or cramped spacing *screams*. That is exactly why generic SaaS design "just works" for Claude but this project doesn't — and why we refine **directly in code with live browser verification**, never via lossy design-tool round-trips.

**Definition of "done" for a screen:** title/primary content visible on load (no scroll-to-see); one consistent content measure; aligned left edges across sections; no elements touching; deliberate whitespace; **verified at desktop 1440 AND mobile 390**; on-brand (full-colour photography, mono eyebrows, hairline borders, sharp corners, Inter + Space Mono).

---

## 2. The method (the loop) — run this for every screen

1. **Boot + log in.** `npm run dev` (port 8080). Then screenshot the target routes with the audit tool (it logs in as the ACTIVE test user and settles animations):
   ```
   node scripts/design-audit.mjs --routes /,/explore,/search
   node scripts/design-audit.mjs --routes /profile --viewport m
   ```
   PNGs land in `.audit/` (gitignored). Read them.
2. **Measure the flaws.** Don't eyeball only — measure. In a page.evaluate (or extend the script): title push-down vs viewport height, content-container width, element `left` offsets that should match, `document.documentElement.scrollWidth - clientWidth` (horizontal overflow). Numbers make the fix objective and the win provable.
3. **Fix in code** using design tokens + existing primitives (§4). Never raw Tailwind palette (`bg-blue-500`), never new one-off values where a token/primitive exists.
4. **Re-verify live** at desktop **and** mobile; iterate until the numbers and the screenshot are right.
5. **Extract when a pattern repeats.** The moment two screens want the same thing, lift it into a shared primitive so precision is *inherited*, not re-derived. This is the actual cure for "going in circles."
6. **Commit per screen/stage** on a feature branch; keep each commit small and verified.

---

## 3. Guardrails / Definition of Done (CI will enforce these)

- `npm run typecheck` clean; **pre-push hook runs the full test suite** — it must pass (it will block the push otherwise).
- **Ratchets (CI "Debt ratchet" + "Warning ratchet"):**
  - **File-size ratchet** (`scripts/check-file-sizes.mjs`): grandfathered files (e.g. `BuildingDetails.tsx`, `CompanyDetails.tsx`) have **frozen line caps and may not grow**. If your change grows one, **extract a component** until it's back under — never edit the baseline. Budgets: pages 800, components 400, hooks 300.
  - **Warning ratchet** (`scripts/check-eslint-ratchet.mjs`): don't add eslint warnings above baseline.
  - **as-any ratchet** + **strict-allowlist ratchet**: don't add `as any`/`@ts-ignore`; don't drop strict-mode files.
- **Guard tests** (`tests/unit/deprecated-artifacts-*.test.ts`): e.g. **no `/architect/` path literals in `src/`** (redirects only) — watch JSDoc comments with slashes like `name/architect/place`.
- Design tokens only (`docs/DESIGN_TOKENS.md`); reuse `src/components/ui` primitives; no `getSession()`, no mock data.
- Small single-concern PRs; branch off `main`; `gh pr create` following `.github/PULL_REQUEST_TEMPLATE.md`.

Run locally before pushing: `npm run typecheck && node scripts/check-file-sizes.mjs && node scripts/check-eslint-ratchet.mjs && npx vitest run <touched dirs>`.

---

## 4. Infrastructure already built (reuse it)

Shared primitives from Phase 1 — **use these, don't reinvent**:
- `src/components/media/EntityHero.tsx` — cropped full-colour hero band (default ~58vh, capped below viewport), `w-full`, `.photo-placeholder` fallback, bottom gradient, `overlay` slot inside a `max-w-[1120px]` container. Props `{heroImageUrl, alt, placeholderLabel, overlay, heightClassName?}`.
- `src/components/media/HeroIdentity.tsx` — layout-only overlay wrapper (`space-y-3 text-text-inverse`): badges → mono eyebrow → white headline → credits.
- `src/features/credits/components/EntityMetaEyebrow.tsx` — mono uppercase-tracked meta eyebrow (`items` array, joined with ` · `). Used above person/company names.
- `src/features/buildings/components/BuildingHeroSection.tsx`, `BuildingHeroIdentity.tsx`, `BuildingHeader.tsx` — building-specific composition of the above.
- **Content measure:** the entity family standardised on **`max-w-[1120px]`** (was `max-w-4xl`/896). Match it when a page joins the family.
- `scripts/design-audit.mjs` — the login + settle + screenshot tool (§2).

---

## 5. Key gotchas (a fresh conversation WILL hit these)

- **Animations hide content in headless capture.** The app gates content behind framer-motion entrance animations that only play when the tab is "visible" — a naive screenshot (or the built-in preview, `visibilityState:hidden`) shows blank/half-built screens. The audit script overrides `visibilityState`/`hidden` to force them to settle. **A "blank/terrible" screen is often this, not a design bug — always settle first.**
- **Login:** test users live in `.env.local` (`ACTIVE_USER_EMAIL`/`_PASSWORD`, also `NEW_`/`INACTIVE_`). Login form selectors: `#email`, `#password`, `button[type=submit]` (see `tests/e2e/helpers.ts`). Never print the password.
- **Dev DB has no individual-person entities** — `/person/:slug` 404s for famous architects locally; most credits resolve to companies. You can verify Company/Locality live but may have to assert Person from code parity (it shares Company's header/shell).
- **Ports:** `npm run dev` → 8080 (vite config). `.claude/launch.json` uses 8085. Pass `--base http://localhost:<port>` to the audit script to match.
- **`/architect/` and `/locality/` routes are redirects** — the real pages are `/person/:slug` (`PersonDetails`), `/company/:slug` (`CompanyDetails`), `/city/:citySlug` & `/architecture/:cc/:city` (`LocalityPage`).

---

## 6. Phased roadmap

Each phase is a coherent surface group runnable in one fresh conversation. Do them in impact order or pick per priority. Authoritative catalogue: **[`docs/SCREEN_INVENTORY.md`](SCREEN_INVENTORY.md)** — read the relevant rows before starting. **The coverage matrix at the end maps every inventory section to a phase, so nothing is dropped.** Admin/superadmin (~45) is explicitly deferred.

- **[x] Phase 1 ✅ — Entity detail family** — building, person, company, locality, country. Shipped (#1535): cropped colour `EntityHero` + overlay, 1120 shell, mono eyebrow, info-grid + review-alignment fixes.
- **[x] Phase 1b — Entity family finish** — building detail's other tabs (INFO/CREDITS/MEDIA/MAP bodies, `RelatedByArchitect/City`), the person/company **credit-row lists** (large empty right-side space at 1120 — tighten), **Review detail** (`/review/:id`), **Architecture Hub** (`/architecture`, `pages/ArchitectureHub.tsx`). Shipped: `BuildingMediaTab` extraction (responsive masonry, `.photo-placeholder`, `EmptyState`), unboxed credits/info + aligned edges, two-column credit grid, review detail normalised to the monochrome system, Architecture Hub `.display` hero at 1120. Community-reviews pagination landed alongside (RPC `get_building_reviews` LIMIT/OFFSET + migration).
- **[x] Phase 2 — Feed + landing** (`/`, `features/feed/pages/Index.tsx`) — ⚠️ **two screens in one route**: logged-out marketing landing (`LandingHero`/`LandingStatsBand`/`LandingFeatureGrid`) and logged-in activity feed (`EditorialFeedPost`, `FeedActivitySummaryRow`, `FeedSidebar`). Landing left as-is (already strong). Shipped: `FeedSidebar` module rhythm normalised to a single 36px divider cadence (Recently-added + footer were `pt-5`, now `pt-9`); `EditorialFeedPost` pull-quote measure changed from the odd-one-out `max-w-[88%]` to a `ch`-based editorial measure (`max-w-[34ch]`). **Scope note:** `FeedCardA/B/C` never render on `/` (`HomeFeedEntry` routes non-activity/non-event entries to `EditorialFeedPost`), so their footer/`line-clamp` unification was deferred to Phase 3/4, which own the Explore/Profile surfaces where those cards appear.
- **[x] Phase 3 — Discovery & the map system** — Explore (`features/explore/pages/Explore.tsx`), Search (`features/search/SearchPage.tsx`), **and the shared map components** (`src/features/maps/components/*`) reused by Search/Explore/Building/Locality/Collection-map. Surfaces were already conformant, so this was a precision + consistency pass. Shipped: extracted **`MapChromeButton`** — the satellite/fullscreen controls were hand-rolled three ways (shadow/radius/blur/surface/casing) across `PlanoMap`/`CollectionMapGL`/`BuildingLocationMap`; now one flat editorial shell, verified byte-identical across wrappers. Map raw-palette leaks tokenised (`border-gray-600`→`border-border-strong` in `pinStyling`, `bg-black`/`border-gray-*`→ tokens in `BuildingPopupContent` rating circles; tests updated). `PlanoMap` empty overlay + `BuildingSidebar`'s three empties + Explore's error state routed through the shared `EmptyState`. Search consistency: `BuildingSidebar` end-of-results CTA → `.cta-link` (no literal arrow), double location-suggestion divider removed; `FilterDrawer` trigger de-shadowed/sharpened + section-heading recipe normalised; mobile search-bar lime focus ring dropped. `LeaderboardDialog` `text-amber-500` → token. **Scope note:** FeedCardA/B/C footer/`line-clamp` unification stays deferred to **Phase 4** (Profile) — those cards render on Feed/Profile, not on any Phase 3 surface. Drawer widths + `BuildingDrawerBody` action fills left as deliberate.
- **[ ] Phase 4 — Profile, collections & settings** — Profile (`features/profile/pages/Profile.tsx`, XH) incl. all **in-page view modes** (grid/list/kanban/reviews/likes/photos), Photo gallery, **Folder view** (`/:username/folders/:slug`), **Collection map** (`/:username/map/:slug`), Settings.
- **[ ] Phase 5 — Social & engagement** — Connect, Notifications (`NotificationRow` lime unread square — one of only two legit lime uses), Post, **Feedback history** (`/feedback`).
- **[ ] Phase 6 — Content & informational** — Guides, Events (list + detail), Awards (index + page + edition + **owner-admin** `/award/:slug/admin`), Updates + Update detail, **Support**, About/Terms.
- **[ ] Phase 7 — Forms, flows & dashboards** — Auth, Onboarding, Update password; form pairs (Add/Edit building, **Edit note**, Submit/Edit event, Award/Edition forms); token flows (remove-credit, verify-claim, approve-steward, accept-steward, company dispute); **Person/Company dashboards** (`/portfolio`, `/company-portfolio`, both H). Forms are where alignment errors hide.
- **[ ] Phase 8 — Modals, drawers & overlays** (~30) — cross-cutting: refine each dialog/drawer as its parent phase touches it, **plus a dedicated consistency sweep** (inventory §3: claim/collection/folder/highlights dialogs, `FilterDrawer`, `BuildingDetailDrawer`, `PlanRouteDialog`, `ImageDetailsDialog`…). The Phase-1 overlay pattern (Dialog/Sheet/Drawer open-state) applies.
- **[ ] Phase 9 — Global shells & chrome** — MainLayout, top nav / sidebar / bottom nav (`components/layout/navigation.ts` = single source), Header/MobileTopBar/SiteFooter, **404** (`NotFound`) + **500** (root `ErrorBoundary`). Frames every screen; broadly conformant already, so this is a precision + consistency pass (can also come *first* if shell drift is found).
- **[ ] Phase 10 — Mobile precision sweep** — all refined surfaces at 390 (`--viewport m`); bottom nav, mobile top bar, sheets. Desktop-first fixes leave mobile gaps ("things touching").
- **[ ] Phase 11 — Community** — Embassy 6-tab workspace (`/embassy/*`) + Ambassadors (Support done in P6; Become / Portal here).
- **Deferred — Admin & superadmin (~45)** (`/admin/*`, `/superadmin/*`) — internal tooling; out of the near-term precision scope (inventory §5.5). Lightweight token/spacing pass only if prioritised.

### Coverage matrix — every inventory section is placed

| `SCREEN_INVENTORY.md` section | Phase(s) |
|---|---|
| §0 Global shells & chrome | **9** |
| §1.1 Landing/Feed · Explore · Search · Guides · Architecture Hub | **2** · **3** · **3** · **6** · **1b** |
| §1.2 Building detail · Add/Edit building · Edit note · Review detail | **1 ✅** · **7** · **7** · **1b** |
| §1.3 Country · City/Locality (· redirect) | **1 ✅** |
| §1.4 Events list · detail · submit/edit | **6** · **6** · **7** |
| §1.5 Awards index · page · edition · owner-admin | **6** |
| §1.6 Person · Company · dispute · Person/Company dashboards · accept-steward | **1 ✅** · **1 ✅** · **7** · **7** · **7** |
| §1.7 Profile (+view modes) · Photos · Folder · Collection map · Settings | **4** |
| §1.8 Support · Become/Portal ambassador · Embassy ×7 | **6** · **11** · **11** |
| §1.9 Connect · Notifications · Feedback history · Post | **5** |
| §1.10 Auth · Onboarding · Update password | **7** |
| §1.11 About · Terms · Updates · Update detail | **6** |
| §1.12 Token flows (remove-credit/verify-claim/approve-steward) · 404 · 500 | **7** · **9** · **9** |
| §2 Admin & superadmin (~45) | **Deferred** |
| §3 Modals/drawers (~30) + in-page view modes | **8** (+ within the owning phase) |

### Per-phase execution checklist (for a fresh conversation)
1. Read this doc + the inventory rows for the phase + brand rules.
2. `npm run dev`; `node scripts/design-audit.mjs --routes <phase routes>` (desktop **and** `--viewport m`). Read every screenshot; settle animations (the tool does).
3. List concrete precision issues **with measurements** (overflow, offsets, widths, hero height vs viewport). Confirm scope with the user if ambiguous.
4. Fix in code (tokens + §4 primitives); re-verify live each change at both breakpoints. Extract a shared primitive the moment a pattern repeats.
5. Gate: `typecheck` + ratchets + touched tests green; pre-push runs full suite.
6. Commit per screen on a `design/<phase>` branch; `gh pr create` per the template; report the PR.

---

## 7. Provenance

Phase 1 fixed, on a real production example (`/architecture/gb/london/13154/two-fifty-one`): B&W→colour hero; hero pushed the title 1005px→455px→now overlaid; content 896→1120; INFO spec grid de-crammed + aligned; review avatars de-drifted (17px→0). Then extracted `EntityHero`/`HeroIdentity`/`EntityMetaEyebrow` and rolled the pattern to locality/person/company/country. This doc captures that method so the rest of the app gets the same treatment, one phase at a time.
