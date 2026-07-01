import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { parseMapStateFromParams, syncFilterParams } from './useURLMapState';
import type { MapStore, MapStoreState } from '../stores/useMapStore';

/**
 * useMapUrlSync — the ONE place the map store talks to the URL.
 *
 * INPUT  (URL → store): on mount and whenever the URL changes from a source that
 *   is NOT our own write (back/forward, deep links, and — transitionally, until
 *   PlanoMap stops writing the URL itself in Stage B — the map's viewport
 *   writes), re-hydrate the store from the parsed URL.
 *
 * OUTPUT (store → URL): a single coalesced writer. It builds the next params
 *   from `window.location.search` (the live committed URL, never React Router's
 *   possibly-stale `prev`), applies the store's serializable slice via the shared
 *   `syncFilterParams`, and commits with ONE `setSearchParams(next,{replace})`.
 *   Because there is exactly one writer and it reads the live URL, the
 *   snapshot-clobber race is structurally impossible, and unknown params
 *   (`open_filters`, `view`) are preserved. A no-op guard skips writes that equal
 *   the current URL, so it can coexist with the transitional PlanoMap writer.
 *
 *   The write is SYNCHRONOUS (no debounce): every store write is already
 *   discrete (a filter change, a gesture-end viewport, a debounced query) — there
 *   are no per-frame writers in the new model — and reading the live URL each
 *   time means multiple same-tick writes still compose correctly (each sees the
 *   prior write via history.replaceState). Synchronous keeps URL updates in step
 *   with the store the way consumers/tests expect.
 */
function serializeStoreToParams(
  state: Pick<MapStoreState, 'lat' | 'lng' | 'zoom' | 'mode' | 'filters'>,
  base: URLSearchParams
): URLSearchParams {
  const p = new URLSearchParams(base);
  p.set('lat', String(state.lat));
  p.set('lng', String(state.lng));
  p.set('zoom', String(state.zoom));
  if (state.mode) p.set('mode', state.mode);
  else p.delete('mode');
  syncFilterParams(p, state.filters);
  return p;
}

export function useMapUrlSync(store: MapStore) {
  const [searchParams, setSearchParams] = useSearchParams();
  const lastFlushedRef = useRef<string | null>(null);

  // INPUT — adopt external URL changes (mount, popstate, transitional writers).
  useEffect(() => {
    const committed = searchParams.toString();
    if (committed === lastFlushedRef.current) return; // our own echo → ignore
    lastFlushedRef.current = committed;
    store.getState().hydrateFromURL(parseMapStateFromParams(searchParams));
  }, [searchParams, store]);

  // OUTPUT — synchronous, output-only writer.
  useEffect(() => {
    const unsub = store.subscribe((state, prev) => {
      // Only the serializable slice matters. filters is a fresh object on change.
      if (
        state.lat === prev.lat &&
        state.lng === prev.lng &&
        state.zoom === prev.zoom &&
        state.mode === prev.mode &&
        state.filters === prev.filters
      ) {
        return;
      }
      const live = typeof window !== 'undefined' ? window.location.search : '';
      const liveStr = new URLSearchParams(live).toString();
      const next = serializeStoreToParams(state, new URLSearchParams(live));
      const nextStr = next.toString();
      if (nextStr === liveStr) return; // nothing to write (already reflected)
      lastFlushedRef.current = nextStr;
      setSearchParams(next, { replace: true });
    });
    return unsub;
  }, [store, setSearchParams]);
}
