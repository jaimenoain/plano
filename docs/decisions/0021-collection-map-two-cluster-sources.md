# 0021 — The collection map draws from two cluster sources, not one

**Status:** accepted (2026-07-28)

**Context.** The collection map (`/:username/map/:slug`) gained a *discovery view*: switch on
"Show all buildings" and the map draws every building in the viewport, de-emphasized, so an owner
or editor can find and add buildings without leaving the map. That put two very different
workloads on one map:

- **The collection itself** — a bounded, already-loaded set (`collection_items` + `collection_markers`),
  clustered client-side with Supercluster in
  [`useCollectionClusters`](../../src/features/maps/hooks/useCollectionClusters.ts). It must react
  instantly to an add or a remove, carries itinerary stop numbers and per-collection
  categorisation colours, and is cheap because it never leaves memory.
- **The catalogue** — tens of thousands of buildings that cannot be held in the browser at all.
  `/search` already solves this with `get_map_clusters_v3`, a `SECURITY DEFINER` bbox+zoom RPC,
  behind [`useMapData`](../../src/features/maps/hooks/useMapData.ts).

**Decision.** Keep both. `useCollectionMapClusters` runs the two independently and concatenates
them into the single `ClusterResponse[]` that `MapMarkers` already consumes — collection pins
first, discovery pins after, each discovery row tagged `is_discovery: true` so `getPinStyle` can
fade it and push it below the whole pin ladder.

Consequences we accept:

- **Cluster counts on the discovery layer are approximate.** A server-side cluster bubble is an
  opaque count, so it can include buildings the collection already holds. Only *un-clustered*
  discovery pins are de-duplicated against `collectionBuildingIds`; zooming in resolves the
  overlap. Filtering inside the RPC by "not in this collection" was rejected — it would need a new
  RPC parameter and a per-request anti-join on a hot, cached, `/search`-shared query path.
- **Two clusterings can visually overlap.** Mitigated by the z-order squash: every discovery pin
  sits below every collection pin, and `MapMarkers`' existing key de-duplication keeps the
  collection's identity when a building appears in both.

**Rejected alternatives.**

- *Unify on the server* — route the collection's own pins through `get_map_clusters_v3` too (it
  already accepts a `collections` filter). Rejected: the collection map would lose optimistic
  re-render on add/remove, itinerary numbering, and categorisation colours, all of which live in
  client state, and every pan would re-fetch pins the page already has.
- *Unify on the client* — fetch discovery buildings as raw points and feed them through
  Supercluster with the collection. Rejected: unbounded point counts at low zoom, and no existing
  bbox RPC returns un-clustered points at catalogue scale.
- *Reuse the existing `is_candidate` flag* instead of adding `is_discovery`. Rejected:
  `is_candidate` routes `BuildingDetailDrawer` to the compact legacy card, but a discovered
  building is an ordinary catalogue building and must open the full panel — that panel is where
  the "Add to this collection" action lives.
