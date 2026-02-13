import React, { createContext, useContext, useMemo, ReactNode, useCallback, useState } from 'react';
import { useURLMapState } from '../hooks/useURLMapState';
import { useStableMapUpdate } from '../hooks/useStableMapUpdate';
import { MapMode, MapFilters, MapState } from '@/types/plano-map';
import { Bounds } from '@/utils/map';

interface MapContextMethods {
  moveMap: (lat: number, lng: number, zoom: number) => void;
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
    highlightedId: string | null;
  };
  methods: MapContextMethods;
}

const MapContext = createContext<MapContextValue | null>(null);

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const { lat, lng, zoom, mode, filters, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);

  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const moveMap = useCallback(
    (lat: number, lng: number, zoom: number) => {
      // Immediate update via useStableMapUpdate to ensure responsive map jumps
      updateMapState({ lat, lng, zoom }, true);
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
        bounds,
        highlightedId,
      },
      methods: {
        moveMap,
        setMode,
        setFilter,
        setMapState,
        setBounds,
        setHighlightedId,
      },
    }),
    [lat, lng, zoom, mode, filters, bounds, highlightedId, moveMap, setMode, setFilter, setMapState]
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
