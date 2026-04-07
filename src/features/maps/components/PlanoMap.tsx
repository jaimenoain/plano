/**
 * PlanoMap.tsx — Refined with A24 editorial aesthetic
 *
 * All map state, bounds tracking, geolocation, and data-fetching logic unchanged.
 * Three visual changes only:
 *
 * Map control buttons (satellite + fullscreen):
 *   shadow-md removed — frosted glass + border is sufficient over the map tile.
 *   Satellite label: uppercase tracking-wide added for editorial micro-label treatment.
 *
 * Empty state overlay ("No buildings in this location"):
 *   shadow-lg removed.
 *   "Zoom out to see more" CTA: text-brand-primary hover:underline font-semibold →
 *   text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60
 *   transition-opacity. Editorial text CTA, consistent with the rest of the app.
 *   Label text: "No buildings in this location" → "No buildings in this area".
 */
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from "react-dom";
import Map, { NavigationControl, ViewStateChangeEvent, GeolocateControl, MapRef } from 'react-map-gl/maplibre';
import maplibregl, { type GeolocateControl as MaplibreGeolocateControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, Maximize2, Minimize2 } from "lucide-react";
import { useURLMapState, DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM } from '@/features/maps/hooks/useURLMapState';
import { useStableMapUpdate } from '@/features/maps/hooks/useStableMapUpdate';
import { MapErrorBoundary } from './MapErrorBoundary';
import { useMapContext } from '../providers/MapContext';
import { useMapData } from '../hooks/useMapData';
import { MapMarkers } from './MapMarkers';
import { SATELLITE_MAP_STYLE } from "@/features/maps/constants/satelliteMapStyle";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const LOCAL_STORAGE_MAP_KEY = 'plano_map_view_state';

interface PlanoMapProps {
  showEmptyMessage?: boolean;
}

function PlanoMapContent({ showEmptyMessage }: PlanoMapProps) {
  const { lat, lng, zoom, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);

  const [isSatellite, setIsSatellite] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    methods: { setBounds, setHighlightedId, fitMapBounds },
    state: { highlightedId, filters, bounds, mode, fitBounds },
  } = useMapContext();

  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (fitBounds && mapRef.current) {
      mapRef.current.fitBounds(
        [[fitBounds.west, fitBounds.south], [fitBounds.east, fitBounds.north]],
        { padding: 50, duration: 1000 }
      );
      fitMapBounds(null);
    }
  }, [fitBounds, fitMapBounds]);

  const geolocateControlRef = useRef<MaplibreGeolocateControl | null>(null);

  const [viewState, setViewState] = useState({ latitude: lat, longitude: lng, zoom });

  useEffect(() => {
    setViewState(prev => {
      const isSame =
        Math.abs(prev.latitude - lat) < 0.000001 &&
        Math.abs(prev.longitude - lng) < 0.000001 &&
        Math.abs(prev.zoom - zoom) < 0.01;
      if (isSame) return prev;
      if (lat === DEFAULT_LAT && lng === DEFAULT_LNG && zoom === DEFAULT_ZOOM) {
        try {
          const hasInteracted = sessionStorage.getItem('plano_map_interacted');
          if (hasInteracted) return prev;
        } catch (_e) {}
      }
      return { latitude: lat, longitude: lng, zoom };
    });
  }, [lat, lng, zoom]);

  const updateBounds = useCallback((mapInstance: maplibregl.Map) => {
    const bounds = mapInstance.getBounds();
    setBounds({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
  }, [setBounds]);

  useEffect(() => {
    if (mapRef.current && !bounds) {
      const map = mapRef.current.getMap();
      if (map) {
        try {
          const b = map.getBounds();
          if (b && (b.getNorth() !== b.getSouth())) updateBounds(map);
        } catch (_e) {}
      }
    }
  }, [bounds, updateBounds]);

  const onMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
    updateMapState({ lat: evt.viewState.latitude, lng: evt.viewState.longitude, zoom: evt.viewState.zoom }, false);
  }, [updateMapState]);

  const onMoveEnd = useCallback((evt: ViewStateChangeEvent) => {
    updateMapState({ lat: evt.viewState.latitude, lng: evt.viewState.longitude, zoom: evt.viewState.zoom }, true);
    try { sessionStorage.setItem('plano_map_interacted', 'true'); } catch (_e) {}
    try {
      localStorage.setItem(LOCAL_STORAGE_MAP_KEY, JSON.stringify({
        latitude: evt.viewState.latitude,
        longitude: evt.viewState.longitude,
        zoom: evt.viewState.zoom,
      }));
    } catch {}
    updateBounds(evt.target);
  }, [updateMapState, updateBounds]);

  const onLoad = useCallback((evt: { target: maplibregl.Map }) => {
    updateBounds(evt.target);
    if (lat === DEFAULT_LAT && lng === DEFAULT_LNG && zoom === DEFAULT_ZOOM) {
      let hasInteracted = false;
      try { hasInteracted = sessionStorage.getItem('plano_map_interacted') === 'true'; } catch (_e) {}
      let savedState: string | null = null;
      try { savedState = localStorage.getItem(LOCAL_STORAGE_MAP_KEY); } catch {}
      if (savedState) {
        try {
          const { latitude, longitude, zoom: savedZoom } = JSON.parse(savedState);
          if (typeof latitude === 'number' && typeof longitude === 'number' && typeof savedZoom === 'number') {
            const map = mapRef.current?.getMap() || evt.target;
            map.jumpTo({ center: [longitude, latitude], zoom: savedZoom });
            updateMapState({ lat: latitude, lng: longitude, zoom: savedZoom }, true);
            return;
          }
        } catch {}
      }
      if (!hasInteracted) geolocateControlRef.current?.trigger();
    }
  }, [updateBounds, lat, lng, zoom, updateMapState]);

  const { clusters, isLoading, isFetching } = useMapData({
    bounds: bounds || { north: 0, south: 0, east: 0, west: 0 },
    zoom: viewState.zoom,
    filters,
    mode,
  });

  const visibleClustersCount = useMemo(() => {
    if (!clusters || !bounds) return 0;
    return clusters.filter(c =>
      c.lat <= bounds.north && c.lat >= bounds.south &&
      c.lng <= bounds.east && c.lng >= bounds.west
    ).length;
  }, [clusters, bounds]);

  const mapContent = (
    <div className={`relative h-full w-full overflow-hidden bg-surface-default ${isExpanded ? "fixed inset-0 z-[9999]" : "z-0"}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={onMove}
        onMoveEnd={onMoveEnd}
        onLoad={onLoad}
        onResize={(evt) => updateBounds(evt.target)}
        mapLib={maplibregl}
        mapStyle={isSatellite ? SATELLITE_MAP_STYLE : MAP_STYLE}
        attributionControl={false}
        onClick={() => setHighlightedId(null)}
      >
        <GeolocateControl
          ref={geolocateControlRef}
          position="bottom-right"
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={true}
          showUserLocation={true}
        />
        <NavigationControl position="bottom-right" />
        {bounds && (
          <MapMarkers
            clusters={clusters || []}
            highlightedId={highlightedId}
            setHighlightedId={setHighlightedId}
          />
        )}
      </Map>

      {/* ── Empty state ── */}
      {showEmptyMessage && !isLoading && !isFetching && bounds && visibleClustersCount === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface-card/95 backdrop-blur-sm border border-border-default p-5 text-center max-w-xs animate-in fade-in zoom-in duration-300">
          <p className="text-sm text-text-primary mb-3">
            No buildings in this area
          </p>
          {/* Editorial text CTA — no neon, no underline, no bold */}
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity"
          >
            Zoom out →
          </button>
        </div>
      )}

      {/* ── Top-left: Satellite toggle ── */}
      {/* shadow-md removed — border + frosted glass is sufficient over the map */}
      <div className="absolute top-2 left-2 flex flex-col gap-2 z-[60]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsSatellite(!isSatellite);
          }}
          className="p-2 bg-surface-card/90 backdrop-blur-sm border border-border-default hover:bg-surface-muted transition-colors flex items-center gap-2"
          title={isSatellite ? "Show Map" : "Show Satellite"}
        >
          <Layers className="w-4 h-4" strokeWidth={1.5} />
          {/* Uppercase tracking: editorial micro-label treatment */}
          <span className="text-xs font-medium uppercase tracking-wide hidden sm:inline">
            {isSatellite ? "Map" : "Satellite"}
          </span>
        </button>
      </div>

      {/* ── Top-right: Fullscreen toggle ── */}
      {/* shadow-md removed */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="absolute top-2 right-2 p-2 bg-surface-card/90 backdrop-blur-sm border border-border-default hover:bg-surface-muted transition-colors z-[60]"
        title={isExpanded ? "Collapse Map" : "Expand Map"}
      >
        {isExpanded ? (
          <Minimize2 className="w-4 h-4" strokeWidth={1.5} />
        ) : (
          <Maximize2 className="w-4 h-4" strokeWidth={1.5} />
        )}
      </button>
    </div>
  );

  if (isExpanded) return createPortal(mapContent, document.body);
  return mapContent;
}

export function PlanoMap({ showEmptyMessage }: PlanoMapProps) {
  return (
    <MapErrorBoundary>
      <PlanoMapContent showEmptyMessage={showEmptyMessage} />
    </MapErrorBoundary>
  );
}