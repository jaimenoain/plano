# 0025 — My Map is both a mode on /search and its own route

**Status:** accepted (2026-07-31)

**Context.** The member's library has moved twice. It began as a segment of the search page's mode
toggle; PR #1666 promoted it to `/map`, dropped the segment, and made `/search?mode=library`
302-redirect to the new address. The stated reason for dropping the segment was that "a segment that
navigates away could never render selected" — true, but only because `/map` then hid the toggle
altogether.

The cost showed up in use. The mode toggle is the page's primary framing control (All, Discover),
and the member's own buildings are the third obvious answer to "which buildings am I looking at?" —
but reaching them meant leaving the page, and coming back meant leaving again. Meanwhile `/map`
showed no mode control at all, so from the member's own map there was no way to widen out.

**Decision.** `library` is a first-class mode again *and* keeps its route.

- `MapModeToggle` has three segments: **All / Discover / My map**. On `/search` all three switch in
  place — `?mode=library` is served, no longer redirected — so the tab is instant and the filter
  drawer's "My Map Settings" block follows the mode it already keys off.
- `/map` keeps `forcedMode="library"`: the mode is implied by the path and never serialized, which
  is what keeps its very first cluster fetch filtered to the member's pins (PR #1680). It now
  **shows** the toggle, with My map selected. Its other two segments navigate to `/search?mode=…`
  (`modeSwitchUrl`) rather than switching in place, because the route can't represent them.
- The stats masthead (`MyMapChrome`) belongs to the **mode**, not the route: `SearchPageContent`
  renders it wherever library mode is active, so the tab and the route cannot drift apart.
- Signed out, the My map segment is not offered and a `?mode=library` deep link falls back to All.
  `/map` still bounces to `/login?redirect=/map`.

**Consequences we accept.**

- **Two addresses for one view.** `/search?mode=library` and `/map` render the same thing. `/map`
  stays the advertised, canonical one (bottom nav, links, the login bounce); the tab is the same
  view reached from the query controls. The alternative — keeping the redirect — would have made
  the tab a navigation, i.e. a full map remount on every click, which is not what a tab is.
- **One asymmetric direction.** Leaving My map is a route change on `/map` and a state change on
  `/search`. Leaving your own map for the whole catalogue is a genuine destination change, so the
  navigation is honest there; the viewport and the global filters travel in the URL.
- **Leaving library clears its personal filters.** Your Rating, folders and collections have no
  control outside the My Map block, so `switchMode` resets them (`companionFiltersForMode`'s
  `keepsPersonalFilters`) — carried into Discover they would silently narrow the results with
  nothing on screen to explain it. `modeSwitchUrl` strips the same params, plus `status` and
  `rated_by`, when leaving `/map`.
- **"Curators & friends" stays hidden in library mode** (`showContactPicker={mode !== 'library'}`),
  so the `/search` tab matches `/map` exactly.
