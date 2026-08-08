# 0033 — Collection markers may carry owner-chosen colour and size

**Status:** Accepted — 2026-08-08
**Context:** Roadmap Task 5.8 (UX Refinement Round), CSV ref #32

## Context

`docs/DESIGN_TOKENS.md` §10 states markers are monochrome and enforces it with a
raw-hex ESLint guard over `src/features/maps/**` plus assertions in
`pinStyling.test.ts` ("no `MAP_MARKER_FILL` value is lime", "no fill is
translucent"). The one place a member-chosen colour already existed — the Custom
Categories swatch picker in the Collection Settings "Markers" tab — was made
inert by `CollectionMapPage.tsx`, which overwrote every custom category's colour
with `MAP_MARKER_FILL.brandPrimary` before it ever reached the map. `custom_categories`
is stored `jsonb` with no validation; the colour field is read but discarded.

Task 5.8 asks for owner-chosen colour *and* size across all five Categorization
Methods (Uniform, Personal Status, Member Status, Member Ratings, Custom
Categories), not just Custom Categories. The owner was asked whether to keep
markers monochrome (colour confined to a size ladder) or allow real hue, given
the conflict with the existing rule; they chose free hue.

## Decision

**Collection maps only** (the map rendered from `CollectionMapPage.tsx` for a
specific collection at `/:username/map/:slug`) may render markers in an
owner-chosen hex colour and a named size (`sm`/`md`/`lg`), stored per collection
in a new `collections.marker_styles` jsonb column, one entry per method ×
category bucket. Global surfaces — `/map`, `/search`, discover/browse — are
**unchanged**: they carry no `color` override and keep rendering the monochrome
percentile ladder.

This narrows, rather than repeals, §10's monochrome rule:

- **Opaque fills only.** `marker_styles` colours are validated
  (`src/features/collections/markerStyles.ts`) against `/^#[0-9a-f]{6}$/i`
  before they ever reach `backgroundColor` — the same "no alpha in a fill"
  invariant §10 already states, now enforced on user input instead of only on
  literals.
- **Ring/content polarity is computed, not hard-coded.** The old
  `isDarkFace = color === MAP_MARKER_FILL.brandPrimary` equality only worked
  because exactly three colours existed. `pinStyling.ts` now derives polarity
  from relative luminance so an arbitrary member hue still gets a legible ring
  and glyph on the positron basemap. Behaviour for the three existing
  `MAP_MARKER_FILL` values is unchanged (verified by
  `pinStyling.test.ts`).
- **Size, not hue, still carries cluster rank.** `colorOverrideRank()` used to
  map colour → rank (`brandPrimary`→5, `white`→3, else→2), which would collapse
  every new member hue to rank 2 and flatten cluster visuals. It is re-keyed on
  the marker's `size` (`lg`→5, `md`→3, `sm`→2), falling back to the old hue
  mapping when no size is present (system-styled pins: itinerary numerals,
  photography-gap heatmap).
- **Defaults reproduce today's map exactly.** A null or partial
  `marker_styles` renders byte-identical to pre-5.8 behaviour — the parser
  merges over `DEFAULT_MARKER_STYLES`, which reuses the existing
  `MAP_MARKER_FILL` values.
- **`MAP_MARKER_FILL` remains the literal-hex palette for *system* faces** —
  the monochrome ladder, the photography-gap heatmap — and the ESLint
  raw-hex guard over `src/features/maps/**` stays in force. Member colours are
  data (a `marker_styles` jsonb value), never a literal in source, so the
  guard's rationale is untouched.

## Alternatives rejected

- **Keep the ladder, add only size.** What the owner was offered as the
  design-preserving option; declined in favour of literal roadmap wording
  (colour, not just prominence).
- **A small curated palette (~5 muted colours) instead of free hex.** Also
  offered and declined — the owner wants free choice.
- **Extend colour to all map surfaces, not just collections.** Out of scope:
  Task 5.8's roadmap text and CSV ref are scoped to the Collection Settings
  Markers tab; `/map` and `/search` are unrelated surfaces with their own
  percentile-ladder contract that this task does not touch.

## Consequences

- A busy collection with many member-chosen hues will read visually noisier
  than the monochrome ladder — the luminance-derived ring and the unchanged
  size ladder are the only guardrails against illegibility. Accepted trade,
  stated to the owner before implementation.
- `pinStyling.test.ts`'s "no fill is translucent" / "no fill is lime" guards
  now apply to `MAP_MARKER_FILL` (system faces) specifically, not to member
  data — a member could in principle set a lime hex on their own collection.
  That is intentional: brand-accent rationing (§10) protects *our* UI, not
  what a member paints their own map with.
- `custom_categories.color` (pre-5.8) is superseded by
  `marker_styles.custom[<category id>].color`; the old field is left in place
  unused rather than migrated, since it was already inert and removing it is
  out of scope.
