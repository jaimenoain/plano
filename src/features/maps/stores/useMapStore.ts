import { createStore } from 'zustand/vanilla';
import type { MapFilters, MapMode } from '@/types/plano-map';
import type { Bounds } from '@/utils/map';
import type { BuildingSearchHit } from '@/features/search/api/searchBuildingsV2';

/**
 * useMapStore — the SINGLE source of truth for the /search (and PhotographyTool)
 * map surface.
 *
 * Historically the page had THREE independent URL writers (MapContext, PlanoMap,
 * useBuildingSearch) plus SearchPage query effects, all racing React Router's
 * `setSearchParams(prev => …)` (whose `prev` is bound to the last *committed*
 * location). That produced the clobbering `q` revert and the map↔URL feedback
 * loop. The fix is this store: interactive state lives here, the URL is a pure
 * coalesced OUTPUT derived from it (see useMapUrlSync), and the map writes here
 * only on real user gestures.
 *
 * The store is created per-provider via `createMapStore()` (NOT a module
 * singleton) because the Embassy PhotographyTool mounts its own <MapProvider>
 * and needs an independent map instance.
 */

/** The serializable slice mirrored to the URL. */
export interface SerializableMapState {
  lat: number;
  lng: number;
  zoom: number;
  mode: MapMode;
  filters: MapFilters;
}

export interface MapStoreState extends SerializableMapState {
  /** Real viewport bbox — updated on map load / gesture end / resize. */
  bounds: Bounds | null;
  /** Ergonomic search-query handle, kept in lockstep with `filters.query`. */
  query: string;
  /** Deliberate click selection — drives the detail drawer. */
  selectedId: string | null;
  /** Transient hover emphasis. */
  highlightedId: string | null;
  /** Find-mode result pins pushed by SearchPage (null == browse mode). */
  findModeBuildings: BuildingSearchHit[] | null;
  /**
   * Fit-bounds COMMAND channel. The map consumes a request (fits + clamps zoom),
   * then the request is cleared. The `nonce` makes a repeat-fit to the same
   * bounds still fire. Never serialized to the URL.
   */
  fitBoundsRequest: { bounds: Bounds; nonce: number } | null;

  // ── actions ──────────────────────────────────────────────────────────────
  setViewport: (v: { lat: number; lng: number; zoom: number }) => void;
  setBounds: (b: Bounds) => void;
  setQuery: (q: string) => void;
  setFilter: <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => void;
  setFilters: (patch: Partial<MapFilters>) => void;
  setMode: (mode: MapMode) => void;
  setSelectedId: (id: string | null) => void;
  setHighlightedId: (id: string | null) => void;
  setFindModeBuildings: (list: BuildingSearchHit[] | null) => void;
  requestFitBounds: (bounds: Bounds) => void;
  clearFitBoundsRequest: () => void;
  /** Replace serializable state from a URL parse (mount / popstate). Never triggers a URL write. */
  hydrateFromURL: (parsed: SerializableMapState) => void;
}

/**
 * Rough viewport bbox from center + zoom, so the cluster / SERP queries can fire
 * before the map's `onLoad` sets real bounds. Ported verbatim from MapContext.
 */
export function approximateBoundsFromCenter(lat: number, lng: number, zoom: number): Bounds {
  const degsPerTile = 360 / Math.pow(2, zoom);
  const lngHalf = (degsPerTile * 1280) / 256 / 2;
  const latHalf = Math.min((degsPerTile * 800) / 256 / 2, 85);
  return {
    north: Math.min(85, lat + latHalf),
    south: Math.max(-85, lat - latHalf),
    east: Math.min(180, lng + lngHalf),
    west: Math.max(-180, lng - lngHalf),
  };
}

export type MapStore = ReturnType<typeof createMapStore>;

export function createMapStore(initial: SerializableMapState) {
  return createStore<MapStoreState>((set) => ({
    lat: initial.lat,
    lng: initial.lng,
    zoom: initial.zoom,
    mode: initial.mode,
    filters: initial.filters,
    bounds: approximateBoundsFromCenter(initial.lat, initial.lng, initial.zoom),
    query: initial.filters.query ?? '',
    selectedId: null,
    highlightedId: null,
    findModeBuildings: null,
    fitBoundsRequest: null,

    // Value-equality guards: zustand's useSyncExternalStore re-renders
    // synchronously, so a caller that re-pushes an equal value every render (e.g.
    // a fresh `[]` from a loading query, or unchanged viewport/bounds) would spin
    // an update loop and starve microtasks. Returning the current state (`s`) is
    // a true no-op in zustand (Object.is short-circuits — no notify).
    setViewport: ({ lat, lng, zoom }) =>
      set((s) => (s.lat === lat && s.lng === lng && s.zoom === zoom ? s : { lat, lng, zoom })),
    setBounds: (bounds) =>
      set((s) => {
        const c = s.bounds;
        if (c && c.north === bounds.north && c.south === bounds.south && c.east === bounds.east && c.west === bounds.west) {
          return s;
        }
        return { bounds };
      }),

    setQuery: (q) =>
      set((s) => ({ query: q, filters: { ...s.filters, query: q || undefined } })),

    setFilter: (key, value) =>
      set((s) => {
        const filters = { ...s.filters, [key]: value };
        return key === 'query'
          ? { filters, query: (value as string | undefined) || '' }
          : { filters };
      }),

    setFilters: (patch) =>
      set((s) => {
        const filters = { ...s.filters, ...patch };
        return 'query' in patch ? { filters, query: patch.query || '' } : { filters };
      }),

    setMode: (mode) => set((s) => (s.mode === mode ? s : { mode })),
    setSelectedId: (id) => set((s) => (s.selectedId === id ? s : { selectedId: id })),
    setHighlightedId: (id) => set((s) => (s.highlightedId === id ? s : { highlightedId: id })),
    setFindModeBuildings: (list) =>
      set((s) => {
        const cur = s.findModeBuildings;
        if (cur === list) return s;
        // Treat null and [] as the same "browse mode" — skip a re-pushed empty
        // array (a loading query yields a fresh [] every render).
        if ((cur === null || cur.length === 0) && (list === null || list.length === 0)) return s;
        return { findModeBuildings: list };
      }),

    requestFitBounds: (bounds) =>
      set((s) => ({ fitBoundsRequest: { bounds, nonce: (s.fitBoundsRequest?.nonce ?? 0) + 1 } })),
    clearFitBoundsRequest: () => set({ fitBoundsRequest: null }),

    hydrateFromURL: (parsed) =>
      set({
        lat: parsed.lat,
        lng: parsed.lng,
        zoom: parsed.zoom,
        mode: parsed.mode,
        filters: parsed.filters,
        query: parsed.filters.query ?? '',
      }),
  }));
}
