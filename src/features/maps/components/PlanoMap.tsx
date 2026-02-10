import { useEffect, useState, useCallback } from 'react';
import Map, { NavigationControl, ViewStateChangeEvent } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useURLMapState } from '@/features/maps/hooks/useURLMapState';
import { useStableMapUpdate } from '@/features/maps/hooks/useStableMapUpdate';
import { MapErrorBoundary } from './MapErrorBoundary';
import { useMapContext } from '../providers/MapContext';
import { useMapData } from '../hooks/useMapData';
import { MapMarkers } from './MapMarkers';

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function PlanoMapContent() {
  const { lat, lng, zoom, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);

  // Context for sharing state with Sidebar
  const { methods: { setBounds, setHighlightedId }, state: { highlightedId, filters, bounds } } = useMapContext();

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

  const updateBounds = useCallback((mapInstance: maplibregl.Map) => {
      const bounds = mapInstance.getBounds();
      setBounds({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
      });
  }, [setBounds]);

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

    // Update bounds for sidebar and markers
    updateBounds(evt.target);
  }, [updateMapState, updateBounds]);

  const onLoad = useCallback((evt: { target: maplibregl.Map }) => {
      updateBounds(evt.target);
  }, [updateBounds]);

  // Fetch data based on bounds
  const { clusters, isLoading } = useMapData({
      bounds: bounds || { north: 0, south: 0, east: 0, west: 0 }, // fallback
      zoom: viewState.zoom,
      filters: filters
  });

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
        <Map
            {...viewState}
            onMove={onMove}
            onMoveEnd={onMoveEnd}
            onLoad={onLoad}
            mapLib={maplibregl}
            mapStyle={MAP_STYLE}
            attributionControl={false}
            onClick={() => setHighlightedId(null)} // Clear highlight on map click
        >
            <NavigationControl position="bottom-right" />
            {bounds && <MapMarkers clusters={clusters || []} highlightedId={highlightedId} />}
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
