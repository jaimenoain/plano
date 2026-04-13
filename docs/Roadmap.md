# Plano — Card System Implementation Roadmap
**Based on:** Card System Design Brief v2.0 · April 2026

---

## Phase 1 — Type System & Resolver Cleanup

### [x] Task 1.1 — Delete obsolete card types and resolver

- Remove `CardLayout`, `CardProminence` from `@/types/cards.ts`
- Remove `LAYOUT_MATRIX`, `resolveLayoutFromWeights`, `resolveProminence`, `resolveCardSpec` from `resolveCardSpec.ts`
- Remove `resolveTextWeightFromWordCount` and `resolveImageWeightFromCount` exports if unused after this change (keep `countWords` — reused in Task 1.2)
- Remove `CardSpec` interface and `CardImageWeight` type if no longer referenced anywhere
- Fix all TypeScript errors introduced by the deletions — at this stage, pass `undefined` or a stub where `CardSpec` was consumed; those call sites will be fully replaced in Phase 2

**Verify:** `tsc --noEmit` passes with no type errors referencing the deleted symbols. No runtime behaviour changes yet — the card components still render, just without the old spec logic.

---

### [x] Task 1.2 — Add `resolveCardType` and `resolveDetailVariant`

- Create `@/features/feed/utils/resolveCardType.ts`
- Implement `resolveCardType(entry: FeedReview): 'A' | 'B' | 'C' | 'activity'` per the brief §3.1
- Implement `resolveDetailVariant(entry: FeedReview): DetailCardVariant` per the brief §4.2, including the `DetailCardVariant` type definition (`hasMedia`, `mediaCount`, `textTreatment`, `photoColHeight`)
- Re-export `countWords` from this file (or keep it in a shared util) — it is used by both resolvers
- Export `FeedCardType` and `DetailCardVariant` types from `@/types/cards.ts`
- Write inline unit tests or a `*.test.ts` file covering: no content + no media → `activity`; content only → `A`; media only → `C`; both → `B`; word count boundaries (0, 1, 20, 21) mapping to `none / quote / body`

**Verify:** Unit tests pass. `resolveCardType` and `resolveDetailVariant` are importable from the new path. No changes to any component yet.

**Depends on:** Task 1.1

---

## Phase 2 — Feed Cards

### [x] Task 2.1 — Rebuild `ReviewCardFeed` as a type dispatcher

- Replace the existing layout branching (`isCompact`, `useCompactStackLayout`, hero-grid) with a single switch on `resolveCardType(entry)`
- Render `<FeedCardA>`, `<FeedCardB>`, `<FeedCardC>` stubs (can be empty `<div>` placeholders) — these are implemented in Tasks 2.2–2.4
- Remove the `spec`, `prominenceOverride`, `variant`, `imagePosition` props; keep `onLike`, `onImageLike`, `onComment`, `hideUser`, `hideBuildingInfo`, `showCommunityImages`
- Remove `effectiveSpec`, `useCompactStackLayout`, `aspectToken`, `showCarousel`, `showPairGrid` local variables — these were driven by the old spec system
- Wrap the dispatcher in `<SuggestedContentBlock>` as before

**Verify:** Page renders without crashing. All feed entries show a placeholder `<div>` — no visual regressions needed yet, just no red-screen errors.

**Depends on:** Task 1.2

---

### [x] Task 2.2 — Implement `FeedCardA` (review, no photo)

- Create `@/features/feed/components/FeedCardA.tsx`
- Props: `entry: FeedReview`, `onLike`, `onComment`, `hideUser`, `hideBuildingInfo`
- Implement the single-column layout per brief §3.2: `ActivityLead`, `BuildingHeadline` at `52px font-black` clamped to 2 lines, sub-label, `PointsBadge`, body clamped to 3 lines, `Read more →`, footer
- `max-w-xl` on the text container to preserve editorial line length
- `Read more →` triggers `essayExpanded` state — when expanded, remove line clamp
- Footer: likes · comments · bookmark icon (hover-reveal on desktop)

**Verify:** A feed entry with content and no images renders as a single-column text card at approximately 180px height. Building name truncates correctly at 2 lines. Body truncates at 3 lines with "Read more →" visible.

**Depends on:** Task 2.1

---

### [x] Task 2.3 — Implement `FeedCardB` (review with photo)

- Create `@/features/feed/components/FeedCardB.tsx`
- Props: same as `FeedCardA` plus `onImageLike`
- Implement the 50/50 grid: `grid-cols-2 h-[320px]` — explicit fixed height on the grid container
- Image column: first media item only (image or video), `object-cover w-full h-full rounded-none`; use existing `renderMediaItem` pattern for video support
- Text column: `py-[28px] pl-[40px]`, flex-col; `ActivityLead`, `BuildingHeadline` at `36px font-black` clamped to 2 lines, sub-label, `PointsBadge`, body clamped to 4 lines, `Read more →`, footer pinned to bottom via `mt-auto`
- Alternate image position on even/odd feed index: pass `imagePosition` prop from the parent dispatcher, or derive from index

**Verify:** A feed entry with content and images renders as a fixed 320px card. The grid does not grow beyond 320px regardless of review length. Image fills its column completely with no white gaps.

**Depends on:** Task 2.1

---

### [x] Task 2.4 — Implement `FeedCardC` (photos only, no review)

- Create `@/features/feed/components/FeedCardC.tsx`
- Props: same as `FeedCardA` plus `onImageLike`
- Full-width image at `h-[185px] w-full object-cover rounded-none`
- Below image: `ActivityLead` (margin-top `16px`), `BuildingHeadline` at `28px font-black` single line truncated, sub-label, footer
- No body text, no `Read more`, no `PointsBadge`
- Handle video: if first media item is a video, render `<VideoPlayer>` at the same fixed height

**Verify:** A feed entry with images and no content renders the image at exactly 185px, building name on one line, no text area below. Video entries play inline.

**Depends on:** Task 2.1

---

### [x] Task 2.5 — Implement `FeedActivityRow` and activity stream section

- Create `@/features/feed/components/FeedActivityRow.tsx`
- Props: `entry: FeedReview`, `activityStatus: 'visited' | 'pending'`
- Layout: horizontal row — `48×48px` building thumbnail, text block (actor line + building name at `21px font-black` + city), bookmark icon right-aligned
- Actor line construction: single actor → `@username visited`; if the feed aggregation layer provides grouped entries, render `@a, @b, and N others visited` (aggregation logic is out of scope for this task — accept a `displayText` prop as a fallback)
- Row separator: `border-b border-border-default`, `py-3`
- Delete `FeedActivityCard` and `FeedCompactCard` components after confirming no other references

**Verify:** Feed entries with no content and no media render as compact rows, visually distinct from content cards. Bookmark icon appears on hover. `FeedActivityCard` and `FeedCompactCard` files are gone.

**Depends on:** Task 2.1

---

## Phase 3 — Detail Page Cards

### [x] Task 3.1 — Scaffold `DetailCard` dispatcher and section header

- Create `@/features/feed/components/DetailCard.tsx`
- Props: `entry: FeedReview`, `onLike`, `onComment`; hard-code `hideBuildingInfo={true}` internally — the detail page always suppresses building name
- Call `resolveDetailVariant(entry)` and dispatch to `<DetailCardWithMedia>` or `<DetailCardNoMedia>` stubs (implemented in Tasks 3.2–3.3)
- Create `@/features/feed/components/DetailSectionHeader.tsx`: renders "Reviews & photography" left, "N contributions" right, both `9px mono uppercase text-text-secondary`, separated by `border-b border-border-default`; props: `count: number`
- Wire `DetailSectionHeader` into the building detail page above the reviews list
- Replace existing `ReviewCardDetail` usage on the building detail page with `<DetailCard>`

**Verify:** Building detail page renders without errors. Section header appears above the reviews list. Each review renders a placeholder stub. `ReviewCardDetail` is no longer used on this page (can be deprecated but not yet deleted).

**Depends on:** Task 1.2

---

### [x] Task 3.2 — Implement `DetailCardWithMedia` — first row and byline

- Create `@/features/feed/components/DetailCardWithMedia.tsx`
- Props: `entry: FeedReview`, `variant: DetailCardVariant`, `onLike`, `onComment`
- First row: `grid-cols-2` with no gap; left column = primary photo/video at the `photoColHeight` from `variant` (260 / 300 / 400px); right column = text column at matching height
- Text column padding: `pt-[32px] pb-[32px] pl-[44px]`, flex-col
- Implement the byline per brief §4.3: `52px` avatar circle (initials fallback), `@username` at `20px font-black`, date in `9px mono tertiary` as full month+year using `format(date, 'MMMM yyyy')` from `date-fns`, `Architect` / `Designed this` badges
- Hairline rule beneath byline: `border-t border-border-default my-[14px]`
- Leave content area and overflow grid as stubs — implemented in Tasks 3.3 and 3.4

**Verify:** Detail page cards with media show the 50/50 first row. Photo column height changes correctly based on text treatment (verify with a no-text entry at 260px, a short entry at 300px, a long entry at 400px). Avatar renders with initials. Date shows "April 2026" not "3 days ago".

**Depends on:** Task 3.1

---

### [x] Task 3.3 — Implement text treatments and footnote footer

- Within `DetailCardWithMedia` and `DetailCardNoMedia` (create the latter here): implement the three text treatments from brief §4.4
- `quote` treatment (≤ 20 words): opening `"` mark at `56px` serif in `text-border-default`; quote text at `24px font-black` (split) or `32px font-black` (full-width); clamped to 3 / 4 lines respectively
- `body` treatment (> 20 words): `14px leading-[1.7] text-text-secondary` clamped to 4 lines; `Read full review →` CTA at `9px uppercase text-text-primary`
- `none` treatment: mono metadata line `"4 photos · 1 video"` at `11px tracking-[0.14em] uppercase font-mono text-text-tertiary`, vertically centered in the right column
- Footnote footer (all treatments): `margin-top: auto` pinned to bottom; `"22 likes · 4 comments"` in `9px tracking-[0.16em] uppercase font-mono text-text-tertiary`; both counts tappable, fire existing `onLike` / `onComment` handlers
- `DetailCardNoMedia`: `60px` avatar, name at `26px font-black`; max-width `600px`; same text treatment logic; footnote below the card text block
- No bookmark icon anywhere on detail page cards
- No Follow button anywhere on detail page cards

**Verify:** Short reviews render as large pull quotes. Long reviews clamp at 4 lines with "Read full review →". Entries with no text show the photo/video count. Footnote likes and comments are tappable. No bookmark or follow UI is visible.

**Depends on:** Task 3.2

---

### [x] Task 3.4 — Implement overflow photo grid

- Within `DetailCardWithMedia`: implement the overflow grid below the first row per brief §4.5
- Derive overflow images: `entry.images.slice(1)` (photos 2 onward)
- Apply the grid algorithm: fill 2-column rows; if overflow count is odd, replace the last 2-column row with a 3-column row covering the final 3 images (not 1 + 1 row)
- All overflow cells: `h-[196px] object-cover rounded-none`; gap between all rows and between first row and overflow: `4px`
- Special case: `mediaCount === 1` and `textTreatment === 'none'` → render full-width photo at `w-full h-[400px]` with no 50/50 split; attribution below (see brief §4.5 "Single photo, no text")
- Handle failed image loads gracefully — reuse the existing `failedImages` Set pattern

**Verify:** An entry with 5 photos shows: first photo in the left column, then a 2-col row (photos 2–3), then a 3-col row (photos 4–5). An entry with 4 photos shows two 2-col rows. An entry with 1 photo and no text shows a full-width 400px image. No incomplete rows exist (no single lonely photo as a last row).

**Depends on:** Task 3.3

---

## Phase 4 — Cleanup & Polish

### [x] Task 4.1 — Remove deprecated components and dead props

- Delete `FeedActivityCard.tsx`, `FeedCompactCard.tsx`, `ReviewCardDetail.tsx` — confirm zero remaining imports before deleting
- Remove the `spec`, `prominenceOverride`, `variant`, `imagePosition` props from `ReviewCardFeed` (now just a thin dispatcher); update all call sites
- Remove `compact-stack` and `text-forward` layout branches that may remain as dead code in `ReviewCardFeed` after Phase 2
- Remove `CardLayout`, `CardProminence` from `@/types/cards.ts` if not fully done in Task 1.1
- Remove `resolveCardSpec.ts` file entirely if not already gone

**Verify:** `tsc --noEmit` passes cleanly. `grep -r "resolveCardSpec\|CardLayout\|CardProminence\|FeedCompactCard\|FeedActivityCard\|ReviewCardDetail"` returns no results in `src/`. Bundle size decreases (check with `vite build --report` or equivalent).

**Depends on:** Tasks 2.5, 3.4

---

### [x] Task 4.2 — Responsive and mobile pass

- Audit all three feed card types on mobile (< `md` breakpoint): Type A single column is already mobile-native; Type B 50/50 grid must stack to single column (`grid-cols-1 md:grid-cols-2`), image on top, text below with appropriate vertical padding; Type C image full-width is already mobile-native
- Detail cards: 50/50 first row stacks to single column on mobile — photo full width on top, text block below with `px-0 py-6`; byline collapses gracefully at narrow widths (avatar + name still on one line)
- Overflow grid: 2-col and 3-col grids remain at mobile — cells shrink naturally; verify no overflow or scroll
- Activity stream rows: verify thumbnail + text + bookmark fit without wrapping on 375px viewport
- Test on 375px, 768px, 1280px viewport widths

**Verify:** All card variants render correctly at 375px width with no horizontal scroll, no text overflow, no broken grids. Type B image stacks above text on mobile.

**Depends on:** Tasks 2.2, 2.3, 2.4, 3.4

---

### [x] Task 4.3 — Timestamp migration on detail page

- Replace all `formatDistanceToNow(...)` calls inside `DetailCard`, `DetailCardWithMedia`, `DetailCardNoMedia` with `format(new Date(entry.edited_at || entry.created_at), 'MMMM yyyy')` from `date-fns`
- Confirm `date-fns` `format` is already imported (it is used elsewhere in the codebase); no new dependency needed
- Verify feed cards retain relative timestamps (`formatDistanceToNow`) — this change is scoped to detail page components only
- Check edge cases: entries from the current month show "April 2026", entries from prior years show "October 2023" etc.

**Verify:** All dates on the building detail page show as "Month Year". No "about 3 days ago" strings appear anywhere on the detail page. Feed cards still show relative time.

**Depends on:** Task 3.3

---

### [x] Task 4.4 — `PointsBadge` placement audit

- Confirm `PointsBadge` renders correctly inside all three feed card types (A: below sub-label; B: below sub-label in text column; C: omitted — no rating shown on photo-only cards)
- Confirm `PointsBadge` renders correctly inside detail page cards: below the hairline rule, above the text treatment, in both split and full-width variants
- The component itself is unchanged — this task is purely a placement and conditional-render audit across the new components
- Ensure `rating === 0` and `rating === null` both suppress the badge (existing behaviour in `PointsBadge` — just verify it propagates correctly)

**Verify:** An entry with `rating: 3` shows three filled dots in every card variant. An entry with `rating: 0` or `rating: null` shows no dots in any variant.

**Depends on:** Tasks 2.2, 2.3, 2.4, 3.3

---

### [x] Task 4.5 — `DetailSectionHeader` contribution count

- Wire the correct count into `<DetailSectionHeader count={n} />` from the building detail page data layer
- Count = total entries passed to the reviews list (reviews + photo-only entries; exclude pure activity entries from the count, since they are not shown in the detail card list)
- If the count is not yet available from the existing RPC, derive it client-side as `entries.filter(e => resolveCardType(e) !== 'activity').length`
- Verify the label reads naturally: `"1 contribution"` (singular) vs `"14 contributions"` (plural)

**Verify:** Section header shows the correct count. Singular/plural is handled. Count does not include visited/wants-to-visit entries.

**Depends on:** Task 3.1

---

### [ ] Task 4.6 — Visual QA pass against design brief

- Walk through every card variant in the brief against the live implementation using the card playground or a dedicated test route
- Check: no card grows beyond its specified height due to long content; all images use `object-cover rounded-none`; no bookmark icon appears on detail page; no Follow button appears on any card; footnote engagement line is `9px mono tertiary`; "Designed this" badge is filled black; "Architect" badge is outlined
- Verify the opening `"` mark on quote cards is near-invisible (uses `text-border-default`, not `text-text-primary`)
- Verify full-width single-photo-no-text cards on the detail page show the `52px` avatar below the photo, not above it
- Log any discrepancies as follow-up issues; do not expand scope of this task

**Verify:** All variants match the brief mockup. A designer sign-off checklist maps one-to-one to the brief §§3–4.

**Depends on:** All prior tasks

---

## Dependency Summary

```
1.1 → 1.2 → 2.1 → 2.2 → 4.1
                 → 2.3 → 4.1
                 → 2.4 → 4.1
                 → 2.5 → 4.1
       1.2 → 3.1 → 3.2 → 3.3 → 3.4 → 4.1
                              → 4.3
2.2, 2.3, 2.4, 3.4 → 4.2
2.2, 2.3, 2.4, 3.3 → 4.4
3.1 → 4.5
All → 4.6
```