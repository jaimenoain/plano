# Roadmap

## Phase 5 Summary

**Completed:** 2026-03-30

- **Delivered:** `strictNullChecks: true` in app and root TypeScript configs; production code cleared of `@typescript-eslint/no-explicit-any` (error level, tests unchanged); GitHub Actions CI (`.github/workflows/ci.yml`) for `main` PRs/pushes: typecheck, lint (`--max-warnings 0`), test, build with placeholder `VITE_SUPABASE_*`; `CONTRIBUTING.md` with branch protection guidance; ESLint hygiene (unused catch bindings, `_`-prefixed unused destructuring, `use-toast` action types as pure types); `npm run lint` enforces zero warnings.
- **Config choices:** `react-hooks/exhaustive-deps` is **off** repo-wide to avoid risky mass refactors on data-heavy effects (re-enable incrementally per screen). `react-refresh/only-export-components` is **off** for `src/components/ui/**` and a small set of hooks/providers that legitimately co-export helpers.
- **Spec updates:** None required for this phase (typing and tooling only).
- **Descoped / deferred:** None.

## Phase 6 — Visual Redesign (planned)

### Task 1.5 — BottomNav active indicator shape

Replace the current rounded-dot active indicator in the bottom navigation with a sharp, token-aligned treatment:

- Active nav item uses a top-edge underline: `border-t-2 border-brand-primary`.
- This mirrors the sidebar pattern, where the active item uses `border-l-2 border-brand-primary`, so the \"you are here\" signal is consistent across navigation contexts.

### Task 6.2 — Feed redesign (amended)

Refine the activity feed to feel like a focused, photography-first social stream rather than a wide document:

- **Column width:** Constrain the main feed column to `max-w-2xl mx-auto` so cards do not stretch excessively on desktop.
- **Hero image ratio:** Standardise feed building/card images to `aspect-[4/3]` with `w-full object-cover`, using consistent cropping across all feed card types.
- **Action bar:** Use icon-only buttons for repeated actions:
  - Left cluster: like + comment with counts (icon plus number, no text labels).
  - Right cluster: visited, save, hide as ghost icon buttons without text labels, with tooltips on hover for desktop.
- **Compact activity items:** Replace naked text rows with a compact card pattern:
  - Wrapper: `bg-surface-card border border-border-default rounded-sm p-4`.
  - Single activity: avatar + name + timestamp in the header, one-line description in the body.
  - Multiple sequential activities from the same user: group into one card with a shared header and a bulleted list of individual actions.

### Task 8.1 — BuildingDetails layout (amended)

Restructure the building detail page around a hero-first, photography-centric layout with clear section hierarchy:

- **Hero-first:** The hero image/gallery is the first visual element on the page, above the building name and far above the map.
- **Section order:**
  - Hero image / gallery.
  - Summary header (tier badge, name, architect link, location + year, compact action bar).
  - Details / taxonomy section.
  - Your Activity card.
  - Photos gallery section.
  - Location section (map + address / directions).
  - Community Notes review cards.
  - Nearby buildings.
- **Map placement:** Move the map into a dedicated `Location` section below the photo gallery and activity; it must not appear above the hero imagery.
- **Edit controls:** Demote \"Edit Official Data\" from a full-width outlined button into a subtle affordance:
  - Desktop: ghost icon button (pencil) in the title/header row.
  - Mobile: placed inside an overflow `...` menu associated with the header.
- **Photo gallery:** Use a grid, not a vertical stream of full-width images:
  - Mobile: `grid grid-cols-3 gap-2` thumbnails.
  - Desktop: `grid grid-cols-6 gap-2` within the content width.
  - Thumbnails: `aspect-square rounded-sm overflow-hidden cursor-pointer`, opening a full-screen lightbox viewer when tapped/clicked.
- **Community Notes:** Render community notes as individual review cards using the standard card pattern:
  - `bg-surface-card border border-border-default rounded-sm p-4`.
  - Consistent spacing between avatar, name, timestamp, rating dots, text, and any attached photos.

### Task 8.3 — BuildingAttributes taxonomy (amended)

Replace cramped icon rows with a clear, scannable definition list for building taxonomy metadata:

- **Definition list layout:**
  - Two-column grid: labels column (~120px) and flexible values column.
  - Example: `grid grid-cols-[120px_1fr] gap-y-3 gap-x-4`.
  - Labels (`dt`): `text-xs font-medium text-text-secondary uppercase tracking-wide`.
  - Values (`dd`): `text-sm text-text-primary`.
- **Badge clusters for multi-valued attributes:**
  - For materials, styles, and context, values render as inline badge clusters inside the `dd`.
  - Example: `className="flex flex-wrap gap-2"` with shared `Badge` components (`Concrete`, `Glass`, `Modern`, `Urban`, etc.).

### Task 10.1 — Profile layout (amended)

Make profile pages photography-first, constrain layout width, and clarify controls:

- **Building cards: image-first:**
  - Image at the top of the card: `aspect-[4/3] w-full object-cover`, flush with card edges (no padding above the image).
  - Text content (name, architect, year, badges, counts) sits below the image inside `p-4`.
- **Responsive grid constraints:**
  - Container: `max-w-6xl mx-auto` on desktop so the grid never bleeds off-screen.
  - Grid: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6` with a maximum of 4 columns at large breakpoints.
- **Image fallbacks:**
  - For buildings without photos, render a neutral placeholder: `bg-surface-muted flex items-center justify-center aspect-[4/3]` with a `Building`/`Building2` icon in `text-text-disabled`.
- **Control bar simplification:**
  - First row: content filter tabs `All | Reviews | Bucket List` on the left, plus a right-aligned view mode segmented control `[Grid | Kanban | List]`.
  - Move low-frequency toggles like \"Community Photos\" into a filter popover or secondary control row; they should not compete with primary tabs and view modes.
- **Collection cards:**
  - Enhance collection cards with a 2×2 preview mosaic assembled from buildings in the collection, rather than text-only tiles, to communicate the visual character of each collection.

### Task 3.x — Affinity percentage badges (new)

Tokenise and tier avatar affinity percentage badges used in social / people discovery and profile social context:

- **Token-aligned tiers:**
  - High affinity (>75%): `bg-brand-primary text-brand-primary-foreground`.
  - Moderate affinity (50–75%): `bg-brand-secondary text-brand-secondary-foreground`.
  - Low affinity (<50%): `bg-surface-muted text-text-secondary border border-border-default`.
- **Shape and placement:**
  - Badge shape: `rounded-full text-xs font-bold` so it reads as a compact pill overlaid on circular avatars.
  - Ensure the implementation file (for example, `src/features/profile/components/SocialContextSection.tsx`) uses this shared styling wherever affinity percentages are shown.

### Phase 6 Cross-Cutting Visual Patterns

The following shared patterns apply across all Phase 6 tasks and future visual work:

- **Card image aspect ratios:** Building cards standardise on `aspect-[4/3]` hero images; photo gallery thumbnails use `aspect-square` for grid layouts.
- **Status badges (Visited / Saved):** Use the shared badge component and semantic tokens so search, feed, and profile treatments converge:
  - Visited: `bg-brand-secondary text-brand-secondary-foreground rounded-sm px-2 py-0.5 text-xs font-medium uppercase tracking-wide`.
  - Saved: `bg-surface-muted text-text-secondary border border-border-default rounded-sm px-2 py-0.5 text-xs font-medium uppercase tracking-wide`.
- **Navigation active indicators:** Sidebar and bottom nav both rely on thin brand-primary bars instead of dots or pills:
  - Sidebar: `border-l-2 border-brand-primary` on the active item.
  - Bottom nav: `border-t-2 border-brand-primary` on the active item (Task 1.5).
