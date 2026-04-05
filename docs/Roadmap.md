# Phase 7 — Feed Redesign: Cursor Implementation Roadmap

## Pre-conditions (human, before Cursor starts anything)

- All four C7 component files are committed to the repo at their exact paths
  with the design-review fixes applied:
  - `src/features/feed/components/FeedActivityCard.tsx`
  - `src/features/feed/components/FeedCollectionCard.tsx`
  - `src/features/feed/components/SectionDivider.tsx`
  - `src/features/feed/components/ColdStartFeed.tsx`
- P7-0 stability gate has passed (`build`, `typecheck`, `lint`, `test` all
  green, baseline test count recorded).
- Migration will be applied manually via the Supabase SQL Editor after Cursor
  produces the file in P7-2 — do not `supabase db push`.

---

## Phase 1 — Type & Aggregation Foundations

### [x] P7-1A — Extend feed types and wire `main_image_url` into `useFeed`

**Files:** `src/types/feed.ts`, `src/features/feed/hooks/useFeed.ts`

- In `ReviewBuilding`, add `main_image_url?: string | null` as a new optional
  field. This is the image source for `FeedActivityCard` and unblocks the
  cast currently in that component.
- Add three new exported interfaces to `src/types/feed.ts`:
  - `CollectionPreviewBuilding { building_id: string; name: string; main_image_url: string | null }`
  - `RawCollectionFeedRow` — raw RPC shape with snake_case fields including
    `primary_tag: string | null`, `owner: { username, avatar_url }`,
    `preview_buildings: CollectionPreviewBuilding[]`, `building_count: number`
  - `FeedCollection` — camelCase DTO with `primaryTag: string | null`,
    `owner: { id, username, avatarUrl }`, `previewBuildings`, `buildingCount`
- In `useFeed.ts`, inside the `feedData.map()` building object, add:
  `main_image_url: review.building_data?.main_image_url || null`
- Run `npm run typecheck` and confirm no new errors.

**Verify:** `typecheck` passes. The `main_image_url` field is available on
`entry.building` throughout the feed feature without any type cast.

**Dependencies:** C7 files committed.

---

### [x] P7-1B — Extend `feed-aggregation.ts` and write unit tests

**Files:** `src/lib/feed-aggregation.ts`, `src/lib/feed-aggregation.test.ts`
(create if it does not exist)

- Extend the `AggregatedFeedItem` union with two new members and export a
  `RowCell` type:
  ```ts
  | { type: 'activity'; entry: FeedReview; activityStatus: 'visited' | 'pending' }
  | { type: 'row'; left: RowCell; right: RowCell }

  export type RowCell =
    | { type: 'compact';  entry: FeedReview }
    | { type: 'activity'; entry: FeedReview; activityStatus: 'visited' | 'pending' }
  ```
- Add **Rule 0 — Activity Exemption** at the very top of the `for` loop in
  `aggregateFeed`, before the existing Gold Dust Exemption (Rule A). An entry
  qualifies if: `!review.content`, `!review.rating`,
  `(!review.images || review.images.length === 0)`,
  `(review.status === 'visited' || review.status === 'pending')`, and
  `!!review.building.main_image_url`. When all five conditions are true, flush
  any pending cluster, push `{ type: 'activity', entry, activityStatus }`, and
  `continue`. Entries missing `main_image_url` fall through to Rules A and B.
- Add a `collapseIntoRows` function after `aggregateFeed` and call it as the
  final step before returning. Pairing rules: only two items of the **same
  type** are ever paired (`compact+compact` or `activity+activity`). A compact
  next to an activity, a cluster next to anything, or any hero item is never
  paired. A lone item at the end of a run stays full-width.
- Write unit tests covering these exact cases:
  - Two compact items → one `'row'` item
  - Three compact items → one `'row'` + one `'compact'`
  - Compact followed by activity → two separate full-width items (not paired)
  - Cluster between two compact items → cluster full-width; compacts on either
    side are not paired across it
  - Activity-eligible entry with no `main_image_url` → falls through to compact
  - Activity-eligible entry with `main_image_url` → becomes `'activity'`
  - `collapseIntoRows([])` → `[]`
  - `collapseIntoRows([oneItem])` → `[oneItem]` unchanged

**Verify:** `npm run test` passes with all new cases green.

**Dependencies:** P7-1A (for `FeedReview['building'].main_image_url` used in
Rule 0 and `RowCell` referencing `FeedReview`).

---

## Phase 2 — Data Layer

### [x] P7-2 — SQL migration and `useCollectionsFeed` hook

**Files:** `supabase/migrations/YYYYMMDDHHMMSS_add_get_collections_feed.sql`
(new), `src/features/feed/hooks/useCollectionsFeed.ts` (new),
`src/features/feed/index.ts`

- Create the migration file. Substitute the real UTC timestamp. The function
  must use `SECURITY DEFINER SET search_path = public`, be `STABLE`, and be
  granted to `authenticated` / revoked from `anon`. The SELECT must include:
  - Collection fields: `id`, `name`, `slug`, `description`, `updated_at`,
    `owner_id`
  - `owner` as `jsonb_build_object('username', p.username, 'avatar_url',
    p.avatar_url)` joined from `profiles`
  - `preview_buildings` — a subquery returning up to 4 buildings from
    `collection_items` (where `is_hidden = false`) joined to `buildings`,
    returning `building_id`, `name`, `main_image_url`, ordered by
    `ci.order_index`
  - `building_count` — a COUNT subquery on `collection_items` where
    `is_hidden = false`
  - `primary_tag` — a subquery joining `collection_items → buildings →
    building_attributes → attributes → attribute_groups` where
    `ag.slug = 'style'`, ordered by `ci.order_index`, limit 1, returning
    `a.name`
  - WHERE clause: `c.is_public = true` AND `c.owner_id IN (SELECT following_id
    FROM follows WHERE follower_id = (SELECT auth.uid()))`
  - ORDER BY `c.updated_at DESC`, LIMIT `p_limit`, OFFSET `p_offset`
- Create `useCollectionsFeed.ts` using `useInfiniteQuery` with page size 5.
  The `queryFn` calls `supabase.rpc('get_collections_feed', { p_limit,
  p_offset })`. The mapping from `RawCollectionFeedRow` to `FeedCollection`
  must camelCase all fields including `primary_tag → primaryTag` and
  `owner.avatar_url → owner.avatarUrl`.
- Export `useCollectionsFeed` from `src/features/feed/index.ts`.
- Note for the human operator: apply the migration via the Supabase SQL Editor
  before UAT begins. Cursor produces the file; the human applies it.

**Verify:** `npm run typecheck` passes. The hook imports `FeedCollection` and
`RawCollectionFeedRow` from `@/types/feed` without errors. The migration file
exists at the correct path with a valid timestamp prefix.

**Dependencies:** P7-1A (for `FeedCollection` and `RawCollectionFeedRow` types).

---

## Phase 3 — Feed Orchestration

### [x] P7-3 — Rewrite `Index.tsx` to integrate all feeds and card types

**Files:** `src/features/feed/pages/Index.tsx` only.

Do not begin this task until P7-1A, P7-1B, and P7-2 are all complete, and all
four C7 files are confirmed present in the repo.

- **Imports.** Add: `FeedActivityCard`, `FeedCollectionCard`, `SectionDivider`,
  `ColdStartFeed`, `useCollectionsFeed`. Remove: `AllCaughtUpDivider`,
  `ExploreTeaserBlock`, `EmptyFeed`, `ReviewCard`.
- **State and effect cleanup.** Remove the `showGroupActivity` state variable,
  its setter `useEffect` (the one triggered by `location.state?.reviewPosted`),
  and any call to `setShowGroupActivity`. If `useFeed` still accepts
  `showGroupActivity`, pass `showGroupActivity: true` as a hardcoded constant
  so the hook signature is not broken.
- **Hook wiring.** Add `useCollectionsFeed({ enabled: !!user })` and derive
  `collectionItems` via `useMemo`. Change `useSuggestedFeed` to
  `enabled: !!user` (always-on — no longer gated on social exhaustion).
  Remove the `shouldFetchDiscovery` variable. Derive `discoveryReviews` via
  `useMemo`.
- **Load-more effect.** Update the single `isLoadMoreVisible` `useEffect` to
  paginate all three feeds in priority order: social first, then collections
  if social is exhausted, then discovery. Add `collectionsFeed` to the
  dependency array.
- **Cold-start branch.** Replace the `socialReviews.length === 0` render path
  — swap `<EmptyFeed />` for `<ColdStartFeed discoveryReviews={discoveryReviews}
  onLike={discoveryFeed.toggleLike} onImageLike={discoveryFeed.toggleImageLike}
  isDiscoveryLoading={discoveryFeed.isLoading} />`.
- **Feed render loop.** Replace the existing `aggregatedReviews.map(...)` block
  with a `forEach` that pushes into a `feedNodes` array. Use three plain `let`
  variables (not state, not refs): `collectionCursor = 0`, `discoveryCursor = 0`,
  `hasShownDivider = false`. After every 4th social item: inject the next
  collection card if available. After every 8th social item: if not yet shown,
  push `<SectionDivider label="From the community" href="/explore" />` and set
  the flag; then push the next discovery item as `<FeedHeroCard>`.
- **`renderSocialCard` helper.** Implement as an inner function with a `switch`
  over all five `AggregatedFeedItem` types: `'hero'` → `<FeedHeroCard>`;
  `'activity'` → `<FeedActivityCard size="hero">` with `activityStatus`;
  `'compact'` → `<FeedCompactCard>`; `'cluster'` → `<FeedClusterCard>`;
  `'row'` → a `<div className="grid grid-cols-2 gap-2.5 w-full">` containing
  two `renderRowCell` calls.
- **`renderRowCell` helper.** Returns `<FeedActivityCard size="compact">` for
  `activity` cells and `<FeedCompactCard>` for `compact` cells.
- **Remove** the old `!socialFeed.hasNextPage` discovery block entirely (the
  section that rendered `<AllCaughtUpDivider>`, `<ExploreTeaserBlock>`, and
  `discoveryReviews.map(post => <ReviewCard .../>)`).

**Verify:** `npm run typecheck` passes on `Index.tsx` with zero unhandled
union-member warnings. The page renders in the browser without a runtime crash
for a logged-in user with social activity.

**Dependencies:** P7-1A, P7-1B, P7-2, all four C7 files in the repo.

---

## Phase 4 — Quality & Spec Sync

### [x] P7-97 — Build, typecheck, lint, and test gate

**Files:** `src/lib/feed-aggregation.test.ts` and any test file that asserts
on components removed from `Index.tsx`.

- Run `npm run typecheck`. Fix any remaining errors. Common sources:
  - Any file outside `Index.tsx` that imports `AggregatedFeedItem` (e.g.
    tests for `FeedClusterCard`) and doesn't handle the new `'activity'` or
    `'row'` members — add exhaustive checks or narrowing.
  - Missing `RowCell` import in files that reference it.
- Run `npm run lint`. Fix any `any` usage introduced without `// eslint-disable`
  justification.
- Run `npm run test`. Update tests that assert on the presence of `<EmptyFeed>`,
  `<AllCaughtUpDivider>`, or `<ExploreTeaserBlock>` in the `Index.tsx` render
  tree — those components are no longer rendered there. Do not delete the
  component files themselves.
- Run `npm run build`. Fix any bundle errors.

**Verify:** All four commands exit 0. Passing test count is equal to or
greater than the baseline recorded in P7-0.

**Dependencies:** P7-3.

---

### [x] P7-99 — Spec sync

**Files:** `docs/DATA_CONTRACT.md`, `docs/PRD.md`, `docs/Roadmap.md`,
`.ai-status.md`

- **`DATA_CONTRACT.md` — Collections Domain Component 3:** Add
  `get_collections_feed` to the API Route Registry table
  (`GET | (RPC) get_collections_feed | Authenticated | Collections feed for
  followed users`). Add the three new DTOs (`CollectionPreviewBuilding`,
  `RawCollectionFeedRow`, `FeedCollection`) with their full field lists
  including `primaryTag`.
- **`DATA_CONTRACT.md` — User Library Domain Component 3:** Confirm
  `main_image_url` appears on the `ReviewBuilding` joined fields block of
  `UserBuildingDTO`. Add it if missing.
- **`PRD.md` — Social/Feed section:** Add a note after the existing feed
  description that non-review `user_buildings` activity (visited and
  bucket-list status changes) and collection updates from followed users
  surface as dedicated card types (`FeedActivityCard`, `FeedCollectionCard`)
  alongside review-based cards.
- **`Roadmap.md`:** Append a `## Phase 7 Summary` block containing: actual
  completion date, a bulleted list of all seven delivered tasks (P7-1A,
  P7-1B, P7-2, P7-3, P7-97, P7-99, and the four C7 Claude tasks), any
  items descoped or deferred with a one-line reason, and the list of spec
  documents updated.
- **`.ai-status.md`:** Set Current Phase to "Phase 7 — Feed Redesign:
  complete". Add all tasks to Completed Tasks. Update
  `CURRENT_ARCHITECTURE_SNAPSHOT` to reflect: `FeedActivityCard` (activity
  status events, hero+compact sizes), `FeedCollectionCard` (mosaic card,
  collection updates), `SectionDivider` (hairline divider, optional `/explore`
  link), `ColdStartFeed` (replaces `EmptyFeed`), `useCollectionsFeed`
  (infinite query, `get_collections_feed` RPC), extended `AggregatedFeedItem`
  union (`'activity'`, `'row'`, `RowCell`), `EmptyFeed` retired from
  `Index.tsx` (file kept). Remove any KNOWN_ISSUES entries resolved in this
  phase.

**Verify:** All four documents are updated. Running `grep` for any hardcoded
hex values (e.g. `#BEFF00`) or arbitrary pixel values in the four new
component files returns nothing — all visual values trace to a token class.

**Dependencies:** P7-97.

---

## Phase 7 Summary

**Completion date:** 2026-04-05

**Delivered tasks**

- **P7-1A** — Feed types (`ReviewBuilding.main_image_url`, `CollectionPreviewBuilding`, `RawCollectionFeedRow`, `FeedCollection`) and `useFeed` mapping.
- **P7-1B** — `feed-aggregation`: `activity` / `row` / `RowCell`, Rule 0, `collapseIntoRows`, unit tests.
- **P7-2** — Migration `get_collections_feed` + `useCollectionsFeed` infinite query and feed barrel export.
- **P7-3** — `Index.tsx` orchestration: interleaved social, collections, discovery; `ColdStartFeed`; card helpers; load-more priority.
- **P7-97** — Quality gate (typecheck, lint, test, build).
- **P7-99** — Spec sync: `DATA_CONTRACT.md`, `PRD.md`, `Roadmap.md`, `.ai-status.md`; `DESIGN_TOKENS.md` + `tailwind.config.ts` aligned for feed micro type and mosaic spacing tokens; C7 components use token classes only (no hex / `[Npx]` in class names).
- **C7 (four design-review component tasks)** — `FeedActivityCard.tsx`, `FeedCollectionCard.tsx`, `SectionDivider.tsx`, `ColdStartFeed.tsx` committed with review fixes as pre-phase artefacts.

**Descoped / deferred**

- None for Phase 7 deliverables. Applying `get_collections_feed` in production remains a manual Supabase SQL Editor step for the operator (per P7-2).

**Spec / config documents updated**

- `docs/DATA_CONTRACT.md` — `get_collections_feed` registry + RPC inventory; `CollectionPreviewBuilding`, `RawCollectionFeedRow`, `FeedCollection`; `BuildingSummaryDTO.mainImageUrl`.
- `docs/PRD.md` — Home feed note for activity + collection card types; RPC inventory row for `get_collections_feed`.
- `docs/Roadmap.md` — This summary; P7-99 marked complete.
- `docs/DESIGN_TOKENS.md` — `fontSize` `2xs` / `2xs-plus`; spacing `collection-mosaic` / `mosaic-gap`.
- `tailwind.config.ts` — Same theme extensions as documented.
- `.ai-status.md` — Phase 7 closure snapshot.