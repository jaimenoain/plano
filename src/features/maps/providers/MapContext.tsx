import { createContext, useContext, useMemo, ReactNode, useCallback, useState, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { useSearchParams } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { parseMapStateFromParams } from '../hooks/useURLMapState';
import { useMapUrlSync } from '../hooks/useMapUrlSync';
import { createMapStore, type MapStore } from '../stores/useMapStore';
import { MapMode, MapFilters, MapState } from '@/types/plano-map';
import { Bounds } from '@/utils/map';
import type { BuildingSearchHit } from '@/features/search/api/searchBuildingsV2';

interface Contact {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface MapContextMethods {
  moveMap: (lat: number, lng: number, zoom: number) => void;
  fitMapBounds: (bounds: Bounds | null) => void;
  setMode: (mode: MapMode) => void;
  setFilter: <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => void;
  setMapState: (state: Partial<MapState>) => void;
  setBounds: (bounds: Bounds) => void;
  setHighlightedId: (id: string | null) => void;
  /** Deliberate click selection — drives the detail drawer. Separate from hover (highlightedId). */
  setSelectedId: (id: string | null) => void;
  setFindModeBuildings: (buildings: BuildingSearchHit[] | null) => void;
}

interface MapContextValue {
  state: {
    lat: number;
    lng: number;
    zoom: number;
    mode: MapMode;
    filters: MapFilters;
    bounds: Bounds | null;
    fitBounds: Bounds | null;
    highlightedId: string | null;
    selectedId: string | null;
    findModeBuildings: BuildingSearchHit[] | null;
  };
  methods: MapContextMethods;
}

const MapContext = createContext<MapContextValue | null>(null);

/**
 * MapProvider — now a thin adapter over a per-provider zustand store
 * (`createMapStore`). The store is the single source of truth; `useMapUrlSync`
 * is the one place it talks to the URL. This provider preserves the EXACT
 * `{state, methods}` surface the rest of the app depends on (BuildingSidebar,
 * MapMarkers, BuildingPopupContent, PhotographyTool, etc.), so nothing else
 * changes. The `hydratedContacts` cache (ratedBy → profile) is preserved.
 */
export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams] = useSearchParams();

  // One store instance per provider (search vs PhotographyTool must not share a
  // viewport). Seeded once from the URL.
  const storeRef = useRef<MapStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createMapStore(parseMapStateFromParams(searchParams));
  }
  const store = storeRef.current;

  // The one URL sync unit (mounted once).
  useMapUrlSync(store);

  // Reactive view of the store.
  const s = useStore(store);
  const { lat, lng, zoom, mode, filters, bounds, highlightedId, selectedId, findModeBuildings, fitBoundsRequest } = s;

  const [hydratedContacts, setHydratedContacts] = useState<Record<string, Contact>>({});

  // Fetch missing contacts if we have ratedBy param but no contacts (or partial)
  useEffect(() => {
    const ratedBy = filters.ratedBy;
    if (!ratedBy || ratedBy.length === 0) return;

    const missingNames = ratedBy.filter(name => !hydratedContacts[name]);

    if (missingNames.length > 0) {
      const fetchProfiles = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('username', missingNames);

          if (error) {
            return;
          }

          if (data && data.length > 0) {
            setHydratedContacts(prev => {
              const next = { ...prev };
              data.forEach(p => {
                if (p.username) {
                  next[p.username] = {
                    id: p.id,
                    name: p.username,
                    avatar_url: p.avatar_url
                  };
                }
              });
              return next;
            });
          }
        } catch {
        }
      };

      fetchProfiles();
    }
  }, [filters.ratedBy, hydratedContacts]);

  // Helper to prime cache when setting contacts
  const primeContactCache = useCallback((contacts: Contact[]) => {
    if (!contacts || contacts.length === 0) return;
    setHydratedContacts(prev => {
      const next = { ...prev };
      let changed = false;
      contacts.forEach(c => {
        if (c.name && !next[c.name]) {
          next[c.name] = c;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  const moveMap = useCallback(
    (lat: number, lng: number, zoom: number) => {
      store.getState().setViewport({ lat, lng, zoom });
    },
    [store]
  );

  const fitMapBounds = useCallback(
    (bounds: Bounds | null) => {
      if (bounds) store.getState().requestFitBounds(bounds);
      else store.getState().clearFitBoundsRequest();
    },
    [store]
  );

  const setMode = useCallback(
    (mode: MapMode) => {
      store.getState().setMode(mode);
    },
    [store]
  );

  const setFilter = useCallback(
    <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => {
      if (key === 'contacts' && Array.isArray(value)) {
        primeContactCache(value as Contact[]);
      }
      store.getState().setFilter(key, value);
    },
    [store, primeContactCache]
  );

  const setMapState = useCallback(
    (state: Partial<MapState>) => {
      const st = store.getState();
      if (state.filters) {
        const f = state.filters as MapFilters;
        if (f.contacts && Array.isArray(f.contacts)) {
          primeContactCache(f.contacts);
        }
        st.setFilters(f);
      }
      if (state.mode !== undefined) st.setMode(state.mode);
      if (state.lat !== undefined && state.lng !== undefined && state.zoom !== undefined) {
        st.setViewport({ lat: state.lat, lng: state.lng, zoom: state.zoom });
      }
    },
    [store, primeContactCache]
  );

  const setBounds = useCallback((b: Bounds) => store.getState().setBounds(b), [store]);
  const setHighlightedId = useCallback((id: string | null) => store.getState().setHighlightedId(id), [store]);
  const setSelectedId = useCallback((id: string | null) => store.getState().setSelectedId(id), [store]);
  const setFindModeBuildings = useCallback(
    (b: BuildingSearchHit[] | null) => store.getState().setFindModeBuildings(b),
    [store]
  );

  // Merge hydrated contacts into filters (preserved from the previous impl).
  const mergedFilters = useMemo(() => {
    if (filters.ratedBy && filters.ratedBy.length > 0 && (!filters.contacts || filters.contacts.length === 0)) {
      const contacts = filters.ratedBy.map(name => hydratedContacts[name]).filter(Boolean);
      if (contacts.length > 0) {
        return { ...filters, contacts };
      }
    }
    return filters;
  }, [filters, hydratedContacts]);

  const value = useMemo(
    () => ({
      state: {
        lat,
        lng,
        zoom,
        mode,
        filters: mergedFilters,
        bounds,
        fitBounds: fitBoundsRequest?.bounds ?? null,
        highlightedId,
        selectedId,
        findModeBuildings,
      },
      methods: {
        moveMap,
        fitMapBounds,
        setMode,
        setFilter,
        setMapState,
        setBounds,
        setHighlightedId,
        setSelectedId,
        setFindModeBuildings,
      },
    }),
    [lat, lng, zoom, mode, mergedFilters, bounds, fitBoundsRequest, highlightedId, selectedId, findModeBuildings, moveMap, fitMapBounds, setMode, setFilter, setMapState, setBounds, setHighlightedId, setSelectedId, setFindModeBuildings]
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
};

/** Returns the context if a MapProvider ancestor exists, otherwise null. */
export const useOptionalMapContext = () => useContext(MapContext);
