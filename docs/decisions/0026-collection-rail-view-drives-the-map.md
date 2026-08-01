# 0026 — The collection rail's view drives the map, and retires "hide collection pins"

**Status:** accepted (2026-08-01)

**Context.** [ADR 0025](0025-my-map-as-mode-and-route.md) settled `/search`'s vocabulary: `All`,
`Discover`, `My map` — *library is your own pins, discover is the world minus what you already have,
All is everything* — one control driving the map and the list together.

The collection detail page was asking the same question in different words and answering it in three
places. The rail's first tab said **All Items** but held only the collection's roster. The Discover
tab ([ADR 0024](0024-collection-discover-rail-list.md)) listed what was *not* in it. Whether the map
agreed with either was decided elsewhere: a **Hide buildings already in this collection** switch
nested inside Collection Settings → Map View, which is exactly "show me the Discover view" written
as a preference, in the pane the reader is not looking at, with no effect on the list at all. And
there was no way to see both sets at once as a list.

**Decision.** The rail gets one **Collection / Discover / All** segmented control, borrowing
`/search`'s primitive (`SegmentedControl`) and its meaning exactly, and it drives **both panes**:

| View | Rail | Map |
| --- | --- | --- |
| Collection (default) | the roster | collection pins only |
| Discover | what is in view and not in the collection | non-collection pins only |
| All | roster, then the rest | both |

Three consequences follow, and each is the point rather than a cost:

1. **"Hide buildings already in this collection" is deleted**, switch and stored preference both
   (`plano:collection-map:hideCollectionPins`). `hideCollectionPins` survives only as a derived prop
   on `CollectionMapGL`, computed as `view === 'discover'`. Two controls for one idea, one of them
   invisible from the pane it changed, was the defect.
2. **Show Saved Places and Show All Buildings become *source* switches.** They decide which layers
   exist; the view decides which of them you are looking at. So the toggle renders only when one of
   them is on — with neither, a collection map shows a collection, and offering that three ways
   would be noise.
3. **Discover's content is the union of the enabled sources**: the viewer's saved places in view
   (already computed for the map's candidate pins) above the catalogue list from ADR 0024. Any other
   rule would let the toggle offer a view it could not fill.

**Itinerary leaves the tab strip.** It is a lens on the roster, not a fourth set of buildings, so it
rides under the segments as a pressed-state chip, shown only when a route exists *and* a roster is
on screen. Its in-tab "Generate Itinerary" empty state goes with it; Settings → Plan Route has
carried that entry point all along.

**The view is session state** — a `useState` in `useCollectionRailView`, not persisted and not in
the URL. The sources it chooses between are per-viewer preferences; which one is on screen right now
is a lens on a page you arrived at from a link, and a shared link that reopened someone else's
Discover would be a surprise. As in ADR 0024's tab logic, the rendered view is *derived* from the
stored one (`resolveRailView`) rather than corrected in an effect, so a source vanishing under a
viewer standing on Discover costs no stale frame and no StrictMode-doubled `setState`.

**Search stays on the Collection view only.** Narrowing one band of a multi-band list while the
others ignored the query would put the rail and the map back into the disagreement this ADR exists
to end; the query is kept but not applied elsewhere, exactly as it already was on Itinerary and
Discover.

**Rejected alternatives.**

- *Let the toggle change only the list.* Rejected: it would leave the map governed by a separate
  hidden switch — the original defect, with a new control in front of it.
- *Keep Itinerary as a fourth segment.* Rejected: it conflates "which buildings" with "how they are
  arranged", and four segments in a 22.5rem rail is a squeeze on top of that.
- *Persist the view in `localStorage` beside the source switches.* Rejected: see above; a lens is
  not a preference, and a stale Discover on reopen reads as data loss.
- *Interleave the collection and discovery rows in All.* Rejected: the roster is complete and in
  memory, the discovery list is paged over a viewport. There is no ordering that is honest about
  both, so All stacks two labelled bands instead.
