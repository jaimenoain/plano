# 0024 — The rail's Discover list reads the list RPC, not the cluster layer

**Status:** accepted (2026-07-31); amended by [ADR 0026](0026-collection-rail-view-drives-the-map.md)
(2026-08-01) — the Discover **tab** became one of three **views** that drive the map as well as the
rail, and its content became the union of the enabled sources rather than the catalogue alone. The
list contract below is unchanged. Amended again by
[ADR 0032](0032-viewport-list-contract.md) (2026-08-06): the bbox half of the first consequence
below is **obsolete** — both bbox buffers were removed, so the list and the pins now cover the same
box. The ordering half stands, and with it the no-count-badge decision.

**Context.** [ADR 0021](0021-collection-map-two-cluster-sources.md) gave the collection map a
discovery view, but only the *map*. The rail went on listing the collection roster whatever the map
was showing, so with "hide buildings already in this collection" also on, nothing in the list
appeared on the map and nothing on the map appeared in the list. Adding was pin-by-pin through the
detail drawer, and a building swallowed by a cluster bubble could not be added at all.

The rail now gains a **Discover** tab beside Collection, listing what is in view and addable. The
obvious source for it — the discovery pins already on screen — does not work: those come back from
`get_map_clusters_v3` as `ClusterResponse`, and an `is_cluster` row is an opaque count with no name.
Below cluster-resolution zoom there is simply nothing to render as a row.

**Decision.** The Discover list reads **`get_buildings_list`** over the page's settled
`viewportBounds`, with the collection subtracted client-side. That is the same split `/search`
browse mode already runs: the map draws clusters from one RPC while the list pages un-clustered rows
from another, over the same bbox. Rows are `BuildingListRow` — the row `/search` already draws from
this RPC, whose props are exactly its return columns — with the shared `AddToCollectionButton` in
its `actionSlot`.

Consequences we accept:

- **The list and the pins will not agree exactly.** Clusters against rows; `useMapData` inflates
  its bbox ~30% via `calculateFetchBox` while the list uses the settled bounds; and
  `get_buildings_list` takes no `ranking_preference`, so ordering differs from the map's global
  discover ranking. The two panes answer the same question at different resolutions.
  *(Superseded in part by [ADR 0032](0032-viewport-list-contract.md): the bbox inflation is gone —
  `BUFFER_RATIO` is 0 and `get_map_clusters_v3` no longer pads either — so the two panes now cover
  the identical box. Only the ordering difference remains, which is still enough to withhold a
  count badge.)*
- **Therefore the Discover tab carries no count badge.** There is no honest number available: the
  map's is an approximate cluster count that can include collected buildings (ADR 0021), the list
  is paged so we only ever know how many we have *loaded*, and the two cover different areas. The
  Collection tab's count stays, because that one is exact and in memory. The truthful end-signal is
  the "End of this view." footer.
- **Rows are plain links with no map cross-highlight.** A discovered building is usually inside a
  cluster, so there is no pin to highlight and the gesture would silently do nothing most of the
  time.
- **A viewport wider than `MAX_DISCOVER_SPAN_DEG` refuses to list.** Unranked, a continent-wide page
  one is an arbitrary twenty buildings; the map is drawing opaque bubbles at that zoom anyway.
- **The list needs a content-level top-up of its own.** `useInfiniteScrollSentinel` now takes the
  rail's shared scroller as its observer root, but its auto-fill probe is geometric and that
  scroller already overflows because of the masthead. A page whose every row was subtracted as
  already-collected would otherwise strand page two with no scroll possible — and for a well-worked
  collection in its home city that is the normal case, not an edge one.

**Rejected alternatives.**

- *Derive the list from the discovery cluster response.* Rejected: no names below cluster
  resolution, so the tab would be empty exactly where a scouting list is most useful.
- *Add a `ranking_preference` or a "not in this collection" anti-join to `get_buildings_list`.*
  Rejected for the same reason ADR 0021 rejected it for the cluster RPC: a per-request anti-join on
  a hot, cached, `/search`-shared query path, to save a client-side `Set.has`.
- *Give the Discover tab its own scroll container.* Rejected: the rail is deliberately one scroller
  so the masthead can scroll away, and a nested one would strand the header and break the sticky
  toolbar.
- *Swap the rail's list for the discovery list instead of adding a tab.* Rejected: the roster is
  half of the comparison an editor is making, and a list that silently changes meaning with a
  setting buried in a dialog is the confusion the tab exists to avoid.
