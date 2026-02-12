import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from "react-dom";
import Map, { NavigationControl, ViewStateChangeEvent, GeolocateControl, MapRef } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, Maximize2, Minimize2 } from "lucide-react";
import { useURLMapState, DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM } from '@/features/maps/hooks/useURLMapState';
import { useStableMapUpdate } from '@/features/maps/hooks/useStableMapUpdate';
import { MapErrorBoundary } from './MapErrorBoundary';
import { useMapContext } from '../providers/MapContext';
import { useMapData } from '../hooks/useMapData';
import { MapMarkers } from './MapMarkers';

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const LOCAL_STORAGE_MAP_KEY = 'plano_map_view_state';

const SATELLITE_STYLE = {
  version: 8,
  sources: {
    "satellite-tiles": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      ],
      tileSize: 256,
      attribution: "&copy; Esri"
    }
  },
  layers: [
    {
      id: "satellite-layer",
      type: "raster",
      source: "satellite-tiles",
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

function PlanoMapContent() {
  const { lat, lng, zoom, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);

  const [isSatellite, setIsSatellite] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Context for sharing state with Sidebar
  const { methods: { setBounds, setHighlightedId }, state: { highlightedId, filters, bounds, mode } } = useMapContext();

  // Reference to Map instance
  const mapRef = useRef<MapRef>(null);

  // Reference to GeolocateControl to trigger it programmatically
  // We use `any` to avoid complex type matching between react-map-gl wrapper and maplibre-gl instance,
  // but in practice it exposes the underlying control or a compatible interface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geolocateControlRef = useRef<any>(null);

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

    // Save view state to localStorage
    try {
        localStorage.setItem(LOCAL_STORAGE_MAP_KEY, JSON.stringify({
            latitude: evt.viewState.latitude,
            longitude: evt.viewState.longitude,
            zoom: evt.viewState.zoom
        }));
    } catch (e) {
        console.warn('Failed to save map state to localStorage', e);
    }

    // Update bounds for sidebar and markers
    updateBounds(evt.target);
  }, [updateMapState, updateBounds]);

  const onLoad = useCallback((evt: { target: maplibregl.Map }) => {
      updateBounds(evt.target);

      // Auto-geolocate if at default view (meaning user didn't specify a location)
      if (lat === DEFAULT_LAT && lng === DEFAULT_LNG && zoom === DEFAULT_ZOOM) {
          // Try to restore from localStorage first
          let savedState = null;
          try {
              savedState = localStorage.getItem(LOCAL_STORAGE_MAP_KEY);
          } catch (e) {
              console.warn('LocalStorage access failed', e);
          }

          if (savedState) {
              try {
                  const { latitude, longitude, zoom: savedZoom } = JSON.parse(savedState);
                  if (typeof latitude === 'number' && typeof longitude === 'number' && typeof savedZoom === 'number') {
                      // Use mapRef.current for jumpTo if available, or fallback to evt.target
                      const map = mapRef.current?.getMap() || evt.target;
                      map.jumpTo({
                          center: [longitude, latitude],
                          zoom: savedZoom
                      });
                      // Update URL to match restored state
                      updateMapState({
                          lat: latitude,
                          lng: longitude,
                          zoom: savedZoom
                      }, true);
                      return; // Skip geolocation if restored
                  }
              } catch (e) {
                  console.warn('Failed to restore map state from localStorage', e);
              }
          }

          // Trigger the geolocation control to find the user
          // This will ask for permission if not granted
          geolocateControlRef.current?.trigger();
      }
  }, [updateBounds, lat, lng, zoom, updateMapState]);

  // Fetch data based on bounds
  const { clusters, isLoading } = useMapData({
      bounds: bounds || { north: 0, south: 0, east: 0, west: 0 }, // fallback
      zoom: viewState.zoom,
      filters: filters,
      mode: mode
  });

  const mapContent = (
    <div className={`relative h-full w-full overflow-hidden bg-background ${isExpanded ? "fixed inset-0 z-[9999]" : "z-0"}`}>
        <Map
            ref={mapRef}
            {...viewState}
            onMove={onMove}
            onMoveEnd={onMoveEnd}
            onLoad={onLoad}
            mapLib={maplibregl}
            mapStyle={isSatellite ? SATELLITE_STYLE : MAP_STYLE}
            attributionControl={false}
            onClick={() => setHighlightedId(null)} // Clear highlight on map click
        >
            <GeolocateControl
                ref={geolocateControlRef}
                position="bottom-right"
                positionOptions={{ enableHighAccuracy: true }}
                trackUserLocation={true}
                showUserLocation={true}
            />
            <NavigationControl position="bottom-right" />
            {bounds && <MapMarkers clusters={clusters || []} highlightedId={highlightedId} setHighlightedId={setHighlightedId} />}
        </Map>

        {/* Top Left: Satellite Toggle */}
        <div className="absolute top-2 left-2 flex flex-col gap-2 z-10">
          <button
            onClick={(e) => {
                e.stopPropagation();
                setIsSatellite(!isSatellite);
            }}
            className="p-2 bg-background/90 backdrop-blur rounded-md border shadow-sm hover:bg-muted transition-colors flex items-center gap-2"
            title={isSatellite ? "Show Map" : "Show Satellite"}
          >
            <Layers className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">{isSatellite ? "Map" : "Satellite"}</span>
          </button>
        </div>

        {/* Top Right: Fullscreen Toggle */}
        <button
            onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
            }}
            className="absolute top-2 right-2 p-2 bg-background/90 backdrop-blur rounded-md border shadow-sm hover:bg-muted transition-colors z-10"
            title={isExpanded ? "Collapse Map" : "Expand Map"}
        >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
    </div>
  );

  if (isExpanded) {
    return createPortal(mapContent, document.body);
  }

  return mapContent;
}

export function PlanoMap() {
    return (
        <MapErrorBoundary>
            <PlanoMapContent />
        </MapErrorBoundary>
    );
}
