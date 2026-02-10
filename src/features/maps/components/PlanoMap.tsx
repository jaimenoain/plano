import { useEffect, useState, useCallback } from 'react';
import Map, { NavigationControl, ViewStateChangeEvent } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useURLMapState } from '@/features/maps/hooks/useURLMapState';
import { useStableMapUpdate } from '@/features/maps/hooks/useStableMapUpdate';
import { MapErrorBoundary } from './MapErrorBoundary';

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function PlanoMapContent() {
  const { lat, lng, zoom, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);

  // Local view state to ensure smooth dragging (60fps) while syncing with URL
  const [viewState, setViewState] = useState({
    latitude: lat,
    longitude: lng,
    zoom: zoom
  });

  // Sync local state with URL when URL changes externally (e.g. navigation)
  useEffect(() => {
    setViewState(prev => {
       const isSame =
         Math.abs(prev.latitude - lat) < 0.000001 &&
         Math.abs(prev.longitude - lng) < 0.000001 &&
         Math.abs(prev.zoom - zoom) < 0.01;

       if (isSame) return prev;
       return { latitude: lat, longitude: lng, zoom: zoom };
    });
  }, [lat, lng, zoom]);

  const onMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState); // Immediate local update
    updateMapState({
      lat: evt.viewState.latitude,
      lng: evt.viewState.longitude,
      zoom: evt.viewState.zoom
    }, false); // Debounced URL update
  }, [updateMapState]);

  const onMoveEnd = useCallback((evt: ViewStateChangeEvent) => {
    updateMapState({
      lat: evt.viewState.latitude,
      lng: evt.viewState.longitude,
      zoom: evt.viewState.zoom
    }, true); // Immediate URL update
  }, [updateMapState]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
        <Map
            {...viewState}
            onMove={onMove}
            onMoveEnd={onMoveEnd}
            mapLib={maplibregl}
            mapStyle={MAP_STYLE}
            attributionControl={false}
        >
            <NavigationControl position="bottom-right" />
        </Map>
    </div>
  );
}

export function PlanoMap() {
    return (
        <MapErrorBoundary>
            <PlanoMapContent />
        </MapErrorBoundary>
    );
}
