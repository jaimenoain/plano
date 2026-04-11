# Implementation Roadmap: Card System Overhaul

---

## Phase 1 — Foundation: Types, Scoring & Spec Resolution

---

**[x] Task 1.1 — Define `CardSpec` types and extend `FeedReview` user type**

- Add `CardSpec` type with `layout`, `imageWeight`, `textWeight`, `prominence` fields to `src/types/cards.ts` (new file)
- Add `AggregatedFeedItem` type extensions to support `spec` field passthrough (non-breaking, optional for now)
- Extend `FeedReview["user"]` in `src/types/feed.ts` to include `followers_count: number | null`
- Ensure `followers_count` is selected in the relevant Supabase feed queries (check `useFeed`, `useSuggestedFeed`)
- Add JSDoc on every type explaining the intent of each variant value

**Verify:** TypeScript compiles with no errors. No runtime behaviour changes.

---

**[x] Task 1.2 — Implement `resolveCardSpec()` pure function with full test coverage**

- Create `src/features/feed/utils/resolveCardSpec.ts`
- Implement logic: `imageWeight` from `images.length` (0 / 1 / 2 / 3+); `textWeight` from `content` word count (none <1 / snippet <20 / body <150 / essay 150+); `layout` derived from combination of imageWeight + textWeight; `prominence` from `likes_count > 50 || followers_count > 500 || is_verified_architect || is_architect_of_building`
- Handle all nulls and edge cases (missing user, missing building images, broken URLs)
- Write exhaustive unit tests in `src/features/feed/utils/resolveCardSpec.test.ts` covering every archetype combination (minimum 20 cases: no content+no images, essay+no images, essay+gallery, snippet+single image, verified architect, high-likes, etc.)
- Export function from `src/features/feed/index.ts`

**Verify:** `vitest run resolveCardSpec` passes all tests. Pure function with zero imports from React or Supabase.

---

**[x] Task 1.3 — Add card design tokens to `tailwind.config.ts` and `DESIGN_TOKENS.md`**

- Add to `tailwind.config.ts` theme extension: `cardImageRatio` (hero `16/9`, standard `4/3`, compact `1/1`), `cardTextClamp` utility values, `cardElevation` box-shadow tokens
- Add semantic CSS custom properties to the global stylesheet (`src/index.css` or equivalent) under a `/* Card tokens */` section: `--card-image-ratio-hero`, `--card-image-ratio-standard`, `--card-image-ratio-compact`, `--card-text-clamp-snippet` (2), `--card-text-clamp-body` (4), `--card-elevation-elevated`
- Update `docs/DESIGN_TOKENS.md` with a new **Card Tokens** section documenting each token, its value, and which archetypes use it
- Do not yet change any component — tokens only

**Verify:** Custom properties are visible in browser devtools on any page. `DESIGN_TOKENS.md` documents all new tokens.

---

## Phase 2 — Component Architecture: Split `ReviewCard`

*Depends on: Task 1.1*

---

**[x] Task 2.1 — Extract `useReviewCardData()` hook**

- Create `src/features/feed/hooks/useReviewCardData.ts`
- Move all data-preparation logic out of `ReviewCard`: media item construction (video + images), `subTitle` assembly (credits + year + address), `city` extraction, `username`/`avatarUrl`/`userInitial` derivation, `action` label, carousel vs. single-image decision
- Hook returns a single `ReviewCardData` object — no JSX, no side effects other than the existing `failedImages` state
- Import and use this hook inside the existing `ReviewCard` temporarily (no visible change) to validate the extraction
- Add a type export for `ReviewCardData`

**Verify:** Existing `ReviewCard` tests pass unchanged. No visible UI difference.

---

**[x] Task 2.2 — Create `ReviewCardFeed` component**

- Create `src/features/feed/components/ReviewCardFeed.tsx`
- Accepts `entry: FeedReview` and `onLike`, `onImageLike`, `onComment` callbacks — no `isDetailView`, no `hideBuildingInfo`, no `imagePosition` prop
- Uses `useReviewCardData()` and `resolveCardSpec()` internally to self-determine layout
- Implements the non-detail-view branch of the current `ReviewCard` verbatim, referencing the new card tokens from Task 1.3 for image ratios and text clamp
- Renders `prominence: 'elevated'` with a subtle visual distinction (e.g. slightly heavier building name weight, or a thin brand-color left border — TBD in superadmin playground in Phase 3)
- Add basic render test (smoke test, no snapshot)

**Verify:** Side-by-side visual comparison with current `ReviewCard` in the feed shows identical output for standard cases.

---

**[x] Task 2.3 — Create `ReviewCardDetail` component**

- Create `src/features/feed/components/ReviewCardDetail.tsx`
- Accepts `entry: FeedReview`, `hideUser?: boolean`, `hideBuildingInfo?: boolean`, `onLike`, `onComment`
- Implements the `isDetailView === true` branch of the current `ReviewCard` verbatim
- Uses `useReviewCardData()` for data prep
- Remove `imagePosition` prop — detail view always uses fixed layout

**Verify:** `BuildingDetails` page renders identically. Existing `BuildingDetails.test.tsx` passes.

---

**[x] Task 2.4 — Migrate call sites and deprecate legacy `ReviewCard`**

- Update `src/features/buildings/pages/BuildingDetails.tsx` to import `ReviewCardDetail`
- Update `src/features/profile/components/DraggableReviewCard.tsx` to import `ReviewCardFeed`
- Update all feed pages (`Index.tsx`, `Fit.tsx` if it exists, any other call site found via `grep ReviewCard`) to import `ReviewCardFeed`
- Add `@deprecated` JSDoc to `ReviewCard.tsx` — do **not** delete it yet
- Update `FeedHeroCard` if it internally uses `ReviewCard`

**Verify:** `grep -r "from.*ReviewCard" src` returns only the deprecated file itself and the new components. All existing tests pass.

---

## Phase 3 — Superadmin Card Playground

*Depends on: Tasks 1.2, 1.3, 2.2, 2.3*

---

**[x] Task 3.1 — Create card fixture data**

- Create `src/features/superadmin/fixtures/cardFixtures.ts`
- Define a `CardFixture` type: `{ id: string, label: string, description: string, entry: FeedReview }`
- Implement at minimum 16 fixtures covering every meaningful combination:
  - No content, no images, visited
  - No content, no images, pending (bucket list)
  - Snippet text only (< 20 words)
  - Essay text only (> 150 words)
  - Single user image, no text
  - Single user image + snippet
  - Single user image + essay
  - 3 user images, no text
  - 3 user images + essay
  - Video + no text
  - Verified architect, essay + gallery
  - High-likes (> 50), snippet
  - Architect of building, no text, no images
  - Broken image URL
  - Very long building name (> 60 chars)
  - Building with no address / city
- Each fixture's `entry` must be a fully valid `FeedReview` mock (all required fields populated)

**Verify:** TypeScript compiles. Fixtures file exports a typed array with exactly the documented cases.

---

**[x] Task 3.2 — Build the superadmin card playground page**

- Create route `/superadmin/cards` in the router, guarded by a simple `is_superadmin` check on the user profile (or a `VITE_SUPERADMIN_EMAILS` env list for now)
- Create `src/features/superadmin/pages/CardPlayground.tsx`
- Layout: left sidebar with fixture list grouped by archetype; main area shows the selected card rendered at realistic feed width
- Render `ReviewCardFeed` and `ReviewCardDetail` side-by-side for the selected fixture
- Show the computed `CardSpec` from `resolveCardSpec()` as a small debug panel below each card (layout, imageWeight, textWeight, prominence values)
- Add a "Show all" mode that renders all fixtures in a scrollable grid for quick visual scanning

**Verify:** Navigate to `/superadmin/cards`, all 16+ fixtures render without errors. CardSpec panel updates correctly per fixture.

---

**[x] Task 3.3 — Add interactive controls to the playground**

- Add a control panel (collapsible) above the card preview with sliders/inputs:
  - `imageCount`: 0–8 (dynamically splices/adds images to the fixture)
  - `wordCount`: 0–500 (truncates or pads `entry.content`)
  - `likesCount`: 0–200
  - `followersCount`: 0–2000
  - Toggles: `isVerifiedArchitect`, `isArchitectOfBuilding`, `hasBrokenImage`, `hasVideo`
- Controls mutate a local copy of the selected fixture's entry via `useState`
- `CardSpec` debug panel updates reactively as sliders move
- Add a "Reset to fixture defaults" button

**Verify:** Moving `imageCount` slider from 0 to 4 causes visible layout change in the card. `CardSpec.imageWeight` updates from `none` to `gallery` in the debug panel.

---

**[x] Task 3.4 — Add background and viewport controls to the playground**

- Add a toolbar with background presets matching actual page contexts: Feed (white/dark), BuildingDetail panel, Profile page background
- Add viewport size presets: Mobile (375px), Tablet (768px), Desktop (1280px) — the card preview area resizes accordingly
- Add a side-by-side diff mode: renders the same fixture with and without `prominence: 'elevated'` for quick visual comparison
- Add a "Copy fixture as JSON" button for each fixture for use in bug reports

**Verify:** Switching to "Mobile 375px" and "BuildingDetail" background visually matches what a real user would see on a phone in that context.

---

## Phase 4 — Integrate `resolveCardSpec` into Feed Rendering

*Depends on: Tasks 1.2, 2.2, 3.x (playground must exist to validate visual output)*

---

**[x] Task 4.1 — Attach `spec` to `AggregatedFeedItem` in `aggregateFeed`**

- Update `AggregatedFeedItem` union in `src/features/feed/utils/aggregateFeed.ts` — add optional `spec?: CardSpec` to `hero`, `compact`, and `activity` variants
- Call `resolveCardSpec(entry)` inside `aggregateFeed` when creating each item and attach the result
- Update `collapseIntoRows` to forward `spec` into `RowCell`
- **Do not yet change rendering** — spec is computed but ignored at render time

**Verify:** Add a temporary `console.log` in `renderSocialCard` confirming `item.spec` is populated for every item type. All existing aggregateFeed tests pass.

---

**[x] Task 4.2 — Drive `ReviewCardFeed` layout from `CardSpec`**

- Update `ReviewCardFeed` to accept an optional `spec?: CardSpec` prop (falls back to calling `resolveCardSpec` internally if not provided)
- Use `spec.imageWeight` to choose between single-image, two-up grid, and carousel layouts (replace current `useCarousel` boolean logic)
- Use `spec.textWeight` to apply correct `line-clamp` class (snippet → 2 lines, body → 4 lines, essay → unclamped with "Read more" expansion)
- Use `spec.prominence === 'elevated'` to apply the elevated visual treatment finalised in the playground
- Use `spec.layout` to switch between the vertical-stack and side-by-side image+text layouts

**Verify:** In the playground, adjusting sliders causes visually distinct layouts. In the live feed, high-follower cards appear with elevated treatment.

---

**[x] Task 4.3 — Pass `spec` from feed page down to card components**

- In `Index.tsx` `renderSocialCard`, pass `item.spec` to `ReviewCardFeed` for `hero` and `compact` items
- Update `FeedHeroCard` to receive and use `spec` (or call `resolveCardSpec` internally — whichever is cleaner given its current structure)
- Remove any now-redundant boolean logic in `aggregateFeed` that was previously driving layout decisions (e.g. the `hasUserImages → hero` shortcut can remain for aggregation purposes but should no longer duplicate what `spec` conveys)

**Verify:** Network tab shows no additional requests. Feed renders identically for standard entries. Elevated entries now show distinct treatment.

---

## Phase 5 — Cleanup & Documentation

*Depends on: All prior phases*

---

**[x] Task 5.1 — Delete legacy `ReviewCard` and remove deprecated usages**

- Confirm zero non-test imports of `ReviewCard` via `grep`
- Delete `src/features/feed/components/ReviewCard.tsx`
- Update any remaining test files that mock `ReviewCard` to mock the new components instead
- Run full test suite and fix any breakages

**Verify:** `grep -r "ReviewCard" src` returns zero results outside of git history. Test suite passes.

---

**[x] Task 5.2 — Update `COMPONENT_SPEC.md` with card archetype documentation**

- Add a **Card System** section to `docs/COMPONENT_SPEC.md`
- Document each of the 5 archetypes (hero-gallery, hero-text, standard, minimal, elevated) with: trigger conditions, layout description, which component renders it, and the `CardSpec` values that correspond to it
- Add a diagram (ASCII or Mermaid) showing the decision tree from `FeedReview` → `resolveCardSpec` → `CardSpec` → component layout
- Add a note on the superadmin playground and how to use it for design iteration

**Verify:** A new engineer can read the section and understand how to add a new card archetype without reading source code.

---

**[x] Task 5.3 — Add `resolveCardSpec` to the superadmin playground's "all fixtures" grid with spec labels**

- In the "Show all" grid mode, render a badge under each card showing its archetype name (derived from `CardSpec` fields)
- Highlight any fixture where the computed spec differs from the fixture's intended archetype (i.e. a fixture labelled "essay+gallery" that resolves to `layout: 'compact'` would show a warning)
- This acts as a regression test for `resolveCardSpec` — if a future code change breaks the scoring, the mismatches are immediately visible

**Verify:** All 16 fixtures display their expected archetype label. No mismatches shown in the warning layer.