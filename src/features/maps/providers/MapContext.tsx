import React, { createContext, useContext, useMemo, ReactNode, useCallback } from 'react';
import { useURLMapState } from '../hooks/useURLMapState';
import { useStableMapUpdate } from '../hooks/useStableMapUpdate';
import { MapMode, MapFilters, MapState } from '@/types/plano-map';

interface MapContextMethods {
  moveMap: (lat: number, lng: number, zoom: number) => void;
  setMode: (mode: MapMode) => void;
  setFilter: <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => void;
  setMapState: (state: Partial<MapState>) => void;
}

interface MapContextValue {
  state: {
    lat: number;
    lng: number;
    zoom: number;
    mode: MapMode;
    filters: MapFilters;
  };
  methods: MapContextMethods;
}

const MapContext = createContext<MapContextValue | null>(null);

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const { lat, lng, zoom, mode, filters, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);

  const moveMap = useCallback(
    (lat: number, lng: number, zoom: number) => {
      // Debounced update via useStableMapUpdate
      updateMapState({ lat, lng, zoom });
    },
    [updateMapState]
  );

  const setMode = useCallback(
    (mode: MapMode) => {
      setMapURL({ mode });
    },
    [setMapURL]
  );

  const setFilter = useCallback(
    <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => {
      // Cast the inferred Zod type to MapFilters to ensure type safety in merge
      const currentFilters = filters as unknown as MapFilters;
      const newFilters = { ...currentFilters, [key]: value };
      setMapURL({ filters: newFilters });
    },
    [filters, setMapURL]
  );

  const setMapState = useCallback(
    (state: Partial<MapState>) => {
      setMapURL(state as any);
    },
    [setMapURL]
  );

  const value = useMemo(
    () => ({
      state: {
        lat,
        lng,
        zoom,
        mode,
        filters: filters as unknown as MapFilters,
      },
      methods: {
        moveMap,
        setMode,
        setFilter,
        setMapState,
      },
    }),
    [lat, lng, zoom, mode, filters, moveMap, setMode, setFilter, setMapState]
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
