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
| ✅ | 2 · Feed | **Merged** — [#1524](https://github.com/jaimenoain/plano/pull/1524) |
| ✅ | 3 · Building detail | **Merged** — [#1526](https://github.com/jaimenoain/plano/pull/1526) |
| ✅ | 4 · Landing | **Merged** — [#1527](https://github.com/jaimenoain/plano/pull/1527) |
| ✅ | 5 · Profile + credits | **Merged** — [#1528](https://github.com/jaimenoain/plano/pull/1528) |
| ✅ | 6 · City + guides | **Merged** — [#1529](https://github.com/jaimenoain/plano/pull/1529) |
| ✅ | 7 · Map / explore / itinerary | **Merged** — [#1530](https://github.com/jaimenoain/plano/pull/1530) |
| ✅ | 8 · Events + connect + notifications | Auto-merge armed |
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
*"require branches to be up to date"* enabled. Repo-level auto-merge is **on**, and so is
*"automatically delete head branches"*.

So a conformance PR merges itself the moment it is green. Immediately after opening it:

```sh
gh pr merge <number> --auto --merge
```

That arms auto-merge; GitHub lands the PR as soon as all 9 checks pass, then deletes the remote
branch for you. **Do not merge by hand, and do not wait for a human.** If a check fails, auto-merge
stays armed — push the fix and it lands.

Do not pass `-d`/`--delete-branch` alongside `--auto`: `gh` only deletes the branch when it performs
the merge itself, so with auto-merge armed the flag is silently ignored. Branch cleanup is the repo
setting's job. Your local copy of the branch survives, so after the PR lands:

```sh
git checkout main && git pull && git fetch --prune   # drops the stale origin/<branch> ref
git branch -d <branch>                               # delete the local copy
```

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

### [x] PR 2 · Feed — the signature surface

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

### [x] PR 3 · Building detail

- **Branch:** `design/building-detail-conformance` · **Screen:** `screens/building-detail.html`
- **Files:** `src/features/buildings/pages/BuildingDetails.tsx` (was 2905 lines, now ~1700 after
  extraction — do not grow it back), `src/features/buildings/components/PersonalRatingButton.tsx`,
  plus new `BuildingHeader.tsx`, `BuildingDetailHero.tsx`, `RelatedBuildings.tsx`, `BuildingMapTab.tsx`,
  `NotePhotoGrid.tsx`, `PendingPhotosQueue.tsx`, `BuildingInfoSection.tsx`, `BuildingInfoTab.tsx`,
  `StreamAuthorAttribution.tsx`.
- **Known deltas (as originally scoped):**
  - Full-bleed 16/9 hero (or `.photo-placeholder`), hard-left name + inline `RatingDots`.
  - Actions become editorial `.cta-link`s (`LOG VISIT →`, `SAVE →`, `REVIEW →`, `DIRECTIONS →`),
    not filled buttons.
  - Reading column is `max-w-4xl` (currently `max-w-5xl`); hairline-separated reviews; ≥64px between
    sections.
  - `PersonalRatingButton`'s **popover still renders three fill-left-to-right toggle slots with empty
    rings.** Replace with `MichelinRatingInput`. (Its trigger display was already fixed.)
  - Extract sub-components to respect the file-size ratchet.
- **Delivered:** hero → `.photo-placeholder`/16:9 photo split into `BuildingDetailHero.tsx` (named
  `Detail`-prefixed — `BuildingHero.tsx` already exists and is live on `LocalityPage.tsx` with a
  different contract); title/badges/meta/stats/actions consolidated into one `BuildingHeader.tsx`
  (`.headline`, `max-w-4xl`, no more hero/no-hero duplication); `PersonalRatingButton` now wraps
  `MichelinRatingInput` in both `inline` and `popover` variants; Share/Add-credits/Directions are now
  `.cta-link`s; reading column is `max-w-4xl` at the header/tab-bar/tab-content wrappers; ≥64px gaps
  at the hero→header, header→tab-bar, tab-content-top and overview→related-buildings boundaries; both
  `tracking-[0.15em]` occurrences in the page collapsed to `tracking-widest`; page split into 9
  sub-components (file-size ratchet, mechanical in Phase A + the 2 new design components in Phase B).
- **Deferred / flagged, not done this PR:**
  - Inline `RatingDots` next to the header name — there is no per-building aggregate rating field
    distinct from individual users' scores (`tier_rank` is a percentile popularity label, not a 1–3
    score); left out rather than fake it. Needs a product decision + possibly a new column/RPC.
  - The persistent right sidebar (Action card / Map card / Credits preview / Building Info) was not
    removed, even though `DESIGN_TOKENS.md`/`CHECKLIST.md` call for single-column `max-w-4xl` reading
    surfaces with no sidebar on content-detail pages. Only the max-width was narrowed; removing the
    sidebar is a larger structural rewrite left for a follow-up.

### [x] PR 4 · Landing

- **Branch:** `design/landing-conformance` · **Screen:** `screens/landing.html`
- **Files:** `src/features/feed/pages/Index.tsx` (the `Landing()` composition),
  `src/features/feed/components/landing/{LandingHero,LandingNav,LandingFeatureGrid}.tsx`, plus new
  `LandingStatsBand.tsx`, `src/features/feed/api/landingStatsApi.ts`,
  `src/features/feed/hooks/useLandingStats.ts`. `LandingMarquee.tsx` and `LandingFooter.tsx` deleted.
- **Known deltas (as originally scoped):** giant `.display` hero (italicise exactly one word), **one**
  lime CTA (`<Button variant="accent">`) plus one `.cta-link`, ≥96px of air beneath, featured bands.
- **Delivered:** hero is now `.display` (measured **128px** / lh 0.92 / −5.76px tracking at 1440,
  falling to the 56px clamp floor on mobile), hard-left rather than centred, headline copy aligned to
  the page's own `<title>` — "The world's *architecture*, cataloged." — with `architecture` the one
  italic word; the eyebrow became the single sanctioned `.accent-tag` lime pill; the CTA row is one
  `<Button variant="accent">` (the page's only lime button — the hand-written `bg-brand-primary`
  override is gone from both hero and nav) beside one `.cta-link` → `/search`, the map;
  `LandingMarquee` (invented architect initials, meaningless base-36 codes, two **gradient** fade
  masks) replaced by `LandingStatsBand`, a hairline 1px-gutter band of **live** Supabase counts;
  `LandingFooter` deleted in favour of the app's black `SiteFooter` (`AppLayout` renders it once
  `showFooter={false}` is dropped); `LandingNav`'s raw `rgba(250,250,250,0.95)` → `bg-surface-default/92
  backdrop-blur-md`, matching `AppTopNav`; feature-grid `h3`s 20px → 24px, gap 40px → 48px, and its
  raw inline `style={{ opacity }}` replaced with token utilities.
- **The stats band takes no migration.** `buildings`, `localities`, `people`, `companies` and
  `profiles` all grant anonymous `SELECT` (`USING (true)`), so five `head: true, count: "exact"`
  queries run un-authenticated. Note `profiles.role` is nullable — a bare `.neq("role", "test_user")`
  would drop every NULL row, so the filter is `.or("role.is.null,role.neq.test_user")`.
- **Each cell carries a `minimum`.** A cell renders only once its count reaches it, so no hollow `0`
  and no weak number can land on the page. Buildings/Cities/Architects sit at `1`; **Members is
  gated at 1,000** — the live count is 15 pre-launch, and the cell will surface itself. Live values
  at time of writing: 18,127 buildings · 6,292 cities · 16,448 architects & practices.
- **Deferred / flagged, not done this PR:**
  - The design's *Featured Collection* band (two-column headline + 4-up 4:5 image mosaic at 1.5px
    hairline gutters). It needs a curated-collection query and real photography; inventing either
    would breach the no-mock-data rule. Follow-up.
  - The hero's framer-motion entrance renders the `<h1>` at `opacity: 0` until hydration, so the LCP
    element is invisible if JS never runs. Pre-existing, not introduced here — worth its own fix.

### [x] PR 5 · Profile + credits

- **Branch:** `design/profile-credits-conformance` · **Screens:** `profile.html`, `architect.html`,
  `person.html`, `practice.html`
- **Files:** `src/features/profile/pages/Profile.tsx` (was 1519 lines, now 1334 after extraction —
  do not grow it back),
  `src/features/profile/components/{InlineRating,ProfileListView,RecommendationCard,KanbanColumn}.tsx`,
  plus new `ProfileHero.tsx`, `ProfileStatsBand.tsx`, `ProfileTabs.tsx`, `EditorialBuildingCard.tsx`;
  `src/features/credits/pages/{PersonDetails,CompanyDetails}.tsx` and
  `src/features/credits/components/{PersonCreditCard,CompanyCreditCard}.tsx`
- **Known deltas (as originally scoped):**
  - `InlineRating`'s **interactive** path was a three-slot toggle row with empty rings
    (`fill-transparent text-text-secondary/20`). Replace with `MichelinRatingInput`. Its read-only
    path already uses `RatingDots`.
  - ⚠️ `ProfileListView.test.tsx` asserted *"InlineRating renders 3 buttons, each with a circle
    inside"* — that test **must be updated** with the rework.
  - Quiet text tabs, not pills. Avatar + `.meta-code` counts. Entries as feed items or a 168px
    mosaic (`spacing-collection-mosaic`, `mosaic-gap` 1.5px).
- **Delivered:** `InlineRating`'s interactive path is now a `Popover` — trigger shows `RatingDots`
  (or a quiet `RATE` eyebrow when unrated), content is `MichelinRatingInput`; the same shape
  `PersonalRatingButton` took in PR 3, so no empty rings survive anywhere on these surfaces. The
  clear-on-reclick gesture is gone: tier 0 *Interesting* is a real earned tier that renders as no
  dots, so it reads identically to unrated. The two remaining hand-rolled `Circle` ladders —
  `RecommendationCard`'s numeric `● 2` badge and `KanbanColumn`'s three-ring header — both became
  `RatingDots`, and `KanbanColumn`'s ghost copy stopped saying *"Drag here to rate 2/3"* (it now
  names the tier). Profile hero rebuilt to `screens/profile.html`: round **104px** avatar, `.headline`
  name (measured 60px / lh 0.92 / −1.8px tracking at 1440, 40px at the mobile clamp floor), a new
  hairline `ProfileStatsBand` (Buildings · Collections · Followers · Following, 1px gutters, 2 columns
  below `sm` because four 0.15em labels do not fit across 375px), and `ProfileTabs` — quiet text tabs
  with `.meta-code` counts beside the label, replacing the old *"metrics ARE the tabs"* number-stack.
  `EditorialBuildingCard` moved to a 4:3 sharp image with a 20px name and inline `RatingDots`;
  `RecommendationCard` unboxed (no border/fill, `.photo-placeholder` fallback). Credits pages: both
  `h1`s → `.headline`, bios → `.body-relaxed max-w-[60ch]`, tier headers → `.eyebrow` + right-aligned
  zero-padded `.meta-code` count over a hairline, credit thumbs → **168px** `w-collection-mosaic` with
  `.photo-placeholder` fallbacks and mono years. **A person is drawn round, a practice square**
  (`person.html` vs `practice.html`); the company stewards list, being people, went round too.
  `text-secondary` (a missing `text-` prefix, so no colour at all) fixed at `CompanyDetails.tsx:212`;
  all 25 `tracking-[0.15em]` occurrences in the touched files collapsed to `tracking-widest`.
- **Verified:** no `rgb(190, 255, 0)` anywhere on `/profile/:username`, `/person/:slug` or
  `/company/:slug`; entry-grid and credit-row imagery all `border-radius: 0px`; avatar `50%` on
  profile, square on company; both file-size and warning baselines **ratcheted down** (Profile.tsx
  1519 → 1334; deep-feature imports 635 → 634).
- **Deferred / flagged, not done this PR:**
  - `InlineRating`'s popover could not be driven in the preview browser: the list view sits inside an
    `AnimatePresence mode="wait"` whose exit never settles while the tab reports
    `visibilityState: hidden`, so the grid→list swap hangs. Its behaviour is covered by
    `ProfileListView.test.tsx` instead; the same Radix-popover/`MichelinRatingInput` pair was driven
    live on the building-detail page. Worth fixing the stall itself in PR 11 (states).
  - `Profile.tsx` is still **1334 lines**, over the 800-line page budget. Four components came out;
    the Photos/About/Collections sections and the drag-and-drop plumbing are the remaining bulk.
  - `CompanyDetails.tsx` (846) was left over budget — this PR only shrank its markup, not its
    steward/claim/dispute logic.

### [x] PR 6 · City + guides

- **Branch:** `design/city-guides-conformance` · **Screens:** `city.html`, `guides.html`
- **Files:** `src/features/localities/pages/LocalityPage.tsx` (was 1401 lines, now 254 after
  extraction — it has **left the file-size baseline**, do not grow it back), the eleven new
  `src/features/localities/components/*.tsx`, `src/features/guides/GuidesPage.tsx`,
  `src/features/guides/{LocalityCard,CollectionGuideCard}.tsx`
- **Known deltas (as originally scoped):** none were pre-recorded; the sweep found four.
  1. *Type hedged* — the city name was `text-3xl md:text-5xl lg:text-6xl` (30→60px) against the
     kit's `clamp(56px, 8vw, 104px)`; the guides hero capped at 48px against the kit's 72px.
  2. *Boxed where it should float* — `LocalityTopBuildings`' hero tile and its five secondary cards
     each carried `border border-border-default`, as did the guides featured `LocalityCard`.
  3. *No lime at all* — every `→` was typed into the label as a literal glyph, so the sanctioned
     hover-arrow lime never appeared anywhere on either surface.
  4. *Grey boxes* — photo-less slots rendered a flat `bg-surface-muted`, a centred `Building2` icon,
     or the words "No images", never `.photo-placeholder`.
- **Delivered:** the city name is now `.display` (measured **128px** / lh 0.92 / −5.76px tracking at
  1440, falling to the 56px clamp floor on mobile) in both the photographic and typographic-fallback
  variants; the photo credit became `.meta-code`; stat values settled at `text-4xl font-bold` (kit:
  38px/700). `LocalityTopBuildings` is unboxed — the 16/9 hero keeps its scrim and overlaid name
  (pushed to 30px), while the five secondary cards lost their borders **and** their gradient scrims:
  the 4/3 image now carries the year and name *below* it in black type, per `.tb-card-yr` /
  `.tb-card-name`. Nine hand-rolled arrow links across both surfaces became `.cta-link`, which
  injects the `→` and its lime hover — that hover, plus the "Explore map" quick action's arrow
  (`group-hover:text-brand-accent`, the kit's `.city-action.hl:hover .ar`), is the *only* lime on
  either page. On guides, the hero became `.headline` (60px at 1440, 40px at the mobile floor); the
  featured `LocalityCard` was unboxed with its name below a 4/3 image that is grayscale until hover
  (`.city-card .ph`); the compact card's count became `.meta-code`; `CollectionGuideCard` gained the
  same grayscale reveal and a `.photo-placeholder` for empty previews; zone padding went 48px → 56px.
  Both `SectionLabel`s collapsed `tracking-[0.15em]` → `tracking-widest`, and the five `text-[10px]`
  in touched city sections became `text-2xs`. The raw-hex ESLint guard now covers
  `src/features/localities/**` and `src/features/guides/**` (both were already clean).
- **Verified:** no `rgb(190, 255, 0)` anywhere at rest on `/architecture/fr/paris` or `/guides`;
  `tracking-widest` computes to exactly 0.15em; all imagery `border-radius: 0px`; all 14 city card
  links and the guides featured cards compute `border-width: 0px`; hero tile measures 16/9 and the
  secondary cards 4/3; every `.cta-link` label is free of a literal `→` while its `::after` supplies
  one; no horizontal overflow at 375px. Both baselines **ratcheted down** (LocalityPage.tsx left
  `.file-size-baseline.json` entirely; deep-feature imports 634 → 633).
- **Deferred / flagged, not done this PR:**
  - The guides hero renders at 60px against the kit's 72px ceiling. `.headline` (40–60px) is the
    nearest sanctioned utility — `.display` (up to 128px) would blow out the 640px inner column —
    and hardcoding the kit's `clamp(44px, 7vw, 72px)` would introduce a raw value. Closing the gap
    needs a new editorial type step, i.e. a foundation change, not a surface PR.
  - Guides keeps its `max-w-[1440px]` container (the kit's `.doc-wide` is 1200px). It is a discovery
    index, not a `max-w-4xl` reading surface, so the width was left alone.
  - The continent tabs and map filter chips stay black-filled pills. Both kits draw them that way;
    `PATTERNS.md`'s "quiet text tabs, not pills" governs the profile surface.

### [x] PR 7 · Map / explore / itinerary

- **Branch:** `design/map-explore-conformance` · **Screens:** `search-map.html`, `explore.html`,
  `itinerary.html`
- **Files:** `src/features/maps/components/BuildingSidebar.tsx` (**the real `/search` SERP row** — see
  below), `src/features/search/components/{DiscoveryBuildingCard,DiscoveryList}.tsx`,
  `src/features/posts/components/DiscoveryCard.tsx` (the Explore card, misfiled in `posts/`) plus new
  `DiscoveryAwardOverlay.tsx`, `src/features/explore/pages/Explore.tsx`,
  `src/features/collections/components/{CollectionMapPage,ItineraryList,CollectionBuildingCard}.tsx`,
  `src/features/maps/{constants.ts,constants/mapMarkerFills.ts,utils/pinStyling.ts}` and
  `components/{MapMarkers,ItineraryRoutes}.tsx`, plus new `src/features/maps/index.ts` (barrel),
  `src/components/ui/rating-dots.tsx`, `src/components/ui/michelin-rating-input.tsx`.
- **Trap for the next reader — `/search` does not render `DiscoveryBuildingCard`.** The name says
  otherwise and `SearchPage.tsx` gives no hint, but `DiscoveryBuildingCard` + `DiscoveryList` render
  **only** inside `AddBuildingsToCollectionDialog`, a modal picker. The SERP row you see at `/search`
  is hand-rolled inside `BuildingSidebar.tsx`. Browser verification caught this after the "SERP" work
  had already been done on the wrong component; both were fixed, but check what a route actually
  mounts before styling it.
- **Known deltas (as originally scoped):** SERP column is 400px (`spacing-search-serp` token already
  exists); map markers are `currentColor` and **never lime**; nav over the map may use the `glass`
  utility; Explore uses the **inverse** `BottomNav` variant.
- **The lime markers had a root cause, not a style.** `constants/mapMarkerFills.ts` declared
  `brandPrimary: "#BEFF00"` beneath a comment promising its values mirror `src/index.css`. When the
  brand redesign flipped `--brand-primary` from lime to near-black `#171717`, this mirror was never
  updated, and every Tier-S pin, Tier-3 cluster and itinerary marker went on painting itself lime —
  under `text-white` / `text-brand-primary-foreground` labels, so it was a contrast failure too. The
  fix is one character-for-character value; the key name was right all along. `DAY_COLORS` was
  likewise eight *identical* lime strings, so the itinerary map had never actually distinguished its
  days.
- **Delivered:** `MAP_MARKER_FILL.brandPrimary` → `#171717`; `brandSecondary` (`#F7FFE0`, a lime wash
  with no surviving token) deleted; the three photography-gap hexes folded in as `--feedback-*`
  mirrors, so the file is now the *only* hex in `src/features/maps` and carries a documented
  file-level `eslint-disable` (precedent: `chart.tsx`). Rings inverted with the fills — Tier S and
  Tier-3 clusters are black faces with **white** 2px rings (`border-text-primary` on a black face was
  black-on-black), matching the kit's `.pin .dot`. `DAY_COLORS` → `DAY_ROUTE_OPACITY` +
  `getDayRouteOpacity()`: routes are one black ink separated by opacity (kit strokes Day 1 at 0.6,
  Day 2 at 0.35), which *restores* a day distinction that never existed. Itinerary markers rebuild
  their `classes` rather than append, because `border-gray-600` and `border-white` would otherwise
  race in the stylesheet — Tailwind resolves that by rule order, not class order. The collection map
  went monochrome (owner decision): status and rating ladders now read black → white → muted instead
  of green/orange and gold/silver/bronze. On `/search`, the SERP row (`BuildingSidebar`) was already
  unboxed, but its name hedged at **14px/600** against the kit's 19px/700 — the commonest cause of a
  flat Plano screen — so it went to `text-lg font-bold tracking-tight`; its hand-rolled dot ladder,
  whose `aria-label="Rating: 3"` announced a **score** to screen readers, became `RatingDots`
  ("3 distinctions"); its flat grey "No image" box became a labelled `.photo-placeholder`; the typed
  `Add building →` became a `.cta-link`; hover tint and eyebrow tracking aligned to the kit. The modal
  picker row (`DiscoveryBuildingCard`) left its `<Card>` for an unboxed hairline row, lost the
  `rounded-md` compact thumb, dropped `font-black` — **weight 900, which the system bans outright** —
  to `text-xl font-bold`, swapped its `Circle` ladder for `RatingDots`, and traded an `amber-500/600`
  award chip (raw palette) for a monochrome hairline badge; the year became `.meta-code`;
  `DiscoveryList`'s boxed skeletons and its `space-y-4` gutter went, so rows sit flush and their
  hairlines form one continuous rule. On
  `/explore`, the award overlay's bare numerals `1 2 3` (and `1 pt` / `2 pts`) — the exact "X out of
  3" reading the award model exists to avoid — became the named tiers **Impressive / Essential /
  Masterpiece**, each with its own earned dots, extracted to `DiscoveryAwardOverlay.tsx`;
  `RatingDots` gained `tone="inverse"` (the kit's `.rdot.inv`) for the black stage; `AWARD_TIERS` is
  now exported from `MichelinRatingInput` so every surface names the tiers identically; the card name
  became `.headline`; and "Next building →" became a `.cta-link`, whose injected arrow is the one
  sanctioned lime on the surface. Four arbitrary tracking/size values in `Explore.tsx` collapsed to
  `tracking-widest` / `text-2xs`. The itinerary rail took two new tokens
  (`--spacing-collection-rail` 396px, `-narrow` 360px) against the kit's `.col-shell`; its `h1` went
  20px → 24px; `shadow-xl` left the dialog; day cards went `rounded-lg bg-surface-muted/30` →
  `rounded-sm bg-surface-card` (kit `.day` — boxed, but never tinted).
- **Verified in the browser:** no `rgb(190, 255, 0)` at rest across every computed
  `background/color/border/fill/stroke` **and** `::before`/`::after` on `/search` (877 elements),
  `/explore` (689) and two collection maps; the only lime left on `/explore` is
  `.cta-link:hover::after`. Tier-S pin faces compute `rgb(23, 23, 23)` with a white 2px ring (6 of 64
  pins); SERP name computes 18px/700/−0.54px; SERP thumbs `border-radius: 0px`; the award renders as
  "3 distinctions", and zero `aria-label^="Rating:"` nodes survive; the photo-less slot renders a
  `.photo-placeholder` labelled "No photo"; the collection rail measures exactly 396px and its `h1`
  24px/700; itinerary day cards compute `border-radius: 2px` on a white fill; `tracking-widest`
  computes to 2.4px at 16px (= 0.15em); no horizontal overflow at 375px. The Explore award overlay
  reads **SAVE · IMPRESSIVE · ESSENTIAL · MASTERPIECE** with white (`.rdot.inv`) dots and a
  `.cta-link` whose `::after` supplies the `→`. Both baselines **ratcheted down**
  (deep-feature imports 633 → 631; `CollectionMapPage.tsx` 1677 → 1668, `DiscoveryCard.tsx`
  837 → 777, `BuildingSidebar.tsx` 598 → 593). The raw-hex guard now covers `src/features/{search,explore}/**/*.tsx` and
  `src/features/maps/**/*.{ts,tsx}` — maps is the first directory guarded as `.ts` too, since every
  hex it ever held lived in `.ts`, which is exactly how the lime survived six conformance PRs.
- **Deferred / flagged, not done this PR:**
  - **Custom collection categories now render identically on the map.** Members pick a colour per
    category and monochrome markers cannot carry it, so `CollectionSettingsDialog`'s colour picker is
    a control with no effect on the map (it still tints the sidebar legend in
    `CollectionBuildingCard`). Settings is PR 10's surface, so the picker was left alone. Resolve it
    by either re-encoding custom categories monochromatically — the kit numbers its itinerary pins,
    `.pin .num` — or retiring the picker.
  - `src/features/collections/**` therefore **cannot** join the raw-hex ESLint guard: that picker
    stores member-chosen hexes as *data*, not as design tokens.
  - The photography-gap overlay keeps its red/amber/green. It is a data-coverage heatmap, not a place
    marker — the one map layer that stays chromatic. Its hexes are now `--feedback-*` mirrors.
  - `glass` was **not** adopted on `/search`. The utility hardcodes `border-b`, which suits a top bar;
    both candidates there are floating pills needing a full hairline, and `search-map.html` itself
    renders its nav solid above the split rather than over the map. Forcing it would have been a
    regression.
  - `BottomNav` already ships the inverse (dark) treatment on `/explore`, keyed off
    `location.pathname` rather than a `variant` prop. The appearance conforms; the API shape does not,
    and that file is global chrome owned by PR 1.
  - `pinStyling.ts` still carries `border-gray-600` (raw Tailwind palette, not hex, so the guard is
    silent). Three marker tests assert that exact class; retiring it wants its own change.
  - `CollectionMapPage.tsx` (1668) and `ItineraryList.tsx` (878) remain over the 400-line component
    budget. Both shrank or held; neither was extracted, since the colour block collapsed enough to
    absorb this PR's edits.

### [x] PR 8 · Events + connect + notifications

- **Branch:** `design/events-connect-notifications-conformance` · **Screens:** `events.html`,
  `connect.html`, `notifications.html`
- **Files:** `src/features/events/pages/Events.tsx`,
  `src/features/events/components/{EventHeroCard,EventGridCard,eventFormat}.tsx`,
  `src/features/connect/pages/Connect.tsx`,
  `src/features/connect/components/{UserRow,PeopleYouMayKnow,YourContacts}.tsx`,
  `src/features/notifications/pages/Notifications.tsx` plus new
  `src/features/notifications/components/NotificationRow.tsx` and `src/features/notifications/types.ts`.
- **The black unread dot had a root cause, not a style.** `Notifications.tsx` painted its unread dot
  `bg-brand-primary` and called it, in two comments, "the neon dot … the only brand accent on this
  surface". It was written on 2026-04-07 (`4f26168f`), when `--brand-primary` *was* `#BEFF00`. Twenty
  days later the brand redesign (`39692fdf`) flipped that token to near-black `#171717` and the dot
  went dark in silence. **This is PR 7's lime-marker bug running backwards**: there a stale *mirror* of
  a token stayed lime; here a live token *alias* changed underneath a name that no longer meant what it
  said. The bell that points at these rows was swept by PR 1 and is correctly `bg-brand-accent`
  (`AppTopNav.tsx:227`, `MobileTopBar.tsx:66`, `Header.tsx:128`); only the rows it points at were
  missed. Kit: `.nt-unread{width:6px;height:6px;background:var(--brand-accent)}`, and §2 lists the
  unread dot among the four sanctioned limes. Fixed, and pinned by a regression test.
- **`/events` held the repo's last banned lime *and* its last banned weight.** `EventDateTile` painted
  the weekday and month `text-brand-accent`, and `EventHeroCard`'s "Featured" eyebrow did the same —
  decorative lime, a bug under §2. All four surviving feature-level `font-black` (weight **900**, which
  the system bans outright; PR 7 removed the last one from `DiscoveryBuildingCard`) lived here.
- **Delivered:** the featured event became the kit's `.ev-hero` — a **bordered two-column article**
  (`1.35fr 1fr`, measured 633/469 at 1440, stacking below `md`), photo left, black-on-white body right.
  Its full-bleed 21/9 photo, its `bg-linear-to-t from-black/75` **gradient** scrim (gradients are
  banned) and its white-on-photo text are gone; `backgroundImage` now computes `none`, `box-shadow:
  none`, `border-radius: 0px`, `border-width: 1px`. `EventDateTile` — a black tile with big lime
  numerals, used as a photo *substitute* — was deleted; photo-less events now render
  `.photo-placeholder` captioned with the event name, like every other surface, and the date survives
  as the new **`EventDateCard`** (kit `.ev-datecard`: 64px, hairline, black month band over the day
  numeral). Grid-card names went `text-base font-black` (16px/900) → `text-2xl font-bold tracking-tight`
  (24px/700, kit 22px) — the single biggest hedged-type hit on the surface; the hero name
  `text-2xl sm:text-4xl font-black` → `text-4xl font-bold`. The `formatEventChip` overlay chip left the
  imagery and the date moved below it as `.meta-code`; `formatEventChip` and `organiserAvatarUrl` were
  deleted with their last call sites. Three literal `→` glyphs across `/events` and `/notifications`
  became `.cta-link`s, whose injected `::after` arrow is now the **only** lime on `/events`. All three
  `h1`s (`Upcoming events`, `Connect`, `Notifications`) collapsed to `.headline` — one utility, one
  treatment, measured 60px/lh 0.92 at 1440 and 40px at the mobile clamp floor. On `/connect`, both
  `UserRow` hovers used `bg-brand-secondary`; that token used to be the lime wash `#F7FFE0` and the
  redesign quietly redefined it to `#F5F5F5` — identical to `--surface-muted`, so the name had outlived
  its meaning: swapped to `hover:bg-surface-muted`, matching the kit's `.ur:hover` and the notification
  rows. `UserRow`'s two layouts disagreed on the name weight (`font-medium` vs `font-semibold`);
  reconciled to the kit's 500. `YourContacts`' metric counts went 16px → `text-xl` (kit 20px/700).
  `Notifications`' `award_win` Trophy dropped `text-amber-500` — the only raw palette colour in the
  three features, and one the file's own header comment claimed did not exist — for
  `text-text-secondary` (kit `#525252`). The page's 330-line row renderer, icon map and copy switches
  moved to `NotificationRow.tsx` (707 → 291 lines), which is what made the dot testable at all: the page
  mounts `useAuth` + Supabase, the row mounts nothing. Ten `tracking-[0.15em]` in the touched files
  collapsed to `tracking-widest`; `text-[11px]` → `text-2xs-plus`; the no-op `pt-8 : pt-8` ternary went.
- **Verified in the browser:** no `rgb(190, 255, 0)` at rest across every computed
  `background/color/border/fill/stroke` **and** `::before`/`::after` on `/events` (340 elements) or
  `/connect` (446); on `/notifications` (367) the **only** lime is the unread dot, which computes
  `rgb(190, 255, 0)` at exactly `6px × 6px` with `border-radius: 0px`. `.cta-link:hover::after` still
  resolves to `var(--brand-accent)`. Zero elements compute `font-weight: 900` on any of the three. The
  hero measures `border-width: 1px` / `box-shadow: none` / `background-image: none`; all event imagery
  `border-radius: 0px`; grid name 24px/700, hero name 36px/700. `.eyebrow` computes 1.5px tracking at
  10px (= 0.15em). The row trophy computes `rgb(82, 82, 82)`, the heart `rgb(239, 68, 68)`. No
  horizontal overflow at 375px on any of the three. The raw-hex guard now covers
  `src/features/{connect,notifications}/**/*.{ts,tsx}`; the deep-feature baseline **ratcheted down**
  (631 → 630).
- **The featured hero and the unread dot do not render on live data.** No event in the database has a
  cover image, and the QA account has no notifications, so both were driven with a temporary local stub
  (reverted, and grep-verified gone) and are pinned by `EventHeroCard.test.tsx` /
  `NotificationRow.test.tsx`. Three test files, 18 tests, are the first ever written for these features.
- **Deferred / flagged, not done this PR:**
  - The kit gives every event card a type eyebrow (`EXHIBITION` / `TOUR` / `TALK`). **There is no column
    behind it** — `events` has no `event_type`, and inventing one would breach the no-mock-data rule.
    The slot instead carries `organiserLine()` ("Community shared" / "Hosted by …"), which is real. A
    genuine type label needs a migration plus a `SubmitEvent` field.
  - `src/features/events/**` **cannot** join the raw-hex guard yet: `EventDetail.tsx:305` paints its
    hero `style={{ color: "#ffffff" }}` beside two raw `rgba(…)` inline styles. The listing surface is
    clean; clearing only the one literal the selector can see, while leaving its two siblings, would be
    gaming the guard. It belongs to whichever PR sweeps the detail surface.
  - `EventProfileCard.tsx` (rendered on `/profile`, not `/events`) still carries `font-black` and an
    unlabelled `bg-surface-muted` empty box. It is PR 5's surface, not this one.
  - Events keeps its `max-w-6xl` container (kit's inner column is 1120px). It is a discovery index, not
    a `max-w-4xl` reading surface — the precedent PR 6 set for `/guides`.
  - The events hero renders its name at 36px against the kit's 38px. `text-4xl` is the nearest
    sanctioned step; `text-[38px]` would introduce a raw value.

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
| `tracking-[0.15em]` arbitrary values | **189** (234 before the landing PR, 233 before profile+credits, 207 before city+guides, 205 before map+explore, 202 before events+connect+notifications) | Now redundant — `tracking-widest` *is* 0.15em. Collapse the ones in the files your PR already touches. |
| Raw hex in `src/features` + `src/pages` | **21** across 11 files (31/12 before PR 7) | Replace with token aliases as you touch each surface. The lime map markers are **fixed** (PR 7). Two remaining `#BEFF00` strings are prose in comments, not literals. `src/features/maps/constants/mapMarkerFills.ts` is the one *sanctioned* hex mirror — MapLibre portals markers outside the CSS-variable cascade — and carries a documented `eslint-disable`. |
| ESLint raw-hex guard coverage | `components/ui` + `components/layout` + `features/feed` + `features/buildings` + `features/localities` + `features/guides` + `features/search` + `features/explore` + `features/connect` + `features/notifications` + `features/maps` (the last three **`.ts` and `.tsx`**) | Once a feature directory is clean, widen the `files` glob in `eslint.config.js`. Guard `.ts` too where colour constants live — that is how the lime markers survived six PRs. `features/collections` is blocked: its category colour picker stores hexes as user data. `features/events` is blocked on `EventDetail.tsx`'s `#ffffff` plus two raw `rgba()` inline styles — its *listing* surface is already clean. |

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
