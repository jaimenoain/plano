# Design Precision Programme — spec & phased roadmap

**Status:** active. **Phase 1 (entity detail family) shipped** in PR #1535 (branch `design/building-detail-precision`).

**Read order for a fresh conversation:** this file → [`AGENTS.md`](../AGENTS.md) → [`design-system/README.md`](../design-system/README.md) (brand rules) → [`docs/DESIGN_TOKENS.md`](DESIGN_TOKENS.md) → [`docs/DESIGN_SYSTEM_SCREEN_INVENTORY.md`](DESIGN_SYSTEM_SCREEN_INVENTORY.md) (route/file map). Then pick a phase below and run it end-to-end.

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

Each phase is a coherent surface group runnable in one fresh conversation. Do them in order of impact, or pick per priority. Primary files come from `docs/DESIGN_SYSTEM_SCREEN_INVENTORY.md` — read the relevant rows before starting.

| Phase | Surface group | Key routes / files | Notes |
|---|---|---|---|
| **1 ✅** | **Entity detail family** | building, person, company, locality, country | Shipped (PR #1535): cropped colour EntityHero + overlay, 1120 shell, mono eyebrow, info-grid + review-alignment fixes. |
| **1b** | Entity family finish | `PersonDetails`, `CompanyDetails` credit-row lists; building INFO/CREDITS/MEDIA tab bodies | The credit rows have large empty right-side space at 1120 — tighten. Audit each tab, not just OVERVIEW. |
| **2** | **Feed + landing** (`/`) | `features/feed/pages/Index.tsx`, `features/feed/components/landing/*`, `features/posts/components/FeedCard{A,B,C}.tsx`, `ReviewCardFeed.tsx` | Highest-traffic (XH). Landing hero already strong; audit the logged-in feed cards + right sidebar (`FeedSidebar`, `PeopleYouMayKnow`). Note the shared feed cards render here AND were the near-miss for the building review bug. |
| **3** | **Discovery** | Explore (`features/explore/pages/Explore.tsx`, `DiscoveryCard.tsx`), Search (`features/search/SearchPage.tsx`, `maps/components/BuildingSidebar.tsx` — the SERP row) | Map + card grids + the swipe intro. Greyscale map is on-brand; check card alignment + result rows + filters. |
| **4** | **Profile & account** | Profile (`features/profile/pages/Profile.tsx`, XH), Settings, Profile photos, Itinerary/Visit-log | Profile is XH — stats band, tabs, grid/list toggles, the photo grid. Bring to the 1120 family measure if appropriate. |
| **5** | **Social** | Connect (`features/connect/*`), Notifications (`NotificationRow.tsx` — the lime unread square), Post (`pages/Post.tsx`) | Rows/lists precision; the lime unread dot is one of only two legit lime uses. |
| **6** | **Content surfaces** | Guides (`features/guides/*`), Events (`features/events/*`), Awards (`/award/:slug`), Updates (`pages/Updates.tsx`), City/Country list bodies | Poster heroes, card grids. Reuse EntityHero where a photo hero fits. |
| **7** | **Auth & forms** | Login/Auth (`features/auth/pages/Auth.tsx`), Onboarding, Add-building (`/add-building`), claim/token flows | Form precision: label/field rhythm, split-screen auth, stepped onboarding. Forms are where alignment errors hide. |
| **8** | **Mobile precision sweep** | All refined surfaces at 390px | Desktop-first fixes leave mobile gaps ("things touching"). Dedicated pass with `--viewport m` across Phases 1–7. Bottom nav, mobile top bar, sheets. |
| **9** | Workspace surfaces (optional/lower) | Embassy (`features/embassy/*`), Admin (`features/admin/*`) | XH tool-heavy; historically lower design priority. |

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
