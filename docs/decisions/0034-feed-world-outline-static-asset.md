# 0034 — The feed's world-map widget ships a committed static outline, not a mapping dependency

**Status:** Accepted — 2026-08-08
**Context:** Roadmap Task 6.1 (Phase 6 — Feed, notifications & social), CSV ref #6

## Context

The feed's right-sidebar "My Map" widget previewed the member's library as an
abstract "ink density plate" — a grid of grey squares with no coastlines, no
labels, no geography of its own (`LibraryAtlasPlate.tsx`). It read as pixel
noise rather than a map.

It was also expensive for a secondary widget: `fetchLibraryPins` pulled the
member's **entire** library — every `user_buildings` row, joined to
`buildings.location`, up to 4,000 rows — into the browser on the feed's first
paint, just to draw a 320px thumbnail. One QA account currently carries
13,672 library rows.

The obvious fix — a recognisable world map with the member's collection
plotted on it — runs into the roadmap's explicit scope boundary: "no new
heavy map dependency without an ADR." The app deliberately keeps MapLibre off
the feed bundle (the app's most-visited route); pulling in any mapping
library (MapLibre, a GeoJSON renderer, a projection library) to draw one
small thumbnail would violate that.

## Decision

1. **Aggregate server-side.** A new RPC, `get_my_map_summary()`
   (`security invoker`, no elevated privilege needed — the existing RLS on
   `user_buildings`/`buildings` already scopes reads to the caller), returns
   three kinds of rows: whole-library and mappable totals, the top 3 places,
   and the library binned into coarse 5°×5° cells with an averaged centroid
   per cell. Regardless of library size, this is a few dozen rows — the same
   cost whether a member has 3 buildings or 13,000.
2. **Ship the world outline as committed, generated static data — not a
   runtime dependency.** `scripts/build-world-outline.mjs` is a one-off
   generator (not run at build or request time) that decodes the
   public-domain Natural Earth 110m land dataset (fetched once via the
   `world-atlas` npm package's CDN JSON — no install) into a plain SVG path
   string and a handful of continent label positions, both baked into
   `src/features/feed/data/worldLand.ts`. The widget imports that module like
   any other data file; no projection code, no GeoJSON parser, and no
   mapping library ship at runtime. The equirectangular projection
   (`x = (lng+180)*2, y = (90-lat)*2`) is linear, so plotting the RPC's
   lat/lng cells into the same frame is plain arithmetic
   (`projectLngLat` in the same module).
3. **Render as a heat of soft glows, not pins.** The user explicitly asked to
   avoid loading (or drawing) a marker per building — a heavy collector would
   still cost the widget thousands of DOM nodes even with the RPC already
   capping the network payload. Each aggregated cell becomes one blurred
   circle (`feGaussianBlur`), radius and opacity ramped sub-linearly off the
   cell's share of the busiest cell (mirrors the old ink plate's `INK_GAMMA`
   idea) — dense regions glow, a lone building is still a visible dot.

The generator script's output is committed and reviewed like any other
source file; re-running it only matters if the outline itself needs to
change (e.g. swapping in a different resolution or land dataset).

## Alternatives rejected

- **A `<img>` from a static-map provider (Mapbox Static Images, Google Static
  Maps) per user.** Adds an external network dependency and per-render cost
  to the feed's first paint for a small thumbnail; also awkward for
  multi-region heat (a static-map API centres on one point/bbox, not several
  weighted regions at once).
- **MapLibre (or any GeoJSON/topojson runtime library) rendering the outline
  live.** Exactly what the roadmap scope boundary rules out — it would drag
  the feed's most-visited route into loading a mapping stack for a 320px
  widget.
- **Keep plotting individual pins (clustered client-side).** Still requires
  fetching every pin's coordinates to the browser to cluster them — the
  RPC's server-side aggregation is what removes the "thousands of pins"
  problem, not just the rendering choice.

## Consequences

- The feed widget's network payload for this data is now a few dozen small
  rows regardless of library size, replacing a fetch that scaled linearly
  with it.
- `LibraryAtlasPlate.tsx` and `src/features/feed/utils/libraryAtlas.ts` (the
  ink-plate binning/bloom/scale-bar math) are deleted; `/map`'s own stats
  masthead (`MyMapChrome`, `useLibraryEntries`) is untouched — it still reads
  the full library because it needs exact per-building rows, not a
  thumbnail.
- The committed `worldLand.ts` path data (~47KB, ~18KB gzipped) is a
  one-time addition to the feed route's bundle. Re-run
  `scripts/build-world-outline.mjs` (optionally with `--source <local file>`
  when the environment can't reach the CDN directly) only if the outline
  itself needs to change.
