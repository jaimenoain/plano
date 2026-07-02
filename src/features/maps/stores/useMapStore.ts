import { createStore } from 'zustand/vanilla';
import type { MapFilters, MapMode } from '@/types/plano-map';
import type { Bounds } from '@/utils/map';
import type { BuildingSearchHit } from '@/features/search/api/searchBuildingsV2';
import type { ClusterResponse } from '../hooks/useMapData';

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
  /**
   * Data payload for the current selection. The detail drawer renders from the
   * map's own clusters when the selected building is among them, and falls back
   * to this payload when it isn't (e.g. a SERP row whose building is aggregated
   * into a cluster at the current zoom, so no individual pin exists to match).
   * Kept in lockstep with `selectedId`.
   */
  selectedBuilding: ClusterResponse | null;
  /** Transient hover emphasis. */
  highlightedId: string | null;
  /**
   * Coordinates of the currently highlighted building, when the highlight comes
   * from a SERP row. Lets the map react the *containing cluster* when the
   * building has no individual pin at the current zoom (browse mode, grouped).
   */
  highlightedPoint: { lat: number; lng: number } | null;
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
  /** Select a building AND carry its full data payload for the detail drawer. */
  selectBuilding: (building: ClusterResponse) => void;
  setHighlightedId: (id: string | null, point?: { lat: number; lng: number } | null) => void;
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
    selectedBuilding: null,
    highlightedId: null,
    highlightedPoint: null,
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
    setSelectedId: (id) =>
      set((s) => {
        if (s.selectedId === id) return s;
        // Keep the data payload only if it still matches the new selection. A
        // deselect (null) or a bare-id selection drops it, so the drawer either
        // closes or resolves fresh data from the map's clusters rather than
        // showing a stale building.
        const keepPayload =
          id != null && s.selectedBuilding != null && String(s.selectedBuilding.id) === id;
        return { selectedId: id, selectedBuilding: keepPayload ? s.selectedBuilding : null };
      }),
    selectBuilding: (building) =>
      set({ selectedId: String(building.id), selectedBuilding: building }),
    setHighlightedId: (id, point) =>
      set((s) => (s.highlightedId === id ? s : { highlightedId: id, highlightedPoint: point ?? null })),
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
