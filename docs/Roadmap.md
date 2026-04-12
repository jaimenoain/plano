## Phase 1 — Foundation

---

**[x] Task 1 — Replace card type system with `CardType` discriminator and `resolveCardType`**

- Delete `CardLayout`, `CardProminence`, `CardTextWeight`, `CardImageWeight`, and `CardSpec` from `src/types/cards.ts`; replace with `export type CardType = 'A' | 'B' | 'C' | 'activity'`
- Create `src/features/feed/utils/resolveCardType.ts` exporting `resolveCardType(entry: FeedReview): CardType` with the four branches: no content + no images → `'activity'`; images + no content → `'C'`; content + no images → `'A'`; content + images → `'B'`
- Include null-safe guards for missing `entry.images`, empty `entry.content`, and `video_url` (a video with no review text resolves to `'C'`, with review text resolves to `'B'`)
- Export two helper constants used by card components: `CARD_B_HEIGHT = 320` (px, the fixed grid height) and `CARD_C_IMAGE_HEIGHT = 185` (px, the fixed image crop height)
- Write a `resolveCardType.test.ts` covering all four branches plus edge cases (empty string content, images array present but empty)

**Verify:** `resolveCardType` unit tests pass; TypeScript compiler reports no remaining references to the deleted types.

**Dependencies:** None.

---

**[x] Task 2 — Extract shared card sub-components**

- Create `src/features/feed/components/card-parts/` directory with an `index.ts` barrel
- `ActivityLead.tsx` — renders `username reviewed / visited / wants to visit` at `10px` uppercase tracking with `font-medium` on the username; accepts `username: string`, `verb: string`, `hideUser?: boolean`
- `BuildingHeadline.tsx` — renders building name with size variant prop `'xl' | 'lg' | 'md'` mapping to `52px / 36px / 28px font-black tracking-tight leading-none`; hard line-clamp: xl = 2, lg = 2, md = 1; accepts `name: string`, `size: 'xl' | 'lg' | 'md'`
- `BuildingSubtitle.tsx` — renders architect credits, year, city joined with `·` at `10px` uppercase; accepts `subTitle`, `city`, both optional
- `CardFooter.tsx` — renders likes button, separator, comments button, bookmark; accepts `likesCount`, `commentsCount`, `isLiked`, `isSaved`, `onLike`, `onComment`, `onSave`; bookmark uses `opacity-0 group-hover:opacity-100` on desktop, always visible on mobile
- Keep `PointsBadge` in place but move it into `card-parts/` and re-export from the barrel

**Verify:** All five components render in isolation with no TypeScript errors; existing components that import `PointsBadge` still compile after the move.

**Dependencies:** Task 1.

---

**[x] Task 3 — Build `CardImage` — fixed-dimension image/video component**

- Create `src/features/feed/components/card-parts/CardImage.tsx`
- Accepts `items: ReviewCardMediaItem[]`, `height: number`, `className?: string`, `reviewId: string`, `onImageLike?`
- If `items` is empty, renders a `bg-surface-muted` placeholder at the specified height
- Single image: `<img>` at `w-full h-full object-cover rounded-none` inside a `div` styled to `height` px; `onError` falls back to the placeholder
- Video: renders `<VideoPlayer>` inside a fixed-height container with `overflow-hidden`
- Two images: `grid grid-cols-2 gap-[2px]` contact sheet, each cell at `height` px, both `object-cover`
- Three or more images: renders `<FeedPhotoCarousel>` constrained to `height` px
- Animate image load: starts `opacity-0`, transitions to `opacity-100` on `onLoad` to prevent flash

**Verify:** Renders all four states (empty, single, pair, carousel) at the exact pixel height passed in; `object-cover` confirmed visually by passing a portrait and landscape image.

**Dependencies:** Task 1 (for `ReviewCardMediaItem` type).

---

## Phase 2 — Card Components

---

**[x] Task 4 — Build `CardTypeA` — review without photo**

- Create `src/features/feed/components/CardTypeA.tsx`
- Layout: single full-width column, no grid; `cursor-pointer group/card`
- Slot order: `ActivityLead` → `BuildingHeadline size="xl"` → `BuildingSubtitle` → `PointsBadge` → review body (`text-base leading-relaxed text-text-secondary`, hard `line-clamp-3`) → "Read more →" button (shown only when content exceeds 3 lines and essay is not expanded) → `CardFooter`
- Expand-in-place on "Read more →": local `essayExpanded` state removes the clamp; `useEffect` resets it on `entry.id` change
- Architect-of-building indicator: `border-l-2 border-l-text-primary pl-4` on the root article when `isArchitectOfBuilding` is true
- Wrap in `<SuggestedContentBlock>` for suggested entry treatment
- Click handler navigates to building or review; suppresses navigation when a child button is clicked

**Verify:** Card renders at roughly 170–200px natural height with three sample entries of varying content length; "Read more →" only appears when content exceeds three lines.

**Dependencies:** Tasks 1, 2, 3.

---

**[x] Task 5 — Build `CardTypeB` — review with photo(s)**

- Create `src/features/feed/components/CardTypeB.tsx`
- Layout: `grid grid-cols-2 gap-0 items-stretch` with explicit `height={CARD_B_HEIGHT}` (320px) on the grid container; on mobile (`< md`) falls back to single-column stacked layout
- Image column: `<CardImage items={mediaItems} height={CARD_B_HEIGHT} />` filling the column; `order-1` or `order-2` driven by `index % 2` for feed alternation
- Text column: flex column with `py-7 pl-10` (image-left) or `pr-10` (image-right); slot order matches Type A minus the xl headline — use `size="lg"`; body clamped to 4 lines; `CardFooter` with `mt-auto` to pin it to the bottom
- Mobile stacked: image renders at `CARD_C_IMAGE_HEIGHT` (185px) on top, full-width; text below with `py-5 px-0`
- Accepts `imagePosition?: 'left' | 'right'` as an explicit override (for profile/building detail usage), otherwise derives from index
- Wrap in `<SuggestedContentBlock>`

**Verify:** At 320px height the text column never overflows or collapses; long building names clamp at 2 lines; footer always aligns to the bottom of the text column; mobile stacks cleanly.

**Dependencies:** Tasks 1, 2, 3.

---

**[x] Task 6 — Build `CardTypeC` — photos only, no review**

- Create `src/features/feed/components/CardTypeC.tsx`
- Layout: full-width `<CardImage items={mediaItems} height={CARD_C_IMAGE_HEIGHT} />` (185px); text block below with `pt-4`
- Text slot order: `ActivityLead` → `BuildingHeadline size="md"` (single-line clamp) → `BuildingSubtitle` → `CardFooter`
- No `PointsBadge`, no body text, no "Read more →"
- Total natural height ~260–270px
- Same architect indicator, `SuggestedContentBlock` wrap, and click handler as the other types

**Verify:** Image always 185px regardless of photo dimensions; building name never wraps to a second line; card height is consistent across multiple entries.

**Dependencies:** Tasks 1, 2, 3.

---

**[x] Task 7 — Build `ActivityStreamRow` and `ActivityStreamGroup`**

- Create `src/features/feed/components/ActivityStream.tsx` exporting both components
- `ActivityStreamRow`: `flex items-center gap-4` row; 48×48 building thumbnail (`object-cover`, `bg-surface-muted` fallback); text block with `stream-meta` line (`10px` uppercase — `@username visited`) and building name (`21px font-black tracking-tight`, single-line truncated); bookmark icon right-aligned; `border-b border-border-default`; click navigates to building
- `ActivityStreamGroup`: accepts `entries: FeedReview[]`; renders a `9px` uppercase `font-mono` section label ("Activity") above the rows; no outer card chrome — just rows separated by hairlines
- Group label should suppress when the group contains only one entry (single "visited" feels less like a stream)
- Bookmark in rows wires to the same `user_buildings` upsert as other cards

**Verify:** Three activity entries render as a group at roughly 72px per row; label appears only for groups of two or more; thumbnail falls back to placeholder cleanly.

**Dependencies:** Tasks 1, 2.

---

## Phase 3 — Feed Integration

---

**[x] Task 8 — Wire new card components into the main feed renderer**

- Locate the feed render loop (likely in `FeedList.tsx` or similar) that currently maps entries to `ReviewCardFeed` or `FeedHeroCard`
- Replace with a `renderFeedEntry(entry, index)` function that calls `resolveCardType(entry)` and switches to `CardTypeA`, `CardTypeB`, `CardTypeC`, or queues the entry for grouping
- Implement activity grouping: accumulate consecutive `'activity'` entries into a buffer; flush the buffer as an `<ActivityStreamGroup>` whenever a non-activity entry is encountered or the list ends
- Pass `index` to `CardTypeB` so alternating image position works across the full feed
- Preserve the `onLike`, `onImageLike`, `onComment` callbacks, passing them through to whichever card component is rendered
- Wrap each rendered card in a `<div key={entry.id}>` with a bottom hairline `border-b border-border-default` and `pb-10 mb-10` spacing; activity groups get the same outer spacing

**Verify:** Load the main feed — all card types render correctly; consecutive activity entries collapse into a single group; no layout shifts or double-borders between cards.

**Dependencies:** Tasks 4, 5, 6, 7.

---

**[x] Task 9 — Update profile grid and building detail to use new card components**

- Profile grid: currently uses `ReviewCardFeed variant="compact"` — replace with the appropriate resolved card type but pass `hideUser={true}` to suppress `ActivityLead` (the profile context makes the author implicit); pass `hideBuildingInfo={false}`
- Building detail review list: currently uses `ReviewCardDetail` — keep `ReviewCardDetail` for now but pass the new `CardTypeA` / `CardTypeB` / `CardTypeC` depending on `resolveCardType`; pass `hideBuildingInfo={true}` so the building headline is suppressed (it's already the page context)
- Add `hideUser?: boolean` and `hideBuildingInfo?: boolean` props to all three new card components; when `hideBuildingInfo` is true, suppress `BuildingHeadline` and `BuildingSubtitle`; when `hideUser` is true, suppress `ActivityLead`
- Confirm `FeedActivityCard` (the old activity card used in some profile surfaces) is replaced or wired to `ActivityStreamRow`

**Verify:** Profile page renders cards without username labels and without double-building-name; building detail review list suppresses the redundant building headline; no prop-drilling TypeScript errors.

**Dependencies:** Tasks 4, 5, 6, 7, 8.

---

## Phase 4 — Responsive & Polish

---

**[x] Task 10 — Mobile responsive treatment for Type B and hover states across all types**

- Type B mobile: confirm the `md:grid-cols-2` breakpoint collapses to single column; verify image stacks above text at `CARD_C_IMAGE_HEIGHT`; verify text column padding resets to `py-5 px-0` (no left/right indent in stacked mode)
- All types: image `hover:scale-105 transition-transform duration-500` on the `<img>` inside `CardImage` (already in existing code, carry forward)
- Bookmark: `opacity-0 md:group-hover/card:opacity-100 transition-opacity` on desktop; always `opacity-100` on mobile (touch devices have no hover)
- "Read more →" should not appear on mobile for Type A if the entry has < 120 words — the 3-line clamp is already generous on a narrow viewport; add a word-count threshold guard to the expanded state logic
- Activity stream rows: on mobile, reduce thumbnail to 40×40 and building name to `18px` to prevent overflow on narrow screens

**Verify:** Resize to 375px — Type B stacks correctly, no horizontal overflow; bookmark is always visible on mobile; activity stream rows don't overflow on narrow viewports.

**Dependencies:** Tasks 4, 5, 6, 7.

---

## Phase 5 — Cleanup

---

**[x] Task 11 — Delete old type definitions, resolver, and layout matrix**

- Delete `resolveCardSpec.ts` (entire file: `resolveCardSpec`, `resolveTextWeightFromWordCount`, `resolveImageWeightFromCount`, `resolveLayoutFromWeights`, `LAYOUT_MATRIX`, `resolveProminence`)
- Remove deleted types from `src/types/cards.ts`: `CardLayout`, `CardProminence`, `CardTextWeight`, `CardImageWeight`, `CardSpec`; file now exports only `CardType`
- Find all remaining imports of the deleted exports across the codebase (`grep -r "resolveCardSpec\|CardLayout\|CardProminence\|CardTextWeight\|CardImageWeight\|CardSpec"`) and remove or replace each one
- If a card playground / storybook uses `prominenceOverride` or `spec` props, remove those controls and replace with a `cardTypeOverride?: CardType` control that routes to the correct new component
- Run `tsc --noEmit` to confirm zero type errors

**Verify:** TypeScript reports no errors; `grep` finds no remaining references to the deleted identifiers; `resolveCardSpec.ts` file no longer exists.

**Dependencies:** Tasks 8, 9.

---

**[x] Task 12 — Remove deprecated card components**

- Delete `FeedHeroCard.tsx` — fully replaced by `CardTypeB` (and `CardTypeA` for text-only hero entries)
- Delete `FeedCompactCard.tsx` — replaced by the new card types with `hideUser` / `hideBuildingInfo` props
- Delete `FeedActivityCard.tsx` — replaced by `ActivityStreamRow` / `ActivityStreamGroup`
- Simplify `ReviewCardFeed.tsx`: remove the `spec`, `prominenceOverride`, `variant`, `imagePosition`, and `showCommunityImages` props; remove the `useCompactStackLayout`, `showCarousel`, `showPairGrid`, `aspectToken` logic; the component either becomes a thin wrapper that calls `resolveCardType` and delegates to the correct new component, or is deleted entirely if Task 8 already fully replaced it in all call sites
- Confirm `ReviewCardDetail.tsx` is still in use (building detail page); if Task 9 fully replaced it, delete it; otherwise leave it unchanged
- Run the full TypeScript build and fix any residual import errors

**Verify:** Build passes with zero errors; no orphaned imports; bundle size reduced (can be confirmed via `vite build --report` or equivalent); feed, profile, and building detail pages all render correctly in the browser.

**Dependencies:** Tasks 9, 11.