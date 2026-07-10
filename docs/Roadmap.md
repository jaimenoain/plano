# Design-system conformance roadmap

> **Purpose:** bring the Plano app into line with the refreshed design system imported from Claude
> Design (project `e8d58798`, namespace `PlanoDesignSystem_e8d587`, living in `design-system/`).
>
> **How to use this file:** each numbered PR below is designed to be executed in a **fresh
> conversation** with no prior context. Pick the next unchecked PR, read §1–§4 of this document,
> then do only that PR. Do not batch several PRs together.

---

## 1. What this is (and is not)

The app **already implements ~80% of this design system.** The chrome components, the token values,
and all 23 surfaces already exist. This is therefore a **conformance sweep** — closing the gaps
between the live app and the refreshed design — *not* a rebuild. That is exactly the process
`design-system/claude-code-package-v2/design-system/MIGRATION.md` prescribes: foundation first, then
one surface at a time.

### Status

| | PR | State |
|---|---|---|
| ✅ | Design-system foundation | **Merged** — [#1521](https://github.com/jaimenoain/plano/pull/1521) |
| ✅ | 1 · Global chrome | **Merged** — [#1522](https://github.com/jaimenoain/plano/pull/1522) |
| ☐ | 2 · Feed | not started |
| ☐ | 3 · Building detail | not started |
| ☐ | 4 · Landing | not started |
| ☐ | 5 · Profile + credits | not started |
| ☐ | 6 · City + guides | not started |
| ☐ | 7 · Map / explore / itinerary | not started |
| ☐ | 8 · Events + connect + notifications | not started |
| ☐ | 9 · Auth flows | not started |
| ☐ | 10 · Settings + admin | not started |
| ☐ | 11 · Compose + empty/loading/error states | not started |

**What the merged foundation already gave you** (assume these exist — do not re-create them):

- Editorial utility classes in `src/index.css`: `.display`/`.hero`, `.headline`, `.eyebrow`/`.label-upper`,
  `.body-relaxed`, `.meta-code`, `.cta-link` (injects the `→` and its lime hover), `.photo-placeholder`
  (caption via `data-label`), `.accent-tag`.
- Poster type steps `--text-8xl` (96px) / `--text-9xl` (128px).
- The **letter-spacing scale** — `tracking-tight` −0.03em, `tracking-wide` 0.08em,
  `tracking-widest` **0.15em**. Previously Tailwind's defaults silently applied.
- `Button` `variant="accent"` = the **lime primary CTA**. `default` stays black.
- **Lime focus rings** (`focus-visible:ring-brand-accent`) across `src/components/ui/**`.
- `RatingDots` (`src/components/ui/rating-dots.tsx`) — earned-only award dots.
- `MichelinRatingInput` — the four-tier labelled award input.
- An **error-level raw-hex guard** on `src/components/ui/**` + `src/components/layout/**`
  (`eslint.config.js`).

---

## 2. The rules that break Plano instantly

Read `design-system/claude-code-package-v2/design-system/CHECKLIST.md` before finishing any PR. The
load-bearing rules:

- **Lime (`brand-accent`, `#BEFF00`) is rationed to four uses:** the primary-CTA button fill, focus
  rings, the hover `→` arrow, and **one** `.accent-tag` pill per view. Plus `::selection` and the
  bell unread dot. Everything else — icons, map markers, section accents, verified badges, rating
  dots, surface fills — is monochrome black `#171717`. **Lime anywhere else is a bug.**
- **Rating dots are a reward, not a scale.** Show only the **earned** black dots (1–3). Zero dots
  renders **nothing**. Never an empty/outlined ring, never "X out of 3", never a numeric score.
  Use `RatingDots` for display and `MichelinRatingInput` for input.
- **Push the type scale.** Heroes 96–128px (`.display`), feed building-names 48–60px (`.headline`).
  Hedging to a safe medium size is the single most common reason a Plano screen looks flat.
- **Whitespace is the structure.** ≥64px between feed items (96px is better), ≥48px between sections.
- **Content/feed cards are unboxed.** No border, no background, no shadow. Imagery is `radius-none`,
  sharp-edged, never rounded. Boxed cards are legal **only** on admin/settings/forms and modals.
- **Sidebars only on admin + settings.** Reading surfaces are single-column `max-w-4xl`.
- Inter (400–700 only, never 800/900) and Space Mono (tiny numeric meta only). No emoji, no
  illustrations, no gradients, no inner shadows.
- Photo-less slots use `.photo-placeholder` with a `data-label`, never a flat grey box.

**Conflict rule:** on a *design decision* the design system wins and the repo is brought into line
(`design-system/claude-code-package-v2/design-system/SOURCE-OF-TRUTH.md`). For what a token
*currently resolves to*, `src/index.css` is the runtime truth. If you change a design decision,
update `docs/DESIGN_TOKENS.md` **in the same PR** — never defer the sync.

---

## 3. The per-PR working loop

1. **Branch off `main`** (the foundation is merged; do not stack). One PR per surface.
2. **Locate** the owning file(s) from the table in §5, and open the matching designed screen at
   `design-system/ui_kits/web/screens/<screen>.html`. That HTML is the pixel target.
3. **Read the intent:** the matching recipe in `PATTERNS.md`, the component contracts in
   `COMPONENTS.md`, and `LAYOUT-AND-CHROME.md` for anything responsive.
4. **Diff against `CHECKLIST.md`.** Failures cluster in four places — fix in this order:
   1. *Type scale hedged* to a safe medium (the #1 cause of flatness).
   2. *Stray lime* outside the four sanctioned uses, or raw hex.
   3. *Boxed where it should float* (feed/content cards with borders/bg/shadow, rounded imagery).
   4. *Cramped* (section gaps < 48px, feed gaps < 64px).
5. **Reuse, don't fork.** Compose the utilities and `src/components/ui` primitives listed in §1.
6. **Never introduce a raw value.** If a token is missing, propose adding it — don't hardcode.
7. **Verify in the browser** (§4), run the gate, open the PR, then **arm auto-merge** (§3.2).
8. **Tick the row** in the §1 status table as part of that same PR.

### 3.1 Definition of Done (repo standard, `AGENTS.md`)

- `npm run check` green **before commit** — lint, typecheck, vitest, migration check, and all four
  debt ratchets.
- New user-facing behaviour ships **with its test in the same PR**.
- Affected docs updated in the same PR (`docs/DESIGN_TOKENS.md`, the audit/inventory rows).
- **Debt baselines only ever shrink.** If a ratchet fails, fix the code — never the baseline.
- Small, single-concern PR. Direct pushes to `main` are blocked by branch protection.

### 3.2 Landing the PR — auto-merge, not a hand-off

`main` requires **9 status checks** (Lint, Typecheck, Test, Build, Migrations lint, Warning ratchet,
Debt ratchet, Secret scan, Types staleness) and **zero approving reviews**, with
*"require branches to be up to date"* enabled. Repo-level auto-merge is **on**.

So a conformance PR merges itself the moment it is green. Immediately after opening it:

```sh
gh pr merge <number> --auto --merge
```

That arms auto-merge; GitHub lands the PR as soon as all 9 checks pass. **Do not merge by hand, and
do not wait for a human.** If a check fails, auto-merge stays armed — push the fix and it lands.

> Never reach for `--admin`, and never `git push --no-verify`. If a check is red, the code is wrong.

**The staleness trap.** Because branches must be up to date, a PR opened while another is still in
flight goes `BEHIND` the instant that other one merges. Auto-merge stays armed but blocks. GitHub
does not update the branch for you. Refresh it with:

```sh
gh pr update-branch <number>          # equivalently: git merge origin/main && git push
```

Never `git reset --hard` or force-push to fix this — a plain merge of `origin/main` is what GitHub's
own "Update branch" button does, and it rewrites no history.

This is the single best reason to **work strictly one PR at a time**: branch off `main`, land it,
then branch the next one off the new `main`.

---

## 4. Verification (do this, not just tests)

The dev server is preconfigured. Use the preview tooling, never `npm run dev` via Bash:

```
preview_start  →  name: "plano-dev"   (from .claude/launch.json, port 8085)
```

Then: navigate to the affected route, `preview_resize` to desktop (e.g. 1440×900) **and** mobile,
`preview_screenshot` for the visual, and `preview_inspect` / `preview_eval` to assert **computed**
values against the spec — that is far stronger proof than a screenshot. Things worth measuring:

- hero `font-size` lands in the 96–128px band; `line-height` ≈ 0.92
- feed building-name in the 48–60px band
- imagery `border-radius: 0px`
- lime only where sanctioned (scan for `rgb(190, 255, 0)`)
- `tracking-widest` computes to 0.15em (2.4px at 16px)

Open the designed `screens/<screen>.html` the same way to compare side by side.

### Environment gotchas (these will cost you an hour each)

- **There is no `Grep` tool** in this harness. Use `grep` through Bash.
- The shell is **zsh**, which does **not** word-split unquoted `$var`. `perl -pi -e '…' $files`
  silently edits nothing. Pipe the file list through `xargs` instead.
- Tests have **no global testing-library cleanup**. Add `afterEach(cleanup)` per test file or
  renders accumulate and `getByRole` finds duplicates.
- Programmatic `.focus()` does **not** trigger `:focus-visible` in Chrome, so a focus ring will not
  render. Assert the ring by reading the token / class instead.
- **The warning ratchet treats any new bucket as baseline 0.** Adding a new *warn*-level ESLint rule
  fails CI on its first occurrence. New rules must be **error**-level on already-clean paths.
- `src/components/ui/chart.tsx` carries a documented `eslint-disable` — its `#ccc`/`#fff` are
  Recharts' own hardcoded strokes matched by attribute selector, not colours Plano applies.
- **File-size ratchet:** pages ≤ 800 lines, components ≤ 400, hooks ≤ 300, other ≤ 400. Oversized
  files are grandfathered but **must not grow** — extract sub-components. Watch
  `BuildingDetails.tsx` (**2905 lines**) and `Profile.tsx` (**1518 lines**).
- The **pre-push hook** (`.githooks/pre-push`) re-runs lint + typecheck + unit tests. Under load —
  a full `npm run check` plus a running dev server and headless browser — vitest can fail
  spuriously there even though it passes on its own. Stop the preview server
  (`preview_stop`) and push again. **Never** bypass it with `--no-verify`.

---

## 5. The PRs

Owner files verified present. Each row: branch → files → designed screen → the deltas already known.

### [ ] PR 2 · Feed — the signature surface

- **Branch:** `design/feed-conformance` · **Screen:** `screens/feed.html`
- **Files:** `src/features/feed/pages/Index.tsx`, `src/features/feed/components/EditorialFeedPost.tsx`,
  `FeedEditorialEyebrow.tsx`, `FeedPostByline.tsx`, `FeedSidebar.tsx`
- **Known deltas:**
  - The right rail is **`w-[280px]`** (`Index.tsx:341`, the `<aside>`); `LAYOUT-AND-CHROME.md`
    specifies a **320px sticky** rail. This was deliberately deferred from the chrome PR.
  - Feed items must be **unboxed** (no border/bg/shadow), imagery `radius-none`, 64–96px gaps.
  - Building names use `.headline` (48–60px); section headers are tiny uppercase `.eyebrow`s.
  - `FeedPostByline` already renders earned-only dots correctly — migrate it to `RatingDots`.
- **Cross-check:** `docs/FEED_REDESIGN_BRIEF.md`, `docs/FEED_REDESIGN_ROADMAP.md`.

### [ ] PR 3 · Building detail

- **Branch:** `design/building-detail-conformance` · **Screen:** `screens/building-detail.html`
- **Files:** `src/features/buildings/pages/BuildingDetails.tsx` (**2905 lines — do not grow it**),
  `src/features/buildings/components/PersonalRatingButton.tsx`
- **Known deltas:**
  - Full-bleed 16/9 hero (or `.photo-placeholder`), hard-left name + inline `RatingDots`.
  - Actions become editorial `.cta-link`s (`LOG VISIT →`, `SAVE →`, `REVIEW →`, `DIRECTIONS →`),
    not filled buttons.
  - Reading column is `max-w-4xl` (currently `max-w-5xl`); hairline-separated reviews; ≥64px between
    sections.
  - `PersonalRatingButton`'s **popover still renders three fill-left-to-right toggle slots with empty
    rings.** Replace with `MichelinRatingInput`. (Its trigger display was already fixed.)
  - Extract sub-components to respect the file-size ratchet.

### [ ] PR 4 · Landing

- **Branch:** `design/landing-conformance` · **Screen:** `screens/landing.html`
- **Files:** `src/features/feed/components/landing/{LandingHero,LandingNav,LandingMarquee,LandingFeatureGrid,LandingFooter}.tsx`
- **Known deltas:** giant `.display` hero (italicise exactly one word), **one** lime CTA
  (`<Button variant="accent">`) plus one `.cta-link`, ≥96px of air beneath, featured bands.

### [ ] PR 5 · Profile + credits

- **Branch:** `design/profile-credits-conformance` · **Screens:** `profile.html`, `architect.html`,
  `person.html`, `practice.html`
- **Files:** `src/features/profile/pages/Profile.tsx` (**1518 lines**),
  `src/features/profile/components/{InlineRating,ProfileListView,RecommendationCard,KanbanColumn}.tsx`,
  `src/features/credits/pages/{PersonDetails,CompanyDetails}.tsx`
- **Known deltas:**
  - `InlineRating`'s **interactive** path is still a three-slot toggle row with empty rings
    (`fill-transparent text-text-secondary/20`). Replace with `MichelinRatingInput`. Its read-only
    path already uses `RatingDots`.
  - ⚠️ `src/features/profile/components/ProfileListView.test.tsx` asserts *"InlineRating renders 3
    buttons, each with a circle inside"* — that test **must be updated** with the rework.
  - Quiet text tabs, not pills. Avatar + `.meta-code` counts. Entries as feed items or a 168px
    mosaic (`spacing-collection-mosaic`, `mosaic-gap` 1.5px).

### [ ] PR 6 · City + guides

- **Branch:** `design/city-guides-conformance` · **Screens:** `city.html`, `guides.html`
- **Files:** `src/features/localities/pages/LocalityPage.tsx`, `src/features/guides/GuidesPage.tsx`

### [ ] PR 7 · Map / explore / itinerary

- **Branch:** `design/map-explore-conformance` · **Screens:** `search-map.html`, `explore.html`,
  `itinerary.html`
- **Files:** `src/features/search/SearchPage.tsx`, `src/features/explore/pages/Explore.tsx`,
  `src/features/collections/components/CollectionMapPage.tsx`
- **Known deltas:** SERP column is 400px (`spacing-search-serp` token already exists); map markers
  are `currentColor` and **never lime**; nav over the map may use the `glass` utility; Explore uses
  the **inverse** `BottomNav` variant.

### [ ] PR 8 · Events + connect + notifications

- **Branch:** `design/events-connect-notifications-conformance` · **Screens:** `events.html`,
  `connect.html`, `notifications.html`
- **Files:** `src/features/events/pages/Events.tsx`, `src/features/connect/pages/Connect.tsx`,
  `src/features/notifications/pages/Notifications.tsx`

### [ ] PR 9 · Auth flows

- **Branch:** `design/auth-conformance` · **Screens:** `sign-in.html`, `onboarding.html`
- **Files:** `src/features/auth/pages/Auth.tsx`, `src/features/auth/pages/Onboarding.tsx`
- **Known deltas:** sign-in becomes a split screen (dark `.photo-placeholder` panel + form),
  collapsing to one column below 900px. Onboarding is a narrow, centred, stepped form.

### [ ] PR 10 · Settings + admin

- **Branch:** `design/settings-admin-conformance` · **Screens:** `settings.html`, `admin.html`
- **Files:** `src/features/profile/pages/Settings.tsx`, `src/features/admin/**`
- **Note:** these are the **only** surfaces where a sidebar and boxed form cards are legitimate
  (admin card = 1px `border-default`, white fill, `radius-sm`, no shadow).

### [ ] PR 11 · Compose + empty/loading/error states

- **Branch:** `design/compose-states-conformance` · **Screens:** `post.html`, `add-building.html`,
  `states.html`
- **Files:** `src/pages/Post.tsx`, `src/features/buildings/pages/AddBuilding.tsx`, plus the
  empty/loading/404 compositions across list and detail surfaces
- **Known deltas:** `post.html` is the canonical home of the four-tier rating input. `states.html` is
  a spec reference, not a route: empty states are a quiet uppercase eyebrow + one imperative
  sentence + one `.cta-link` — never a blank panel, never an illustration.

---

## 6. Cross-cutting debt (burn down per surface, don't do it in one PR)

Measured on `main` after the foundation merged:

| Debt | Count | How it dies |
|---|---|---|
| `tracking-[0.15em]` arbitrary values | **239** | Now redundant — `tracking-widest` *is* 0.15em. Collapse the ones in the files your PR already touches. |
| Raw hex in `src/features` + `src/pages` | **31** across 12 files | Replace with token aliases as you touch each surface. |
| ESLint raw-hex guard coverage | `components/ui` + `components/layout` only | Once a feature directory is clean, widen the `files` glob in `eslint.config.js`. |

Do **not** attempt a repo-wide sweep of these — it produces an unreviewable diff and will collide
with every surface PR. Fold each into the PR that already owns the file.

**Not ported on purpose:** the design system's blanket "no raw px" rule
(`design-system/_adherence.oxlintrc.json`). It contradicts `.cursor/rules/03-frontend.mdc`, which
treats *structural* utilities (`min-h-[120px]`, `w-[3.25rem]`) as unrestricted and governs only
*visual* tokens. There are ~590 such values and most are legitimate.

---

## 7. Reference map

| Need | File |
|---|---|
| The narrative bible | `design-system/README.md` |
| Page composition recipes | `design-system/claude-code-package-v2/design-system/PATTERNS.md` |
| Component contracts | `…/COMPONENTS.md` |
| Responsive shell, nav, rail | `…/LAYOUT-AND-CHROME.md` |
| Order of work + gates | `…/MIGRATION.md` |
| Token → Tailwind mapping | `…/TOKENS-AND-TAILWIND.md` |
| The "is this Plano?" gate | `…/CHECKLIST.md` |
| Who wins on conflict | `…/SOURCE-OF-TRUTH.md` |
| Copy & voice | `…/VOICE-AND-CONTENT.md` |
| Focus, contrast, motion | `…/ACCESSIBILITY.md` |
| Token values (repo spec) | `docs/DESIGN_TOKENS.md` |
| Runtime tokens + utilities | `src/index.css` |
| Screen → owning file | `docs/DESIGN_SYSTEM_SCREEN_INVENTORY.md` |
| Repo QA gate | `docs/DESIGN_SYSTEM_QA_CHECKLIST.md` |
| The 23 pixel targets | `design-system/ui_kits/web/screens/*.html` |
