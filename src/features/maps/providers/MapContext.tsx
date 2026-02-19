import React, { createContext, useContext, useMemo, ReactNode, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useURLMapState } from '../hooks/useURLMapState';
import { useStableMapUpdate } from '../hooks/useStableMapUpdate';
import { MapMode, MapFilters, MapState } from '@/types/plano-map';
import { Bounds } from '@/utils/map';

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
  };
  methods: MapContextMethods;
}

const MapContext = createContext<MapContextValue | null>(null);

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const { lat, lng, zoom, mode, filters, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);

  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [fitBounds, setFitBounds] = useState<Bounds | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
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
            console.error('Error fetching profiles for hydration:', error);
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
        } catch (err) {
          console.error('Unexpected error during hydration:', err);
        }
      };

      fetchProfiles();
    }
  }, [filters.ratedBy, hydratedContacts]);

  const moveMap = useCallback(
    (lat: number, lng: number, zoom: number) => {
      // Immediate update via useStableMapUpdate to ensure responsive map jumps
      updateMapState({ lat, lng, zoom }, true);
    },
    [updateMapState]
  );

  const fitMapBounds = useCallback(
    (bounds: Bounds | null) => {
        setFitBounds(bounds);
    },
    []
  );

  const setMode = useCallback(
    (mode: MapMode) => {
      setMapURL({ mode });
    },
    [setMapURL]
  );

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

  const setFilter = useCallback(
    <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => {
      // Cast the inferred Zod type to MapFilters to ensure type safety in merge
      const currentFilters = filters as unknown as MapFilters;
      const newFilters = { ...currentFilters, [key]: value };

      if (key === 'contacts' && Array.isArray(value)) {
          primeContactCache(value as Contact[]);
      }

      setMapURL({ filters: newFilters });
    },
    [filters, setMapURL, primeContactCache]
  );

  const setMapState = useCallback(
    (state: Partial<MapState>) => {
      if (state.filters) {
          const f = state.filters as MapFilters;
          if (f.contacts && Array.isArray(f.contacts)) {
              primeContactCache(f.contacts);
          }
      }
      setMapURL(state as any);
    },
    [setMapURL, primeContactCache]
  );

  // Merge hydrated contacts into filters
  const mergedFilters = useMemo(() => {
    const baseFilters = filters as unknown as MapFilters;

    // If we have ratedBy but no contacts (or empty), try to populate from cache
    if (baseFilters.ratedBy && baseFilters.ratedBy.length > 0 && (!baseFilters.contacts || baseFilters.contacts.length === 0)) {
       const contacts = baseFilters.ratedBy.map(name => hydratedContacts[name]).filter(Boolean);
       if (contacts.length > 0) {
           return { ...baseFilters, contacts };
       }
    }

    return baseFilters;
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
        fitBounds,
        highlightedId,
      },
      methods: {
        moveMap,
        fitMapBounds,
        setMode,
        setFilter,
        setMapState,
        setBounds,
        setHighlightedId,
      },
    }),
    [lat, lng, zoom, mode, mergedFilters, bounds, fitBounds, highlightedId, moveMap, fitMapBounds, setMode, setFilter, setMapState]
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
