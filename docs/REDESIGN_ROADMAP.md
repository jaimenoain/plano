# Plano Visual Redesign — Build Queue

> **How to use:** Work through phases in order. Within each phase, complete tasks top to bottom. Check off each task when done. Run `npm run typecheck && npm run test` after each phase.
>
> **Rules for every task:**
> 1. Read `docs/DESIGN_TOKENS.md` and `docs/COMPONENT_SPEC.md` before writing any code.
> 2. Never use raw Tailwind palette colours (`bg-gray-100`, `text-red-500`). Only semantic aliases.
> 3. Never use arbitrary values (`rounded-[8px]`, `p-[14px]`). Only the token scale.
> 4. Every card: `bg-surface-card border border-border-default rounded-sm shadow-none`.
> 5. Every page title: `text-3xl md:text-4xl font-bold tracking-tight text-text-primary`.
> 6. Test at 375px, 768px, and 1440px after each page-level task.

---

## Phase 0 — Foundation Verification

- [x] **Task 0.1 — Remove non-token shadows from `tailwind.config.ts`**
  Search for `shadow-subtle` and `shadow-card` in the codebase. Replace each usage with `shadow-sm` or `shadow-md` from the token scale. Remove the custom entries from the config.

- [x] **Task 0.2 — Verify radius derivations in `src/index.css`**
  Confirm `rounded-sm` = 2px, `rounded-md` = 4px, `rounded-lg` = 6px via the `calc(var(--radius) - Xpx)` chain in `tailwind.config.ts`. Fix any step that doesn't match `DESIGN_TOKENS §5`.

- [x] **Task 0.3 — Audit Shadcn base primitives**
  Files: `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`.
  - Badge: must use `rounded-sm` (NOT `rounded-full`), include `uppercase tracking-wide text-xs font-medium`.
  - Card: default `shadow-none`, hover `hover:border-border-strong`.
  - Button primary: include `active:scale-[0.98]`, focus `ring-brand-primary ring-offset-2`.
  - Input: hover `hover:shadow-sm hover:border-border-strong`.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 1 — Layout Shell

- [x] **Task 1.1 — Fix `BottomNav.tsx`**
  - Replace `bg-black/90` and `border-white/10` with `bg-surface-card border-t border-border-default` for standard variant. For Explore dark variant, use `bg-neutral-950 border-t border-white/10` with comment `/* palette-neutral-950 */`.
  - Replace `rounded-full` active indicator dot with `border-t-2 border-brand-primary` at the TOP of the active nav item (mirrors sidebar's `border-l-2` accent).
  - Active icon: `strokeWidth={2.5} text-text-primary`. Inactive: `strokeWidth={2} text-text-secondary`.
  - Label: `text-xs font-medium`. Active: `text-text-primary`. Inactive: `text-text-secondary`.

- [x] **Task 1.2 — Fix `Header.tsx`**
  Remove any `shadow-sm`. Keep `bg-surface-card border-b border-border-default h-16`. Borders provide hierarchy, not shadows.

- [x] **Task 1.3 — Add feed max-width**
  File: `src/features/feed/pages/Index.tsx` (authenticated view).
  Wrap the feed column in `max-w-2xl mx-auto`. If keeping the right sidebar, use:
  ```tsx
  <div className="flex gap-8 items-start max-w-5xl mx-auto">
    <div className="flex-1 max-w-2xl min-w-0">{/* Feed */}</div>
    <div className="w-72 flex-shrink-0 hidden lg:block">{/* Sidebar */}</div>
  </div>
  ```

- [x] **Task 1.4 — Fix Landing header button**
  File: `src/features/feed/pages/Index.tsx` (Landing component).
  Replace `bg-text-brand-primary` / `bg-foreground text-background` with `bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover rounded-sm`.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 2 — Typography Normalisation

- [x] **Task 2.1 — Normalise page titles**
  For each page below, add or fix the visible `h1` to use `text-3xl md:text-4xl font-bold tracking-tight leading-tight text-text-primary`:
  - [x] `Settings.tsx` (currently `text-2xl`)
  - [x] `Notifications.tsx` (currently sr-only — make visible)
  - [x] `Connect.tsx` (add explicit h1 in content)
  - [x] `UserPhotoGallery.tsx` — "Photos"
  - [x] `FolderView.tsx` — folder name
  - [x] `BuildingDetails.tsx` — building name (currently `text-lg`–`text-2xl`)
  - [x] `AddBuilding.tsx` — "Add Building"
  - [x] `EditBuilding.tsx` — "Edit Building"
  - [x] `WriteReview.tsx` — "Write Review"
  - [x] `ReviewDetails.tsx` — building name as h1
  - [x] `ArchitectDetails.tsx` — architect name (currently `text-xl`–`text-3xl`)
  - [x] `ArchitectDashboard.tsx` — "Dashboard"
  - [x] `Profile.tsx` — username as `text-3xl font-semibold tracking-tight`

- [x] **Task 2.2 — Normalise section headings**
  Within each page, in-page sections should use `text-2xl md:text-3xl font-semibold tracking-tight text-text-primary`. Key files:
  - [x] `BuildingDetails.tsx` — "Photos", "Location", "Community Notes", "Nearby"
  - [x] `Profile.tsx` — "Collections", "Favourites", "Highlights"
  - [x] `Settings.tsx` — form sections
  - [x] `Connect.tsx` — "People You May Know", "Your Contacts"
  - [x] `Admin/Dashboard.tsx` — zone headings

- [x] **Task 2.3 — Normalise badge and table header typography**
  - [x] `src/components/ui/badge.tsx` — default must include `uppercase tracking-wide text-xs font-medium`
  - [x] `src/components/ui/table.tsx` — `TableHead` must include `text-xs font-medium uppercase tracking-wide text-text-secondary`
  - [x] Search for custom badge-like `<span>` or `<div>` elements bypassing the Badge component and normalise

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 3 — Raw Colour Purge

- [x] **Task 3.1 — Fix Notifications icon colours**
  File: `src/features/notifications/pages/Notifications.tsx`.
  In `getIcon`: `text-red-500` → `text-feedback-destructive`, `text-blue-500` → `text-brand-primary`, `text-green-500` → `text-feedback-success`, `text-yellow-500` → `text-feedback-warning`. Same for `fill-*` variants.

- [x] **Task 3.2 — Fix Landing and feed components**
  Files: `LandingHero.tsx`, `LandingFeatureGrid.tsx`, `ExploreTeaserBlock.tsx`, `SuggestedContentBlock.tsx`.
  Search for `text-<colour>-<shade>` / `bg-<colour>-<shade>`. Replace with semantic tokens per Colour Migration Map (see Appendix).

- [x] **Task 3.3 — Fix building form/detail hex values**
  Files: `BuildingDetails.tsx`, `AddBuilding.tsx`, `BuildingForm.tsx`.
  `#595959` → `text-text-secondary`. `#EEFF41` / `bg-[#EEFF41]` → `bg-brand-primary`. `fill-[#595959]` → `fill-text-secondary`.

- [x] **Task 3.4 — Fix PopularityBadge**
  File: `src/features/buildings/components/PopularityBadge.tsx`.
  Replace custom colour scale: top_1 = `bg-brand-primary text-brand-primary-foreground`, top_5 = `bg-brand-secondary text-brand-secondary-foreground`, top_10/20 = `bg-surface-muted text-text-secondary border border-border-default`. All: `rounded-sm px-2 py-0.5 text-xs font-medium uppercase tracking-wide`.

- [x] **Task 3.5 — Fix StatusBadge**
  File: `src/features/profile/components/StatusBadge.tsx`.
  Visited = `bg-brand-secondary text-brand-secondary-foreground`. Pending/Saved = `bg-surface-muted text-text-secondary border border-border-default`. Ignored = `bg-surface-muted text-text-disabled border border-border-default`. All: `rounded-sm px-2 py-0.5 text-xs font-medium uppercase tracking-wide`.

- [x] **Task 3.6 — Fix Explore page raw background**
  File: `src/features/explore/pages/Explore.tsx`.
  `bg-black` → `bg-[#0A0A0A]` with comment `/* palette-neutral-950 */`. `text-white` → `text-text-inverse`. "World" chip: `rounded-full` → `rounded-sm`. Bookmark icon: replace grey circle with `bg-surface-card/20 backdrop-blur-sm rounded-sm h-10 w-10`.

- [x] **Task 3.7 — Fix affinity percentage badges**
  File: `src/features/profile/components/SocialContextSection.tsx` (or wherever "HIGH AFFINITY" renders).
  Replace green/orange badges: >75% = `bg-brand-primary text-brand-primary-foreground`, 50–75% = `bg-brand-secondary text-brand-secondary-foreground`, <50% = `bg-surface-muted text-text-secondary border border-border-default`. Keep `rounded-full` here (circular overlay on avatar).

- [x] **Task 3.8 — Sweep remaining raw palette colours**
  Run: `grep -rn "text-red-\|text-blue-\|text-green-\|text-yellow-\|text-gray-\|bg-red-\|bg-blue-\|bg-green-\|bg-yellow-\|bg-gray-" src/ --include="*.tsx" | grep -v "test\|\.test\."`. Fix every hit using the Colour Migration Map.

- [x] **Task 3.9 — Document image overlay raw blacks**
  Files: `BuildingImageCard.tsx`, `BuildingHero.tsx`, `UserPhotoGallery.tsx`.
  Add code comments to `bg-black/40`, `bg-black/50`, `bg-black/60` photo overlays: `/* Photo overlay — bg-black/N approved per COMPONENT_SPEC §8 backdrop convention */`. No class changes needed.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 4 — Spacing Rhythm

- [x] **Task 4.1 — Normalise section dividers**
  Major page sections must use `mt-12 pt-8 border-t border-border-default`. Search for inconsistent `mt-8` / `mt-10` without `border-t`. Fix in:
  - [x] `BuildingDetails.tsx`
  - [x] `Profile.tsx`
  - [x] `Settings.tsx`
  - [x] `Connect.tsx`
  - [x] `Admin/Dashboard.tsx`

- [x] **Task 4.2 — Normalise card padding**
  Standard cards: `p-6`. Compact variants (kanban items, sidebar list items, compact feed items): `p-4` with comment `/* compact card variant */`. Search for `p-5` in card containers and fix.

- [x] **Task 4.3 — Normalise form spacing**
  Files: `BuildingForm.tsx`, `AddBuilding.tsx`, `EditBuilding.tsx`, `WriteReview.tsx`, `Settings.tsx`, `EditArchitect.tsx`.
  - Field groups: `gap-6`
  - Label-to-input: `gap-1.5`
  - Section dividers: `mt-12 pt-8 border-t border-border-default`
  - Action row: `pt-6 border-t border-border-default flex items-center justify-end gap-3`

- [x] **Task 4.4 — Standardise image aspect ratios**
  - Building cards (profile, search, feed discovery): `aspect-[4/3]`
  - Feed hero cards: `aspect-[4/3]`
  - Photo gallery thumbnails: `aspect-square`
  - Building detail hero: `aspect-[16/9] md:aspect-[21/9]`

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 5 — Surface & Border Fixes

- [x] **Task 5.1 — Add missing borders to surface-card containers**
  Run: `grep -rn "bg-surface-card" src/ --include="*.tsx" | grep -v "border"`. Add `border border-border-default` to each hit (unless inside another bordered container or a modal/overlay body).

- [x] **Task 5.2 — Fix `bg-surface-default` on non-root elements**
  Run: `grep -rn "bg-surface-default" src/ --include="*.tsx" | grep -v "MainLayout\|min-h-screen\|Index.tsx\|Auth.tsx"`. Replace with `bg-surface-card border border-border-default` or `bg-surface-muted`.

- [x] **Task 5.3 — Fix `rounded-full` on non-avatar elements**
  Run: `grep -rn "rounded-full" src/ --include="*.tsx" | grep -vi "avatar"`. Replace with `rounded-sm` unless it's the affinity badge (Task 3.7) or a legitimate circular element.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 6 — Feed & Landing Redesign

- [x] **Task 6.1 — Redesign Landing page**
  Files: `Index.tsx` (Landing), `LandingHero.tsx`, `LandingMarquee.tsx`, `LandingFeatureGrid.tsx`.
  - Header: `bg-surface-card/90 backdrop-blur-md border-b border-border-default h-16`. Login CTA: `bg-brand-primary text-brand-primary-foreground rounded-sm`.
  - Hero: `min-h-[80vh]`. Headline: `text-4xl md:text-6xl font-bold tracking-tight max-w-4xl`. Search bar: `h-12 rounded-sm shadow-sm max-w-lg`.
  - Marquee: `bg-surface-muted py-6 border-y border-border-default`.
  - Feature grid: `grid-cols-1 md:grid-cols-3 gap-6`. Cards: `bg-surface-card border border-border-default rounded-sm p-8`.

- [x] **Task 6.2 — Redesign FeedHeroCard**
  File: `src/features/feed/components/FeedHeroCard.tsx`.
  Container: `bg-surface-card border border-border-default rounded-sm shadow-none overflow-hidden group`. Image: `aspect-[4/3] w-full object-cover`. Content: `p-6 gap-3`. User row: avatar `h-8 w-8 rounded-full`, name `text-sm font-medium`, timestamp `text-xs text-text-secondary`. Building name: `text-xl font-semibold hover:underline`. **Action row: ICON-ONLY, no text labels** — all actions as ghost `h-8 w-8` buttons, tooltips on hover. Author Edit/Delete: `opacity-0 group-hover:opacity-100`.

- [x] **Task 6.3 — Redesign FeedCompactCard**
  File: `src/features/feed/components/FeedCompactCard.tsx`.
  Same structure as hero card minus image. Container: `bg-surface-card border border-border-default rounded-sm p-6 shadow-none`.

- [x] **Task 6.4 — Redesign FeedClusterCard (compact activity items)**
  File: `src/features/feed/components/FeedClusterCard.tsx`.
  **Wrap in card containers** — currently renders as naked text. Group sequential items from same user:
  ```
  ┌───────────────────────────────────────────┐
  │ 👤 jaime · 27 days ago                    │
  │   • pending Yardhouse and Phaidon Press   │
  │   • visited London Aquatics Centre        │
  │   • pending Bobby Moore Academy +17 more  │
  └───────────────────────────────────────────┘
  ```
  Container: `bg-surface-card border border-border-default rounded-sm p-4 shadow-none`. Activity items: `text-sm text-text-secondary`.

- [x] **Task 6.5 — Redesign EmptyFeed**
  File: `src/features/feed/components/EmptyFeed.tsx`.
  Per COMPONENT_SPEC §10: `py-16 px-8 gap-4`. Icon `h-12 w-12 text-text-disabled`. Heading `text-lg font-semibold`. Description `text-sm text-text-secondary max-w-sm`. CTA: primary button.

- [x] **Task 6.6 — Redesign AllCaughtUpDivider**
  `border-t border-border-default` with centred label: `bg-surface-default px-4 text-xs font-medium text-text-secondary uppercase tracking-wide -translate-y-1/2`.

- [x] **Task 6.7 — Redesign ExploreTeaserBlock and SuggestedContentBlock**
  `bg-brand-secondary border border-border-default rounded-sm p-6`. CTA: ghost or secondary button (NOT primary).

- [x] **Task 6.8 — Redesign PeopleYouMayKnow (feed)**
  `bg-surface-card border border-border-default rounded-sm p-6`. Follow button: `bg-brand-primary text-brand-primary-foreground rounded-sm` (not the dark button shown in screenshots).

- [x] **Task 6.9 — Redesign ReviewCard and DiscoveryCard**
  Consistent card assembly. Image: `aspect-[4/3]`. Social context facepile: `flex -space-x-2`. "Trending Architecture" section: if using overlay text on images, use `bg-gradient-to-t from-black/60 to-transparent` with `text-text-inverse`.

- [x] **Task 6.10 — Redesign ContactFacepile**
  `flex -space-x-2 items-center`. Avatars: `h-6 w-6 rounded-full border-2 border-surface-card`. Overflow: `+N` in `text-xs text-text-secondary`.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 7 — Auth & Onboarding

- [x] **Task 7.1 — Polish Auth.tsx**
  Heading: `text-3xl font-bold tracking-tight`. Submit: `bg-brand-primary text-brand-primary-foreground rounded-sm h-10 w-full font-medium hover:bg-brand-primary-hover active:scale-[0.98]`.

- [x] **Task 7.2 — Polish Onboarding.tsx**
  Step indicator: `bg-brand-primary` complete, `bg-surface-muted` remaining. Avatar upload: `border-2 border-dashed border-border-default hover:border-brand-primary`. CTA: primary.

- [x] **Task 7.3 — Polish UpdatePassword.tsx**
  Same card-centred pattern as Auth.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 8 — Building Detail (Major Layout Rethink)

- [x] **Task 8.1 — Restructure BuildingDetails.tsx layout**
  **The hero image MUST be the first visual element**, above the building name. Move the map to a "Location" section below the photo gallery.

  Mobile section order (top to bottom):
  1. Hero image (full-bleed, `aspect-[16/9]`, swipe gallery)
  2. Building header (tier badge, name, architect, location · year)
  3. Action bar (rate, save, share)
  4. Details (taxonomy as definition list) — `mt-12 pt-8 border-t`
  5. Your Activity card — `mt-12 pt-8 border-t`
  6. Photos grid (`grid-cols-3 gap-2`, NOT vertical stream) — `mt-12 pt-8 border-t`
  7. Location map — `mt-12 pt-8 border-t`
  8. Community Notes (reviews in proper cards) — `mt-12 pt-8 border-t`
  9. Nearby (horizontal scroll) — `mt-12 pt-8 border-t`

  Desktop: single-flow layout with two-column grids within it (Details + Activity side-by-side, Location + Notes side-by-side). Content: `max-w-4xl mx-auto`.

  **Demote "Edit Official Data"** from full-width button to ghost icon button (pencil) in the header row. On mobile, put it in "..." overflow menu.

- [x] **Task 8.2 — Redesign BuildingHeader.tsx**
  Name: `text-3xl md:text-4xl font-bold tracking-tight`. Alt name: `text-lg text-text-secondary mt-1`. Architect: `text-base hover:underline`. Location: `text-sm text-text-secondary`. Year: `text-sm text-text-secondary font-mono tracking-wide`. Edit: ghost icon button, NOT full-width outlined button.

- [x] **Task 8.3 — Redesign BuildingAttributes.tsx**
  Replace cramped icon+text rows with a definition list:
  ```tsx
  <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4">
    <dt className="text-xs font-medium text-text-secondary uppercase tracking-wide">Category</dt>
    <dd className="text-sm text-text-primary">Residential</dd>
    {/* Multi-value fields use badge clusters */}
    <dt className="...">Materials</dt>
    <dd className="flex flex-wrap gap-2">
      <Badge>Concrete</Badge><Badge>Glass</Badge>
    </dd>
  </div>
  ```

- [x] **Task 8.4 — Redesign ArchitectStatement.tsx**
  Container: `bg-brand-secondary border border-border-default rounded-sm p-6`. Label: `text-xs font-medium text-brand-secondary-foreground uppercase tracking-wide mb-3`. Text: `text-base italic leading-relaxed`. Edit: ghost icon, hover-revealed.

- [x] **Task 8.5 — Redesign BuildingHero.tsx and photo gallery**
  Hero: `aspect-[16/9] md:aspect-[21/9] w-full object-cover rounded-sm`. Fallback: `bg-surface-muted` with `Building2` icon. Gallery: `grid grid-cols-3 gap-2` mobile, `grid-cols-6 gap-2` desktop — **NOT vertical stream**. Each thumbnail: `aspect-square rounded-sm overflow-hidden cursor-pointer group`. Hover overlay: `opacity-0 group-hover:opacity-100 bg-black/30`.

- [x] **Task 8.6 — Redesign PersonalRatingButton.tsx**
  Increase star size to `h-5 w-5` (currently too small). Active: `text-brand-primary fill-brand-primary`. Inactive: `text-text-disabled`. Container: `flex items-center gap-1.5`.

- [x] **Task 8.7 — Redesign ImageDetailsDialog.tsx**
  Lightbox: backdrop `bg-black/90`. Image `object-contain max-h-[85vh]`. Nav: `bg-surface-card/80 backdrop-blur-sm rounded-sm`. Close: `X` top-right.

- [x] **Task 8.8 — Redesign BuildingImageCard.tsx**
  `aspect-square rounded-sm overflow-hidden group cursor-pointer`. Like count: `absolute bottom-2 right-2 bg-surface-card/80 backdrop-blur-sm rounded-sm px-2 py-0.5 text-xs font-medium`.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 9 — Building Forms

- [x] **Task 9.1 — Redesign AddBuilding.tsx and EditBuilding.tsx**
  Wrap in AppLayout or ensure `min-h-screen bg-surface-default`. Content: `max-w-2xl mx-auto px-4 py-8`. Page title: `text-4xl font-bold tracking-tight mb-8`. Form per COMPONENT_SPEC §5. Input widths: name `max-w-md`, year `max-w-[8rem]`, city/country `max-w-sm`.

- [x] **Task 9.2 — Redesign WriteReview.tsx and ReviewDetails.tsx**
  WriteReview: `max-w-2xl`. Large rating stars `h-10 w-10`. Text area: `max-w-xl min-h-[200px] bg-surface-muted`. Image upload: `border-2 border-dashed border-border-default hover:border-brand-primary rounded-sm p-8`.
  ReviewDetails: `max-w-2xl`. User info, building link, rating, text, images, threaded comments.

- [x] **Task 9.3 — Redesign BuildingForm.tsx and AddBuildingDetails.tsx**
  All per COMPONENT_SPEC §4 and §5. Replace accordion sections with always-visible sections for creation forms.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 10 — Profile Page (Major Layout Fixes)

- [x] **Task 10.1 — Redesign Profile.tsx layout**
  - Constrain width: `max-w-6xl mx-auto`.
  - Profile header: avatar `h-20 w-20 md:h-24 md:w-24 rounded-full border-2 border-border-default`, username `text-3xl font-semibold tracking-tight`, bio `text-base text-text-secondary max-w-lg`, stats row `flex items-center gap-6`.
  - Simplify control bar: Row 1 = tabs + view mode segmented control. Row 2 = search. Move "Community Photos" toggle to filter popover.
  - Tabs: active `border-b-2 border-brand-primary text-text-primary font-semibold`, inactive `text-text-secondary`.

- [x] **Task 10.2 — Flip building cards to image-first**
  All building cards in profile grid: image ABOVE text. Image: `aspect-[4/3] w-full object-cover` at top, bleeding to card edges. Text: `p-4`. Name `text-sm font-semibold`. Architect `text-xs text-text-secondary`. Missing image fallback: `bg-surface-muted aspect-[4/3]` with `Building2` icon `h-8 w-8 text-text-disabled`. Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6` — max 4 columns, never 5+.

- [x] **Task 10.3 — Redesign ProfileKanbanView and KanbanColumn**
  Columns: `bg-surface-muted border border-border-default rounded-sm min-w-[280px]`. Header: `p-4 border-b border-border-default`. Cards: `bg-surface-card border border-border-default rounded-sm p-3` — image-first.

- [x] **Task 10.4 — Redesign ProfileListView**
  Table per COMPONENT_SPEC §7. Header: `bg-surface-muted text-xs uppercase tracking-wide text-text-secondary`. Rows: `hover:bg-brand-secondary`. Row actions: hover-revealed.

- [x] **Task 10.5 — Redesign profile sub-components**
  - [x] `FavoritesSection.tsx` — horizontal scroll, `w-32`, image `aspect-square rounded-sm`, name `text-xs font-medium truncate`
  - [x] `ProfileHighlights.tsx` — accent `border-l-4 border-brand-primary`
  - [x] `UserCard.tsx` — `flex items-center gap-3 p-3`, avatar `h-10 w-10 rounded-full`
  - [x] `FollowButton.tsx` — not following: primary. Following: secondary. Hover: "Unfollow" `text-feedback-destructive`
  - [x] `InlineRating.tsx` — stars `h-4 w-4`
  - [x] `InlineReviewEditor.tsx` — `bg-surface-muted border border-border-default rounded-sm`
  - [x] `SocialContextSection.tsx` — `text-sm text-text-secondary`
  - [x] `DraggableReviewCard.tsx` — image-first card pattern
  - [x] `MutualAffinityRow.tsx` — token-compliant
  - [x] `RecommendationCard.tsx` — token-compliant

- [x] **Task 10.6 — Redesign CollectionCard with preview images**
  Add 2×2 image mosaic from collection buildings at the top of the card. Below: name `text-xl font-semibold`, meta `text-xs text-text-secondary`. Container: `bg-surface-card border border-border-default rounded-sm overflow-hidden`.

- [x] **Task 10.7 — Redesign profile dialogs**
  Files: `ManageFavoritesDialog`, `ManageFoldersDialog`, `ManageHighlightsDialog`, `AddBuildingDialog`, `AddToFolderDialog`, `BlockUserDialog`, `DisconnectArchitectDialog`.
  All per COMPONENT_SPEC §8: `bg-surface-overlay rounded-lg shadow-lg border border-border-default`. Header `p-6 border-b`. Body `p-6`. Footer `p-6 border-t flex justify-end gap-3`.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 11 — Settings

- [x] **Task 11.1 — Redesign Settings.tsx**
  `max-w-2xl mx-auto` (already present). Page title: `text-4xl font-bold tracking-tight mb-8`. Section dividers: `mt-12 pt-8 border-t border-border-default`. Section headings: `text-xl font-semibold`. Input widths: username `max-w-sm`, bio `max-w-xl`, email `max-w-sm`. Avatar upload: `rounded-full h-24 w-24`. Danger zone: destructive button hover-revealed.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 12 — Search & Explore

- [x] **Task 12.1 — Fix SearchPage.tsx**
  Mobile "List" button: `rounded-full bg-dark` → `rounded-sm bg-surface-card border border-border-default shadow-md px-6 py-3`. Selected sidebar item: verify `bg-brand-secondary`. Search input: `h-12 bg-surface-muted border border-border-default rounded-sm`.

- [x] **Task 12.2 — Redesign search sub-components**
  Files: `OmniSearchBar`, `DiscoverySearchInput`, `DiscoveryBuildingCard`, `DiscoveryList`, `SearchModeToggle`, `LeaderboardCard`, `LeaderboardDialog`, `ArchitectResultsList`, `UserResultsList`, `ArchitectSearchNudge`, `UserSearchNudge`, `ExploreTutorial`.
  Autocomplete: `bg-surface-overlay shadow-lg rounded-sm border border-border-default`. Items: `hover:bg-brand-secondary`. Result rows: `p-4 border-b border-border-default hover:bg-brand-secondary`. Nudges: `bg-brand-secondary rounded-sm p-4`.

- [x] **Task 12.3 — Redesign Explore.tsx**
  After Task 3.6 colour fixes: card overlays `text-text-inverse`, building info overlay `bg-gradient-to-t from-black/60 to-transparent`, "World" chip `rounded-sm`.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 13 — Collections & Folders

- [x] **Task 13.1 — Redesign collection components**
  `CollectionsGrid`: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. `CollectionBuildingCard`: image-first. `CollectionMarkerCard`, `CollectionSelector`, `BuildingDetailPanel`: token-compliant.

- [x] **Task 13.2 — Redesign collection dialogs**
  `CreateCollectionDialog`, `CollectionSettingsDialog`, `ManageCollectionDialog`, `AddBuildingsToCollectionDialog`, `PlanRouteDialog` — all per COMPONENT_SPEC §8.

- [x] **Task 13.3 — Redesign CollectionMapPage.tsx**
  Full-width map. Sidebar `w-80 bg-surface-card border-l border-border-default`. Route overlays `brand-primary`.

- [x] **Task 13.4 — Redesign itinerary components**
  `ItineraryList`, `SortableItineraryItem`: stops `bg-surface-card border border-border-default rounded-sm p-4 mb-2`. `ItineraryGenerationOverlay`: `bg-black/60` backdrop, `bg-surface-card rounded-lg shadow-lg p-8` loading card.

- [x] **Task 13.5 — Redesign FolderView.tsx and FolderCard.tsx**
  FolderView: `max-w-4xl mx-auto`, title `text-4xl font-bold tracking-tight`. FolderCard: `bg-surface-card border border-border-default rounded-sm p-6`.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 14 — Map Components

- [x] **Task 14.1 — Redesign map UI components**
  Files: `PlanoMap`, `MapControls`, `BuildingSidebar`, `BuildingPopupContent`, `FilterDrawer`, `MapMarkers`, `MapPin`, `CollectionMapGL`, `ItineraryRoutes`, `QualityRatingFilter`, `FolderAndCollectionMultiSelect`.
  - Controls: `bg-surface-card/90 backdrop-blur-sm border border-border-default rounded-sm shadow-md`.
  - Sidebar: `w-80 bg-surface-card border-l border-border-default`. Items: `p-4 border-b hover:bg-brand-secondary`.
  - Popup: `bg-surface-card border border-border-default rounded-sm shadow-lg p-4 max-w-xs`.
  - FilterDrawer: Sheet from right. Labels: `text-xs uppercase tracking-wide text-text-secondary font-medium`.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 15 — Connect, Notifications, Architect

- [x] **Task 15.1 — Redesign Connect.tsx**
  `max-w-2xl mx-auto`. Title: `text-4xl font-bold tracking-tight`. Section divider between PYMK and Contacts. `UserRow`: `flex items-center gap-4 p-4 border-b border-border-default hover:bg-brand-secondary`.

- [x] **Task 15.2 — Redesign Notifications.tsx**
  (Icons fixed in Task 3.1.) Visible h1: `text-4xl font-bold tracking-tight mb-6`. Unread: `bg-brand-secondary`. Read: transparent. Empty state per §10.

- [x] **Task 15.3 — Redesign NotificationSettingsDialog.tsx**
  Per COMPONENT_SPEC §8. Toggle rows: `flex items-center justify-between py-3 border-b border-border-default`.

- [x] **Task 15.4 — Redesign architect pages**
  `ArchitectDetails`: name `text-4xl font-bold tracking-tight`, portfolio `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`, image-first building cards.
  `ArchitectDashboard`, `EditArchitect`: form pages per §5.
  `ClaimProfileDialog`: per §8.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 16 — Common & Custom UI

- [x] **Task 16.1 — Redesign common components**
  `RecommendDialog`, `UserPicker`: per §8. `CookieConsent`: `bg-surface-card border-t border-border-default p-4 shadow-lg`. `NavigationBlocker`: per §8, `max-w-sm`. `PwaPrompt`: toast-style. `RouteLoadingFallback`: `Loader2 text-brand-primary animate-spin`. Error boundaries: §10 with `AlertTriangle text-feedback-destructive`.

- [x] **Task 16.2 — Redesign custom UI components**
  `segmented-control`: `bg-surface-muted rounded-sm p-0.5`, active `bg-surface-card shadow-sm rounded-sm`. `tag-input`: tags `bg-surface-muted border border-border-default rounded-sm px-2 py-0.5 text-xs`. `michelin-rating-input`: large stars. `LocationInput`: dropdown `bg-surface-overlay shadow-lg rounded-sm`. `VideoPlayer`: controls `bg-black/60 backdrop-blur-sm rounded-sm p-2`. All: `rounded-sm`, semantic tokens, hover/focus-visible/disabled states.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 17 — Admin Pages

- [ ] **Task 17.1 — Redesign AdminLayout**
  Per COMPONENT_SPEC §1 and §9.

- [ ] **Task 17.2 — Redesign Admin Dashboard zones**
  Files: `Dashboard.tsx`, `PulseZone`, `ActivityTrendsZone`, `ContentIntelligenceZone`, `UserLeaderboardZone`, `RetentionZone`, `NotificationIntelligenceZone`, `PhotoHeatmapZone`, `SessionDiagnosticZone`, `NoPhotosMapZone`, `BuildingMap`.
  Title: `text-4xl font-bold tracking-tight`. Zones: `bg-surface-card border border-border-default rounded-sm p-6`. Stats: `text-3xl font-bold`. Labels: `text-xs text-text-secondary uppercase tracking-wide`. Charts: `brand-primary` accent.

- [ ] **Task 17.3 — Redesign admin data pages**
  Files: `Buildings`, `Users`, `Moderation`, `ImageWall`, `PhotoAnalytics`, `BuildingAudit`, `StorageJobs`, `ArchitectClaims`, `MergeBuildings`, `MergeComparison`.
  Tables per §7. Forms per §5. Dialogs per §8. Add empty states to all tables.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 18 — Missing States Sweep

- [ ] **Task 18.1 — Replace spinners with skeletons**
  Search for `<Loader2` in section-level loading contexts. Replace with skeleton components matching target layout (`bg-surface-muted rounded-sm animate-pulse`). Priority:
  - [ ] Feed loading in `Index.tsx`
  - [ ] Profile building grid
  - [ ] Architect portfolio
  - [ ] Collection grid
  - [ ] Notification list
  - [ ] Admin dashboard zones

- [ ] **Task 18.2 — Add missing empty states**
  Per COMPONENT_SPEC §10. Add to every list/grid/table that can have zero items. Priority:
  - [ ] Admin tables
  - [ ] Folder contents
  - [ ] Collection building lists
  - [ ] Map filter results
  - [ ] Search results (per entity type)

- [ ] **Task 18.3 — Add missing interaction states**
  - [ ] Ensure all interactive elements have `focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2`
  - [ ] Ensure destructive row/card actions are hover-revealed: container `group`, button `opacity-0 group-hover:opacity-100 transition-opacity duration-150`

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 19 — Miscellaneous Pages

- [ ] **Task 19.1 — Redesign NotFound.tsx**
  Per §10: "404" in `text-6xl font-bold text-text-disabled`. "Page not found". "Go home" primary button.

- [ ] **Task 19.2 — Redesign Terms.tsx**
  `max-w-2xl mx-auto p-8`. Title `text-4xl font-bold tracking-tight`. Body `text-base leading-relaxed`.

- [ ] **Task 19.3 — Redesign UserPhotoGallery.tsx**
  Title `text-4xl font-bold tracking-tight`. Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2`. Photos: `aspect-square rounded-sm overflow-hidden cursor-pointer`.

**Checkpoint:** `npm run typecheck && npm run test`

---

## Phase 20 — Final QA

- [ ] **Task 20.1 — Visual audit**
  Walk through every page at 375px, 768px, 1440px. Verify:
  - [ ] Every page has a visible h1 in `text-3xl md:text-4xl font-bold tracking-tight`
  - [ ] Every section heading uses `text-2xl md:text-3xl font-semibold tracking-tight`
  - [ ] Every card uses `bg-surface-card border border-border-default rounded-sm shadow-none`
  - [ ] Building Detail: hero image first, map below, photos as grid, taxonomy as definition list
  - [ ] Profile: building cards show image above text, max 4 columns, collection cards have previews
  - [ ] Feed: `max-w-2xl`, compact items in cards, action bars icon-only
  - [ ] No raw Tailwind palette colours
  - [ ] `rounded-full` only on avatars
  - [ ] Neon `brand-primary` in ≤2 places per screen
  - [ ] All dividers: `mt-12 pt-8 border-t border-border-default`
  - [ ] Card padding consistently `p-6` (or `p-4` compact)
  - [ ] All empty states use §10
  - [ ] All loading states use skeletons
  - [ ] All destructive actions hover-revealed
  - [ ] BottomNav: semantic tokens, `border-t-2` active indicator
  - [ ] Image aspect ratios standardised

- [ ] **Task 20.2 — Automated checks**
  ```bash
  npm run typecheck
  npm run lint
  npm run test
  npm run build
  ```

- [ ] **Task 20.3 — Token compliance grep**
  Run and fix all remaining hits:
  ```bash
  grep -rn "bg-\(red\|blue\|green\|yellow\|gray\|slate\|zinc\|stone\|neutral\|orange\|amber\|emerald\|teal\|cyan\|sky\|indigo\|violet\|purple\|fuchsia\|pink\|rose\|lime\)-" src/ --include="*.tsx"
  grep -rn "fill-\[#\|bg-\[#\|text-\[#\|border-\[#\|stroke-\[#" src/ --include="*.tsx"
  grep -rn "rounded-\[" src/ --include="*.tsx"
  grep -rn "rounded-full" src/ --include="*.tsx" | grep -vi "avatar"
  ```

---

## Appendix — Colour Migration Map

| Raw Tailwind | Semantic Token |
|---|---|
| `text-red-500` | `text-feedback-destructive` |
| `fill-red-500` | `fill-feedback-destructive` |
| `text-green-500` | `text-feedback-success` |
| `text-yellow-500` | `text-feedback-warning` |
| `text-blue-500` / `text-blue-400` | `text-brand-primary` |
| `bg-gray-100` | `bg-surface-muted` |
| `bg-gray-50` | `bg-surface-default` |
| `text-gray-500` | `text-text-secondary` |
| `text-gray-400` | `text-text-disabled` |
| `text-gray-900` | `text-text-primary` |
| `bg-black` | `bg-[#0A0A0A]` + comment `/* palette-neutral-950 */` |
| `bg-black/50` | Keep for modal backdrops and image overlays |
| `text-white` | `text-text-inverse` |
| `#EEFF41` / `#BEFF00` | `bg-brand-primary` |
| `#595959` | `text-text-secondary` |
