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
import { Camera, Layers, Maximize2, Minimize2 } from "lucide-react";
import { useURLMapState, DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM } from '@/features/maps/hooks/useURLMapState';
import { useMapWheelZoomCapture } from '@/features/maps/hooks/useMapWheelZoomCapture';
import { useStableMapUpdate } from '@/features/maps/hooks/useStableMapUpdate';
import { useMapClusterViewport } from '@/features/maps/hooks/useMapClusterViewport';
import { MapErrorBoundary } from './MapErrorBoundary';
import { useMapContext } from '../providers/MapContext';
import { useMapData } from '../hooks/useMapData';
import { MapMarkers } from './MapMarkers';
import { SATELLITE_MAP_STYLE } from "@/features/maps/constants/satelliteMapStyle";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const LOCAL_STORAGE_MAP_KEY = 'plano_map_view_state';

interface PlanoMapProps {
  showEmptyMessage?: boolean;
  showGapCallout?: boolean;
}

function PlanoMapContent({ showEmptyMessage, showGapCallout }: PlanoMapProps) {
  const { lat, lng, zoom, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);

  const [isSatellite, setIsSatellite] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    methods: { setBounds, setHighlightedId, fitMapBounds },
    state: { highlightedId, filters, bounds, mode, fitBounds, findModeBuildings },
  } = useMapContext();

  const mapRef = useRef<MapRef>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const { viewport: clusterViewport, scheduleViewportUpdate, flushPendingViewport } =
    useMapClusterViewport();

  useMapWheelZoomCapture(mapRef, isMapLoaded);

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
  // Set to true if onMove fires before onLoad — user interacted with the map
  // (e.g. tapped the GeolocateControl) before the map finished loading.
  const hasEarlyMovedRef = useRef(false);

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
    hasEarlyMovedRef.current = true;
    setViewState(evt.viewState);
    updateMapState({ lat: evt.viewState.latitude, lng: evt.viewState.longitude, zoom: evt.viewState.zoom }, false);
    scheduleViewportUpdate(evt.target, evt.viewState.zoom);
  }, [updateMapState, scheduleViewportUpdate]);

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
    flushPendingViewport(evt.target, evt.viewState.zoom);
    updateBounds(evt.target);
  }, [updateMapState, updateBounds, flushPendingViewport]);

  const onLoad = useCallback((evt: { target: maplibregl.Map }) => {
    setIsMapLoaded(true);
    // Force MapLibre to re-read container dimensions before reading bounds.
    // Without this, maps rendered inside freshly-mounted flex containers (e.g.
    // the Photography tool's fresh MapProvider) can report a degenerate
    // bounding box on first load, causing the initial cluster query to use
    // zero bounds and return no markers until the user interacts.
    evt.target.resize();
    flushPendingViewport(evt.target, evt.target.getZoom());
    updateBounds(evt.target);
    if (lat === DEFAULT_LAT && lng === DEFAULT_LNG && zoom === DEFAULT_ZOOM) {
      let hasInteracted = false;
      try { hasInteracted = sessionStorage.getItem('plano_map_interacted') === 'true'; } catch (_e) {}
      let savedState: string | null = null;
      try { savedState = localStorage.getItem(LOCAL_STORAGE_MAP_KEY); } catch {}
      if (savedState && !hasEarlyMovedRef.current) {
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
      if (!hasInteracted && !hasEarlyMovedRef.current) geolocateControlRef.current?.trigger();
    }
  }, [updateBounds, lat, lng, zoom, updateMapState, flushPendingViewport]);

  const clusterBounds = clusterViewport?.bounds ?? bounds;
  const clusterZoom = clusterViewport?.zoom ?? viewState.zoom;

  const { clusters: browseClusters, isLoading: browseLoading, isFetching: browseFetching } = useMapData({
    bounds: clusterBounds || { north: 0, south: 0, east: 0, west: 0 },
    zoom: clusterZoom,
    filters,
    mode,
  });

  const clusters = findModeBuildings
    ? findModeBuildings
        .filter((b) => b.lat != null && b.lng != null)
        .map((b) => ({
          id: b.id,
          lat: b.lat as number,
          lng: b.lng as number,
          is_cluster: false,
          count: 1,
          rating: null,
          status: null,
          name: b.name,
          slug: b.slug,
          image_url: b.hero_image_url ?? undefined,
          tier_rank_label: b.tier_rank,
          tier_rank: 1,
        }))
    : browseClusters;
  const isLoading = findModeBuildings ? false : browseLoading;
  const isFetching = findModeBuildings ? false : browseFetching;

  const visibleClustersCount = useMemo(() => {
    if (!clusters || !bounds) return 0;
    return clusters.filter(c =>
      c.lat <= bounds.north && c.lat >= bounds.south &&
      c.lng <= bounds.east && c.lng >= bounds.west
    ).length;
  }, [clusters, bounds]);

  const topGapCluster = useMemo(() => {
    if (!showGapCallout || !filters.photographyGaps || !clusters || clusters.length === 0 || viewState.zoom >= 12) return null;
    return clusters
      .filter(c => c.is_cluster)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reduce((prev: any, curr: any) => (curr.count > (prev?.count || 0) ? curr : prev), null);
  }, [clusters, filters.photographyGaps, showGapCallout, viewState.zoom]);

  // Trigger an explicit map.resize() whenever the fullscreen state changes so
  // the MapLibre canvas recalculates its dimensions after the portal fires.
  useEffect(() => {
    if (!isMapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const raf = requestAnimationFrame(() => map.resize());
    return () => cancelAnimationFrame(raf);
  }, [isExpanded]);

  const mapContent = (
    // `relative` and `fixed` must be mutually exclusive: Tailwind generates
    // `.relative` after `.fixed` in its output, so if both classes are present
    // `position: relative` wins and the fixed/fullscreen overlay never works.
    <div className={`${isExpanded ? "fixed inset-0 z-[9999]" : "relative z-0"} h-full w-full overflow-hidden bg-surface-default`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={onMove}
        onMoveEnd={onMoveEnd}
        onLoad={onLoad}
        onResize={(evt) => {
          flushPendingViewport(evt.target, evt.target.getZoom());
          updateBounds(evt.target);
        }}
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

      {showEmptyMessage && !isLoading && !isFetching && bounds && visibleClustersCount === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface-card/95 backdrop-blur-sm border border-border-default p-5 text-center max-w-xs animate-in fade-in zoom-in duration-300">
          <p className="text-sm text-text-primary mb-3">
            No buildings in this area
          </p>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity"
          >
            Zoom out →
          </button>
        </div>
      )}

      {/* ── Top-left: Satellite toggle & Gap Callout ── */}
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
          <span className="text-xs font-medium uppercase tracking-wide hidden sm:inline">
            {isSatellite ? "Map" : "Satellite"}
          </span>
        </button>

        {topGapCluster && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              mapRef.current?.flyTo({
                center: [topGapCluster.lng, topGapCluster.lat],
                zoom: 14,
                duration: 1000
              });
            }}
            className="p-3 bg-brand-primary text-brand-primary-foreground border border-brand-primary shadow-lg animate-in slide-in-from-left-4 duration-500 max-w-[200px] text-left"
          >
            <div className="flex items-start gap-2">
              <Camera className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-tight">
                  {topGapCluster.count} gaps in {topGapCluster.city || "this area"}
                </span>
                <span className="text-[10px] opacity-80 uppercase tracking-wider mt-1">
                  Tap to explore →
                </span>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* ── Top-right: Fullscreen toggle ── */}
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

export function PlanoMap({ showEmptyMessage, showGapCallout }: PlanoMapProps) {
  return (
    <MapErrorBoundary>
      <PlanoMapContent showEmptyMessage={showEmptyMessage} showGapCallout={showGapCallout} />
    </MapErrorBoundary>
  );
}