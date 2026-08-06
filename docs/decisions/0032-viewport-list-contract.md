# 0032 — The SERP list and the map pins answer one question about one box

**Status:** accepted (2026-08-06). Amends the first consequence bullet of
[ADR 0024](0024-collection-discover-rail-list.md).

**Context.** On `/map` and on the collection detail page, the list beside the map
disagreed with the map. Investigation for roadmap Task 4.1 found not one bug but
nine independent divergences, and no shared definition anywhere of what the two
panes were supposed to have in common. Each fix on its own looked like a rounding
detail; together they were the difference between "12" on a cluster bubble and
eight rows in the list.

The geometry was the worst of it. The list queried the settled `map.getBounds()`.
The pins queried that box padded **30% per side** by `useMapData.calculateFetchBox`
and then padded a **further 10% of the span per side** inside
`get_map_clusters_v3` — about **1.9× the linear span, 3.7× the area**. Because a
cluster's count comes from a `GROUP BY st_snaptogrid` over whatever rows the
`WHERE` clause admitted, a bubble sitting well inside the viewport was counting
buildings the list could never page to.

The SQL was worse still in kind: `get_buildings_list` short-circuited its bbox
predicate to TRUE whenever `filter_criteria->>'query'` was non-empty, so the list
went *global* while the pins stayed viewport-bound and ignored the query
entirely. The two panes were not approximating one answer; they were answering
different questions.

**Decision.** One contract, stated once and asserted in tests:

> **When the map is at rest, the SERP list's universe is exactly the set of
> buildings whose location falls inside `map.getBounds()` — the same set the
> pins aggregate.**

What that costs, and why each cost is worth paying:

- **No prefetch buffer, on either side.** `BUFFER_RATIO` is 0 and the RPC clamps
  without inflating. Panning no longer pre-warms the ring outside the viewport.
  This is affordable because the cluster query keeps
  `placeholderData: keepPreviousData` — the previous pins stay painted while the
  new box resolves, so the edge goes briefly *stale*, not blank, which is
  already what happened for any pan wider than 30% of the viewport.
- **The browse list applies no text query.** Not the RPC's short-circuit, and not
  the client's `filter_criteria.query` either. Global text search is Find mode's
  job (`search_buildings_v2`, ≥ 2 characters), and Find mode supplies the list
  **and** the pins from one result set — so the panes agree there by
  construction rather than by coincidence. Below the threshold, neither pane
  searches. This also retires the auto-fit effect in `BuildingSidebar`, which was
  half of a loop: an unbounded result set re-framed the camera, which changed
  `bounds`, which re-ran the list.
- **Hidden buildings leave the list.** `get_map_clusters_v3` has always excluded
  `user_buildings.status = 'ignored'`; `get_buildings_list` never did, so a
  building the user hid sat in the list forever without ever drawing a pin.
  Owner's call: honour the hide on both surfaces.
- **`hydrateFromURL` recomputes bounds.** It moved lat/lng/zoom and left `bounds`
  alone, so a deep link or a back/forward hop left the list on the *previous*
  viewport until the map settled. It now re-seeds from
  `approximateBoundsFromCenter`, the same approximation the store is created
  with; the map overwrites it with the real box on `onLoad`.
- **The collection roster follows the map.** It was a single unbounded fetch of
  every `collection_items` row, so a user zoomed into one city read two hundred
  rows against four pins. It is now narrowed by `isLngLatInBounds` against the
  page's settled `viewportBounds` — with a counted "N more outside this view"
  footer and a zoom-out back to the whole collection, because a curated roster
  that silently shrinks reads as data loss. Two deliberate exemptions: the
  itinerary view (a day sequence renumbers if a stop is dropped) and the state
  before the map has reported any viewport (filtering against null would flash
  an empty rail on every load).

**Consequences we accept.**

- **During a gesture the two panes still differ.** The pins refetch on a 150 ms
  throttle while the list waits for `moveend`; a list cannot repaint mid-drag.
  The contract is a statement about rest, and that is the only form it can take.
- **A cluster bubble's centroid can sit outside the viewport.** Grid cells snap
  to a global grid, so a cell straddling the edge draws its bubble slightly out
  of frame. Its *members* are all inside the box, which is what the contract is
  about.
- **Ordering still differs between the panes.** `get_buildings_list` takes no
  `ranking_preference`, so the list's order is not the map's discover ranking.
  ADR 0024's bullet claimed the list and the pins "will not agree exactly" and
  gave two reasons — bbox inflation and ordering. The bbox half is now obsolete;
  the ordering half stands, and the Discover tab still carries no count badge.
- **The collection map's own cluster counts are not covered.** Those come from a
  client-side Supercluster index built over every collection building, so a
  bubble's `point_count` reflects the whole collection regardless of viewport.
  Making it exact would mean rebuilding the index on every pan. Left as-is and
  recorded here rather than fixed silently; the roster — the thing users read —
  is exact.

**Rejected alternatives.**

- *Keep the prefetch buffer and clip on the client.* Single pins clip fine, but a
  cluster bubble is pre-aggregated — you cannot subtract the members that fell
  outside. The count would stay wrong, which is the artifact we set out to kill.
- *Drive both panes from the live throttled viewport.* The pins can afford a
  150 ms cadence; `get_buildings_list` is a ~300 ms RPC and re-running it per
  throttle tick during a drag would be gratuitous load for a list nobody can read
  mid-gesture.
- *Give `get_buildings_list` a "bbox optional" parameter instead of removing the
  short-circuit.* Adding a parameter creates a second overload rather than
  replacing the function, which makes the RPC ambiguous to PostgREST (this bit
  us on `get_discovery_feed` — see `docs/AI_STATUS.md`). And both callers are
  viewport lists, so the option would have no user.
