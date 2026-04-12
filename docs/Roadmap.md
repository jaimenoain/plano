## Phase 1 — Foundation: type system and shared primitives

---

**[ ] Task 1 — Replace card type resolver**

- Add `CardType = 'A' | 'B' | 'C' | 'activity'` to `@/types/cards.ts`
- Write `resolveCardType(entry: FeedReview): CardType` in `@/features/feed/utils/resolveCardType.ts`
- Logic: `'activity'` if no `content` AND no `images`; `'A'` if `content` but no images; `'B'` if `content` AND images (or video); `'C'` if images but no `content`
- Add unit tests covering all four branches, including edge cases (empty string content, zero-length images array)
- **Shipped in repo:** `resolveCardType` + tests live in `src/features/feed/utils/resolveCardType.ts`; `resolveCardSpec` was removed in favor of `deriveLegacyFeedCardLayout` (fixtures only). No further action unless logic diverges from the four branches above.

**Verify:** Tests pass; calling `resolveCardType` on representative fixture entries returns expected values for all four types.

---

**[ ] Task 2 — Extract shared card primitives**

- Create `@/features/feed/components/card-primitives/PointsBadge.tsx` — lifted directly from any one of the four existing duplicates; no logic changes
- Create `CardFooter.tsx` in same folder — accepts `likesCount`, `commentsCount`, `isLiked`, `onLike`, `onComment`, optional `onSave` / `isSaved`; renders the `10px uppercase` footer row with bookmark icon
- Create `CardBookmark.tsx` — the save/unsave button with Supabase write and `useQueryClient` invalidation, extracted from `ReviewCardFeed`; accepts `buildingId`
- Export all three from `@/features/feed/components/card-primitives/index.ts`
- Do not modify any existing card components yet

**Verify:** Each primitive renders in isolation (Storybook or a throwaway test page); `CardBookmark` correctly writes to `user_buildings` and invalidates `user-building-statuses`.

---

## Phase 2 — Feed cards

---

**[ ] Task 3 — Build `FeedCardA` (review, no photo)**

- Create `@/features/feed/components/FeedCardA.tsx`
- `article` wrapper: `group/card`, cursor-pointer, left border rule when `isArchitectOfBuilding`
- ActivityLead: `10px uppercase`, `font-medium` username + lowercase verb
- Building name: `font-black`, `text-5xl`, `tracking-tight`, `leading-none`, `-webkit-line-clamp: 2`, hard max — never grows beyond 2 lines regardless of content
- Subtitle line (`architect · year`): `10px uppercase`, `text-secondary`
- `PointsBadge` from primitives
- Review body: `text-base`, `leading-relaxed`, hard `-webkit-line-clamp: 3`; "Read more →" button at `9px uppercase` when content exceeds clamp
- `CardFooter` from primitives; `CardBookmark` wired to `entry.building.id`
- `onClick` navigates to building or review; stops propagation on all buttons

**Verify:** Renders correctly with 2-word, 50-word, and 400-word review content — card height never changes; clamp and "Read more" appear correctly on long copy.

**Depends on:** Tasks 1, 2

---

**[ ] Task 4 — Build `FeedCardB` (review + photos)**

- Create `@/features/feed/components/FeedCardB.tsx`
- Outer layout: `grid grid-cols-2 gap-0 items-stretch` with fixed `height: 320px` — never grows
- Image column (left or right via `imagePosition` prop): renders one of three sub-layouts based on image count — single image (`object-cover`, fills cell), pair grid (two cells, `gap-[2px]`, each `object-cover`), or `FeedPhotoCarousel` (3+ images); all via `object-cover`, no aspect token needed since height is fixed
- Text column: `flex flex-col`, `overflow: hidden`, padding `py-8 px-10`; ActivityLead → building name `text-4xl font-black line-clamp-2` → subtitle → `PointsBadge` → body `line-clamp-4` → `CardFooter` pinned to bottom via `mt-auto`
- Video entries: video fills image column via existing `VideoPlayer`; text column unchanged
- `isArchitectOfBuilding` left border on the article wrapper

**Verify:** Renders at exactly 320px with 1, 2, and 3+ images; text column never overflows; pair grid shows 2px gap; footer always sits at bottom of text column.

**Depends on:** Tasks 1, 2

---

**[ ] Task 5 — Build `FeedCardC` (photos only, no review)**

- Create `@/features/feed/components/FeedCardC.tsx`
- Image block: fixed `height: 185px`, `width: 100%`, `object-cover`, `overflow: hidden`, `rounded-none`; single image, pair grid (`gap-[2px]`), or carousel depending on image count — same sub-layout logic as Task 4 image column
- Below image: ActivityLead at `10px uppercase`, building name `text-3xl font-black line-clamp-1`, subtitle `10px uppercase`
- `CardFooter` with bookmark; no body text, no "Read more", no `PointsBadge`
- Card total height controlled: image 185px + text block ~85px ≈ 270px fixed feel

**Verify:** Card never grows beyond ~270px regardless of building name length (line-clamp-1 enforces this); renders cleanly with 1, 2, and 3+ images.

**Depends on:** Tasks 1, 2

---

**[ ] Task 6 — Build `FeedActivityRow` (grouped activity stream)**

- Create `@/features/feed/components/FeedActivityRow.tsx`
- Accepts a single `entry: FeedReview` (caller groups multiples externally for now)
- Layout: `flex items-center gap-4`, `border-b border-border-default`, `py-3`
- Thumbnail: `48×48`, `object-cover`, `rounded-none`, building image fallback to `surface-muted`
- Meta line: `10px uppercase` — bold usernames, normal-case verb ("visited" / "wants to visit")
- Building name: `text-2xl font-black tracking-tight line-clamp-1`
- `CardBookmark` at far right; no likes/comments footer (not a content contribution)
- `onClick` navigates to building

**Verify:** Renders without overflow at any building name length; bookmark wires correctly; clicking navigates.

**Depends on:** Tasks 1, 2

---

## Phase 3 — Detail page cards

---

**[ ] Task 7 — Build shared `DetailByline` component**

- Create `@/features/feed/components/detail/DetailByline.tsx`
- Props: `username`, `avatarUrl`, `isVerifiedArchitect`, `isArchitectOfBuilding`, `timestamp`, `followersCount`, `userId`, `showFollow?: boolean`
- Avatar: `44px` circle, `border border-border-default`, initials fallback (first char of username, `text-sm font-semibold text-secondary`)
- Username: `text-xl font-black tracking-tight leading-none`
- Badge logic: if `isArchitectOfBuilding` → filled black `"Designed this"` badge; else if `isVerifiedArchitect` → outlined `"Architect"` badge; never both
- Meta row below name: `10px uppercase text-tertiary` — timestamp + follower count when available
- `FollowButton` (existing component) at far right when `showFollow` is true and viewer is not the author
- Hairline `<hr>` (`border-t border-border-default`) rendered below the byline block as part of this component

**Verify:** Renders all four variants — plain reviewer, verified architect, architect-of-building, self (no follow button); hairline always present below.

**Depends on:** Task 2

---

**[ ] Task 8 — Build `DetailCardA` (reviewer-forward, no photo)**

- Create `@/features/feed/components/detail/DetailCardA.tsx`
- `article` wrapper: left border `border-l-2 border-l-text-primary pl-4` when `isArchitectOfBuilding`
- `DetailByline` at top (Task 7)
- `PointsBadge` from primitives
- Review body: `text-base leading-relaxed`, hard `line-clamp-5`; "Read more →" at `9px uppercase`
- `CardFooter` from primitives; no bookmark (viewer is on building page already, save is contextually available elsewhere)
- `onClick` navigates to `/review/:id` for full review

**Verify:** Left border appears only for architect-of-building; body clamps at 5 lines; "Read more" appears on long content.

**Depends on:** Tasks 2, 7

---

**[ ] Task 9 — Build `DetailCardB` (reviewer-forward, with photos)**

- Create `@/features/feed/components/detail/DetailCardB.tsx`
- Fixed `height: 320px`, `grid grid-cols-2 gap-0`
- Left column (image): same single / pair / carousel logic as `FeedCardB` — `object-cover` fills the column
- Right column (text): `flex flex-col overflow-hidden py-6 pl-9`; `DetailByline` (Task 7) → `PointsBadge` → body `line-clamp-4` → "Read more →" → `CardFooter` pinned via `mt-auto`
- Left border rule on article wrapper when `isArchitectOfBuilding`

**Verify:** Fixed 320px height holds with all image counts; byline fits within text column without overflow; footer always at bottom.

**Depends on:** Tasks 2, 7

---

**[ ] Task 10 — Build `DetailCardC` (photos only, light attribution)**

- Create `@/features/feed/components/detail/DetailCardC.tsx`
- Image block: fixed `height: 185px`, `object-cover`, single / pair / carousel as per Task 5
- Attribution row below image: `28px` avatar circle + `font-bold text-sm` username + `10px uppercase` action verb + timestamp — all inline, no featured byline, no Follow button, no hairline rule
- No `PointsBadge`, no body, no "Read more"
- Minimal `CardFooter` (likes + comments only, no bookmark — photo-only contributions don't save the building)

**Verify:** Visual weight is clearly lighter than `DetailCardA`/`B`; attribution row fits on one line at all username lengths via truncation.

**Depends on:** Tasks 2, 7

---

## Phase 4 — Integration

---

**[ ] Task 11 — Wire new cards into the feed renderer**

- Locate all feed render sites (main feed page, discovery/explore, profile grid where `variant="default"`)
- Replace each `FeedHeroCard`, `ReviewCardFeed`, and `FeedCompactCard` call with a switch on `resolveCardType(entry)` → render `FeedCardA`, `FeedCardB`, `FeedCardC`, or `FeedActivityRow`
- Pass `imagePosition` alternation to `FeedCardB` (even/odd index) to preserve the left/right magazine rhythm
- `FeedActivityRow` entries are rendered below the main card list as a grouped secondary section, not interleaved
- Do not delete old components yet

**Verify:** Feed renders all four card types with correct content; no visual regressions on the main feed; activity entries appear in their own section.

**Depends on:** Tasks 3, 4, 5, 6

---

**[ ] Task 12 — Wire new cards into the building detail page**

- Locate the reviews list on the building detail page (currently uses `ReviewCardDetail`)
- Replace with a switch on `resolveCardType(entry)` → render `DetailCardA`, `DetailCardB`, or `DetailCardC`
- Ensure `useReviewCardData` is called within each detail card (already the pattern); no `hideBuildingInfo` prop needed — detail cards never show building info by design
- Sort order: architect-of-building reviews float to top (already a backend concern, but verify the `isArchitectOfBuilding` flag is available in the `FeedReview` payload at this render site; add to RPC select if missing)
- Activity entries (visited/wants to visit) on the detail page: render as `FeedActivityRow` in a separate "Also visited" section below the reviews list

**Verify:** Building detail page shows reviewer-forward cards; architect-of-building card gets left border and filled badge; photo-only entries show light attribution; no building name appears on any card.

**Depends on:** Tasks 8, 9, 10, 11

---

## Phase 5 — Cleanup

---

**[ ] Task 13 — Delete old feed card components**

- Delete `FeedHeroCard.tsx`, `FeedCompactCard.tsx`, `FeedActivityCard.tsx`
- Delete `ReviewCardFeed.tsx`, `ReviewCardDetail.tsx`
- Remove all their imports across the codebase (TypeScript compiler will surface every remaining reference)
- Delete `resolveCardSpec.ts` and `resolveCardSpec` references
- Remove `CardSpec`, `CardLayout`, `CardProminence`, `CardTextWeight`, `CardImageWeight` from `@/types/cards.ts` — keep only `CardType`

**Verify:** `tsc --noEmit` passes with zero errors; no dead imports remain; bundle size reduced.

**Depends on:** Tasks 11, 12

---

**[ ] Task 14 — Simplify `useReviewCardData`**

- Remove `variant` param and the `compact` branch (compact variant no longer exists)
- Remove `showCommunityImages` param — detail cards never show community images by design; feed cards use `posterUrl` only as a last-resort fallback, hardcode that behaviour internally
- Remove `carouselImages` from return type — carousel now receives `entry.images` directly via `FeedPhotoCarousel`'s existing interface
- Update all call sites (Tasks 3–10 components) to the simplified signature
- Verify no `imageWeight` / `textWeight` logic remains in the hook

**Verify:** `tsc --noEmit` clean; all card components pass their data correctly; no unused fields in `ReviewCardData`.

**Depends on:** Task 13