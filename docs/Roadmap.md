Good, I have a thorough picture of the codebase. Let me now quickly scan a handful of the most complex pages to spot specific responsiveness issues before writing the roadmap.

Here is the full roadmap:

---

# Mobile Responsiveness Roadmap

## Methodology

All work targets **375px** as the primary baseline (iPhone 14/15, the dominant form factor), with **320px** as the minimum acceptable width. The primary breakpoint boundary in this codebase is `md` (768px) — mobile means everything below that. Admin routes are excluded; they are desktop-only by design.

---

## [x] Phase 1 — Systemic Fixes (do these first, they affect every page)

These are patterns that repeat across the entire app. Fixing them at the component level eliminates the same bug from many pages at once.

### 1.1 BottomNav bottom-padding gap

**Problem:** `AppLayout` renders a `BottomNav` (fixed, `h-20`) on mobile, but most pages render their content without `pb-20` clearance. The last ~80px of content on every affected page is hidden behind the nav bar.

**Affected pages (confirmed):** `BuildingDetails`, `Events`, `EventDetail`, `PersonDetails`, `CompanyDetails`, `GuidesPage`, `ArchitectureHub`, `LocalityPage` — and likely `Profile`, `AddBuilding`, `WriteReview`.

**Fix:**
- Audit every page that uses `AppLayout` and ensure the scrollable content container has `pb-20 md:pb-0` (or that `AppLayout` itself injects this padding so individual pages don't need to).
- Preferred approach: add `pb-20 md:pb-0` to `AppLayout`'s scroll container directly, then remove page-level overrides. This is a one-line fix in [`src/components/layout/AppLayout.tsx`](src/components/layout/AppLayout.tsx).

---

### 1.2 Small touch targets on interactive elements

**Problem:** Many buttons and triggers fall below the 44×44px minimum touch target recommended by Apple HIG and WCAG 2.5.5. Recurrent patterns:
- `size="sm"` shadcn buttons → `h-8` (32px)
- `CollapsibleTrigger` with `py-3` → ~24–28px
- Filter chips with `px-2.5 py-1` → ~24px
- Icon-only buttons with `p-1` (`h-4 w-4` icon) → ~24px

**Fix:** Define a `min-h-[44px] min-w-[44px]` constraint in shared button/trigger components, or add a Tailwind utility class `touch-target` that applies these minimums on mobile. For icon buttons, add `p-2.5` as the default mobile padding rather than `p-1`.

---

### 1.3 Hover-only interactive states

**Problem:** Many interactive elements use `opacity-0 group-hover:opacity-100` or `hover:text-*` with no active/focus alternative. On touch devices these states are never activated, hiding affordances entirely. Examples:
- Edit pencil on Profile avatar (only visible on hover)
- "Remove" button in Settings verification section (invisible on touch)
- Photo overlay effects on BuildingDetails editorial stream
- `h-7` clear-search button in Profile toolbar

**Fix:**
- Replace `group-hover:opacity-100` with `group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100` for touch devices.
- For "Remove" and destructive hover reveals: always show on mobile. Use `hidden md:block group-hover:block` (i.e. always visible on mobile, hover-only on desktop).

---

### 1.4 `MasonryPhotoGrid` column count

**Problem:** Inline style `columnCount: 3` in `Profile.tsx` creates ~100px-wide columns at 320px — far too small for photos and interactive tap targets.

**Fix:** Make column count responsive. Use `columnCount: isMobile ? 2 : 3` (where `isMobile` checks `window.innerWidth < 768`) or, better, use a CSS-based approach: `columns-2 md:columns-3`.

---

## Phase 2 — Page-by-Page Review

Work through pages roughly in order of user traffic (core pages first). Subsection headings track completion (`[x]` / `[ ]`).

---

### [x] 2.1 Feed — [`src/features/feed/pages/Index.tsx`](src/features/feed/pages/Index.tsx)

| Issue | Fix |
|---|---|
| Collections grid `grid-cols-3` at 320px (~98px per card) is cramped | Change to `grid-cols-2 sm:grid-cols-3` |
| `text-[11px]` on retry button | Raise to `text-xs` (12px) minimum |
| `px-6` side padding on 320px leaves only 272px — very tight with inner grids | Reduce to `px-4` on mobile |

---

### [x] 2.2 Explore — [`src/features/explore/pages/Explore.tsx`](src/features/explore/pages/Explore.tsx)

This page already has excellent mobile treatment (full-screen map, hide-chrome mode, `safe-area` insets). Focus areas:
- Verify the `Discovery` compact variant renders correctly at 320px
- Ensure filter/tag chips in the overlay meet 44px touch target minimum
- Confirm the map hide-chrome trigger threshold feels natural on touch scroll

---

### [ ] 2.3 Building Details — [`src/features/buildings/pages/BuildingDetails.tsx`](src/features/buildings/pages/BuildingDetails.tsx)

| Issue | Fix |
|---|---|
| No `pb-20 md:pb-0` (covered by Phase 1.1) | Resolved by systemic fix |
| Skeleton loading row uses `overflow-hidden` not `overflow-x-auto` | Change to `overflow-x-auto` |
| `group-hover` photo overlays never activate on mobile | Apply Phase 1.3 fix |
| `w-28` label column in definition list can squeeze at 320px | Reduce to `w-24` or use `w-auto min-w-[80px]` |
| Hero image height: `py-24 md:py-32` is very viewport-dominant on short phones | Cap at `max-h-[50vh]` on mobile |

---

### [ ] 2.4 Profile — [`src/features/profile/pages/Profile.tsx`](src/features/profile/pages/Profile.tsx)

| Issue | Fix |
|---|---|
| No `pb-20` (covered by Phase 1.1) | Resolved by systemic fix |
| Masonry 3-column at 320px | Apply Phase 1.4 fix |
| Toolbar row overflows at 320px | Wrap toolbar in `flex-wrap` and expand search input to full row on focus |
| `h-7` icon buttons below touch target | Apply Phase 1.2 fix |
| Hover-only edit pencil | Apply Phase 1.3 fix |
| Followers/following count buttons: `hover:opacity-60` only | Add `active:opacity-60` |

---

### [ ] 2.5 Search — [`src/features/search/SearchPage.tsx`](src/features/search/SearchPage.tsx)

| Issue | Fix |
|---|---|
| Mobile search bar `left-14` leaves only 248px at 320px | Reduce left offset or use a full-width search bar on mobile |
| List/Map toggle `h-9` (36px) | Raise to `h-11` (44px) |
| Toggle button `bottom-8` has no `safe-area-pb` guard | Add `mb-[env(safe-area-inset-bottom)]` or `safe-area-pb` |

---

### [ ] 2.6 Events List — [`src/features/events/pages/Events.tsx`](src/features/events/pages/Events.tsx)

| Issue | Fix |
|---|---|
| No `pb-20` (covered by Phase 1.1) | Resolved by systemic fix |
| Audit `EventCard` component for touch target sizes | Check and fix |

---

### [ ] 2.7 Event Detail — [`src/features/events/pages/EventDetail.tsx`](src/features/events/pages/EventDetail.tsx)

| Issue | Fix |
|---|---|
| `pb-12` insufficient — needs `pb-20 md:pb-12` | Fix bottom padding |
| RSVP buttons `text-xs` with no height guarantee — ~20–24px | Wrap in `min-h-[44px]` or use `size="default"` variant |
| Hero `48vh` is very dominant on short phones | Cap at `max-h-[240px] md:max-h-[500px]` |
| `hover:text-*` only on all action links | Add `active:` equivalents |

---

### [ ] 2.8 Person Details — [`src/features/credits/pages/PersonDetails.tsx`](src/features/credits/pages/PersonDetails.tsx)

| Issue | Fix |
|---|---|
| No `pb-20` (covered by Phase 1.1) | Resolved by systemic fix |
| `CollapsibleTrigger py-3` — ~24px tall | Raise to `py-3 min-h-[44px]` |
| "Claim this profile" `size="sm"` (32px) | Change to `size="default"` on mobile |

---

### [ ] 2.9 Company Details — [`src/features/credits/pages/CompanyDetails.tsx`](src/features/credits/pages/CompanyDetails.tsx)

| Issue | Fix |
|---|---|
| No `pb-20` (covered by Phase 1.1) | Resolved by systemic fix |
| `CollapsibleTrigger py-3` same issue as PersonDetails | Same fix |
| Steward row "Remove" `size="sm"` (32px) beside truncated username | Give the button `min-w-[44px] min-h-[44px]` |
| `SelectTrigger h-10` (40px) slightly under target | Raise to `h-11` (44px) |

---

### [ ] 2.10 Notifications — [`src/features/notifications/pages/Notifications.tsx`](src/features/notifications/pages/Notifications.tsx)

| Issue | Fix |
|---|---|
| Settings gear `p-1` → ~24px tap area | Change to `p-2.5` |
| Notification rows are `div onClick` with no semantic role | Add `role="button" tabIndex={0}` and `onKeyDown` handler, or convert to `<button>` |
| `text-5xl` heading is very large at 320px | Consider `text-3xl md:text-5xl` |

---

### [ ] 2.11 Architecture Hub — [`src/pages/ArchitectureHub.tsx`](src/pages/ArchitectureHub.tsx)

| Issue | Fix |
|---|---|
| No `pb-20` (covered by Phase 1.1) | Resolved by systemic fix |
| Stats strip `grid-cols-3 gap-8` with `text-4xl` numbers overflows at 320px | Change to `grid-cols-3 gap-4` or `gap-2`, reduce font to `text-3xl md:text-4xl` |
| `py-24 md:py-32` hero consumes half the screen on phones | Change to `py-12 md:py-24` |

---

### [ ] 2.12 Locality Page — [`src/features/localities/pages/LocalityPage.tsx`](src/features/localities/pages/LocalityPage.tsx)

| Issue | Fix |
|---|---|
| No `pb-20` (covered by Phase 1.1) | Resolved by systemic fix |
| `FilterChip px-2.5 py-1` — ~24px tall | Raise to `min-h-[44px]` with `px-3 py-2` |
| `QuickActions px-1` on mobile is very cramped | Change to `px-3` on mobile |
| `CollectionPreviewMosaic` inner `grid-cols-[2fr_1fr]` renders thumbnail column at ~50px | Cap minimum column width or hide secondary column on mobile |

---

### [ ] 2.13 Guides — [`src/features/guides/GuidesPage.tsx`](src/features/guides/GuidesPage.tsx)

| Issue | Fix |
|---|---|
| No `pb-20` (covered by Phase 1.1) | Resolved by systemic fix |
| Continent filter tab buttons `px-3 py-1.5` (~30px) | Raise to `min-h-[44px]` |

---

### [ ] 2.14 Settings — [`src/features/profile/pages/Settings.tsx`](src/features/profile/pages/Settings.tsx)

| Issue | Fix |
|---|---|
| "Remove" hover-reveal (`opacity-0 group-hover:opacity-100`) is inaccessible on touch | Apply Phase 1.3 fix — always visible on mobile |
| Action card rows may overflow at 320px | Add `flex-wrap` to card rows |
| Inputs `h-10` (40px) slightly under 44px recommendation | Low priority — shadcn default, acceptable |

---

### [ ] 2.15 Collection Map — [`src/features/collections/components/CollectionMapPage.tsx`](src/features/collections/components/CollectionMapPage.tsx)

This page already uses `dvh` units and `safe-area` insets correctly. Focus areas:
- Verify the saved-places filter dot control is reachable above the BottomNav
- Confirm map controls don't overlap mobile address bar on Chrome/Android
- Test pinch-to-zoom doesn't conflict with browser zoom

---

### [ ] 2.16 Auth & Onboarding — [`src/features/auth/pages/Auth.tsx`](src/features/auth/pages/Auth.tsx), [`Onboarding.tsx`](src/features/auth/pages/Onboarding.tsx)

These are standalone pages (no `MainLayout`) but are the first thing new users see on mobile.
- Verify form fields are `font-size: 16px` (already enforced globally in `index.css`) to prevent iOS zoom
- Check that the logo, form, and CTA all fit above the fold on a 375×667px screen (iPhone SE)
- Ensure submit buttons are full-width on mobile for easy tapping

---

## [ ] Phase 3 — Polish

Once all pages are structurally sound, do a pass for visual quality:

| Area | What to check |
|---|---|
| Typography scale | Use a capped scale on mobile: `text-3xl` max for headings, `text-base` (16px) for body. Review `text-5xl`/`text-6xl` editorial headings across the app. |
| Image aspect ratios | Ensure `object-cover` with explicit `aspect-ratio` on all card images so there's no layout shift on mobile. |
| Horizontal scroll | Audit every `overflow-x-auto` scroller — ensure they have `-webkit-overflow-scrolling: touch` and `scrollbar-width: none` for a clean native-scroll feel. |
| Spacing rhythm | On mobile, prefer `px-4` containers (not `px-6`) to give content more breathing room at 320–375px. Audit all `px-6` usages below `md`. |
| Focus rings | Ensure all interactive elements have a visible focus ring (`focus-visible:ring-2`) for keyboard/switch-access users, not just touch. |
| Dark mode / contrast | Not in scope here, but if dark mode is planned, test color contrast at each breakpoint. |

---

## Suggested execution order

```
Phase 1.1 (BottomNav padding)       ← single component fix, biggest impact
Phase 1.2 (touch targets, systemic) ← define utility/convention
Phase 1.3 (hover reveals)           ← fix per component
Phase 2 pages in this order:
  Feed → Building Details → Search → Profile →
  Events → Event Detail → Person/Company Details →
  Notifications → Architecture Hub → Locality Page →
  Guides → Settings → Collection Map → Auth
Phase 1.4 (Masonry columns)         ← alongside Profile
Phase 3 (polish pass)
```

