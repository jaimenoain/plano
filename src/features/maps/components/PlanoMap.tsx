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
import { DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM } from '@/features/maps/hooks/useURLMapState';
import { useMapWheelZoomCapture } from '@/features/maps/hooks/useMapWheelZoomCapture';
import { useMapClusterViewport } from '@/features/maps/hooks/useMapClusterViewport';
import { MapErrorBoundary } from './MapErrorBoundary';
import { useMapContext } from '../providers/MapContext';
import { useMapData, ClusterResponse } from '../hooks/useMapData';
import { MapMarkers } from './MapMarkers';
import { BuildingDetailDrawer } from './BuildingDetailDrawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { SATELLITE_MAP_STYLE } from "@/features/maps/constants/satelliteMapStyle";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const LOCAL_STORAGE_MAP_KEY = 'plano_map_view_state';
const DEFAULT_GEOLOCATE_ZOOM = 8;

interface PlanoMapProps {
  showEmptyMessage?: boolean;
  showGapCallout?: boolean;
}

function PlanoMapContent({ showEmptyMessage, showGapCallout }: PlanoMapProps) {
  const [isSatellite, setIsSatellite] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Viewport lives in the map store now (Stage B). PlanoMap reads lat/lng/zoom
  // from context and writes them back via `moveMap` on gesture end only — there
  // is no longer a second useURLMapState/setMapURL writer racing the store's one
  // URL sync (useMapUrlSync). See the store/useMapUrlSync for the single-writer
  // model.
  const {
    methods: { setBounds, setHighlightedId, setSelectedId, selectBuilding, fitMapBounds, moveMap },
    state: { lat, lng, zoom, highlightedId, highlightedPoint, selectedId, selectedBuilding, filters, bounds, mode, fitBounds, findModeBuildings },
  } = useMapContext();
  const isMobile = useIsMobile();

  const mapRef = useRef<MapRef>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const { viewport: clusterViewport, scheduleViewportUpdate, flushPendingViewport } =
    useMapClusterViewport();

  useMapWheelZoomCapture(mapRef, isMapLoaded);

  // Fit-bounds command channel. Clamp the target zoom to [2, 16]: an unbounded
  // fit on a globe-spanning result set (e.g. "Lever") makes maplibre pick a
  // degenerate near-negative zoom that jitters the camera into a
  // viewport→URL→viewport feedback loop. We compute the camera with
  // cameraForBounds, clamp, then easeTo. The settled camera is persisted to the
  // store by onMoveEnd (one discrete URL write) — we deliberately do NOT moveMap
  // here, which would prop-jump and cut the animation short.
  useEffect(() => {
    if (!fitBounds) return;
    const map = mapRef.current?.getMap();
    if (!map) { fitMapBounds(null); return; }

    const { west, south, east, north } = fitBounds;
    const finite = [west, south, east, north].every((n) => Number.isFinite(n));
    const zeroArea = Math.abs(north - south) < 1e-6 && Math.abs(east - west) < 1e-6;
    const clampZoom = (z: number) => Math.min(16, Math.max(2, z));

    if (finite && !zeroArea) {
      const camera = map.cameraForBounds([[west, south], [east, north]], { padding: 50 });
      if (camera?.center && typeof camera.zoom === 'number') {
        const { lng: cLng, lat: cLat } = maplibregl.LngLat.convert(camera.center);
        map.easeTo({ center: [cLng, cLat], zoom: clampZoom(camera.zoom), duration: 1000 });
      }
    } else if (finite) {
      // Zero-area bounds (single result) — centre without an extreme zoom.
      map.easeTo({
        center: [(west + east) / 2, (south + north) / 2],
        zoom: clampZoom(map.getZoom()),
        duration: 600,
      });
    }
    fitMapBounds(null);
  }, [fitBounds, fitMapBounds]);

  const geolocateControlRef = useRef<MaplibreGeolocateControl | null>(null);
  const initialGeolocateAdjustedRef = useRef(false);
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
    // No URL/store write per frame — that per-frame writer fed the feedback loop.
    // The single discrete viewport write happens on gesture end (onMoveEnd). Here
    // we only keep the controlled camera and the cluster viewport in step.
    scheduleViewportUpdate(evt.target, evt.viewState.zoom);
  }, [scheduleViewportUpdate]);

  const onMoveEnd = useCallback((evt: ViewStateChangeEvent) => {
    flushPendingViewport(evt.target, evt.viewState.zoom);
    updateBounds(evt.target);
    // The one discrete viewport write: store → useMapUrlSync → URL. It writes the
    // *settled* camera, which `viewState` already equals — so the store's equality
    // guard and the viewState epsilon-compare make this a no-op for programmatic
    // settles (fitBounds/hydrate), which is why it cannot loop.
    moveMap(evt.viewState.latitude, evt.viewState.longitude, evt.viewState.zoom);
    try { sessionStorage.setItem('plano_map_interacted', 'true'); } catch (_e) {}
    try {
      localStorage.setItem(LOCAL_STORAGE_MAP_KEY, JSON.stringify({
        latitude: evt.viewState.latitude,
        longitude: evt.viewState.longitude,
        zoom: evt.viewState.zoom,
      }));
    } catch {}
  }, [moveMap, updateBounds, flushPendingViewport]);

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
            moveMap(latitude, longitude, savedZoom);
            return;
          }
        } catch {}
      }
      if (!hasInteracted && !hasEarlyMovedRef.current) geolocateControlRef.current?.trigger();
    }
  }, [updateBounds, lat, lng, zoom, moveMap, flushPendingViewport]);

  const onGeolocate = useCallback(
    (position: GeolocationPosition) => {
      // Only tune zoom for the first automatic geolocate on the untouched default map.
      if (initialGeolocateAdjustedRef.current) return;
      if (!(lat === DEFAULT_LAT && lng === DEFAULT_LNG && zoom === DEFAULT_ZOOM)) return;

      initialGeolocateAdjustedRef.current = true;
      const nextLat = position.coords.latitude;
      const nextLng = position.coords.longitude;

      setViewState((prev) => ({
        ...prev,
        latitude: nextLat,
        longitude: nextLng,
        zoom: DEFAULT_GEOLOCATE_ZOOM,
      }));
      moveMap(nextLat, nextLng, DEFAULT_GEOLOCATE_ZOOM);
    },
    [lat, lng, zoom, moveMap]
  );

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
          construction_status: b.construction_status ?? null,
          name: b.name,
          slug: b.slug,
          image_url: b.hero_image_url ?? undefined,
          tier_rank_label: b.tier_rank,
          tier_rank: 1,
        }))
    : browseClusters;
  const isLoading = findModeBuildings ? false : browseLoading;
  const isFetching = findModeBuildings ? false : browseFetching;

  // Resolve the selected building for the detail drawer. Retain the last known
  // cluster so the drawer survives a cluster refetch (e.g. saving a building can
  // momentarily drop it from the results) or panning the pin off-screen.
  const retainedSelectedRef = useRef<ClusterResponse | null>(null);
  const selectedCluster = useMemo(() => {
    if (!selectedId) {
      retainedSelectedRef.current = null;
      return null;
    }
    const found = (clusters || []).find(
      (c) => !c.is_cluster && String(c.id) === String(selectedId)
    );
    if (found) {
      retainedSelectedRef.current = found as ClusterResponse;
      return found as ClusterResponse;
    }
    // Not among the map's clusters (e.g. a SERP row aggregated into a cluster at
    // this zoom, or a pin panned off-screen) — fall back to the payload carried
    // by whoever set the selection.
    if (selectedBuilding && String(selectedBuilding.id) === String(selectedId)) {
      retainedSelectedRef.current = selectedBuilding;
      return selectedBuilding;
    }
    return retainedSelectedRef.current;
  }, [clusters, selectedId, selectedBuilding]);

  const handleSelectBuilding = useCallback(
    (cluster: ClusterResponse) => {
      // Carry the full cluster so the drawer survives the pin being aggregated
      // away (zoom-out) or panned off-screen — same path the SERP rows use.
      selectBuilding(cluster);
      setHighlightedId(String(cluster.id));
      // "Map stays" — only nudge when the pin would sit behind the right-hand
      // detail panel (desktop). If it's already visible, leave the map put.
      if (isMobile) return;
      const map = mapRef.current?.getMap();
      if (!map || cluster.lng == null || cluster.lat == null) return;
      const PANEL_W = 384; // Tailwind max-w-sm
      const MARGIN = 24;
      const width = map.getContainer().clientWidth;
      const pt = map.project([cluster.lng, cluster.lat]);
      const overlap = pt.x - (width - PANEL_W - MARGIN);
      if (overlap > 0) {
        map.panBy([overlap, 0], { duration: 300 });
      }
    },
    [selectBuilding, setHighlightedId, isMobile]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedId(null);
    setHighlightedId(null);
  }, [setSelectedId, setHighlightedId]);

  // Slide the bottom-right map controls clear of the detail drawer so they stay
  // usable while it is open. Desktop only — on mobile the drawer is a modal bottom
  // sheet with a full-screen overlay, so the controls are covered regardless. The
  // safe-area bottom margin lifts the geolocate button above the home indicator
  // (parity with CollectionMapGL).
  const mapControlStyle = useMemo(() => {
    const drawerOpen = !isMobile && !!selectedCluster;
    const isSpecial = !!(selectedCluster?.is_custom_marker || selectedCluster?.is_candidate);
    const panelWidth = isSpecial ? 384 : 448; // max-w-sm / max-w-md, matches BuildingDetailDrawer
    // Use translateX rather than margin: the control lives in an absolutely
    // positioned, shrink-wrapped `.maplibregl-ctrl-bottom-right` float, where a
    // large right margin doesn't reliably push it left. transform always moves it.
    // The value must always be present — react-map-gl merges this style onto the
    // element via Object.assign and never clears removed keys, so an omitted
    // transform would leave the shifted value stuck after the drawer closes.
    // No CSS transition here: react-map-gl re-applies the control style on every
    // map render, which restarts a transition mid-flight so it never settles —
    // the controls snap to position instead (the drawer itself animates).
    return {
      marginBottom: "env(safe-area-inset-bottom, 0px)",
      transform: drawerOpen ? `translateX(-${panelWidth + 16}px)` : "translateX(0)",
    };
  }, [isMobile, selectedCluster]);

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
        onClick={() => {
          setHighlightedId(null);
          setSelectedId(null);
        }}
      >
        <GeolocateControl
          ref={geolocateControlRef}
          position="bottom-right"
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={true}
          showUserLocation={true}
          onGeolocate={onGeolocate}
          style={mapControlStyle}
        />
        <NavigationControl position="bottom-right" style={mapControlStyle} />
        {bounds && (
          <MapMarkers
            clusters={clusters || []}
            highlightedId={highlightedId}
            highlightedPoint={highlightedPoint}
            setHighlightedId={setHighlightedId}
            selectedId={selectedId}
            onSelectBuilding={handleSelectBuilding}
          />
        )}
      </Map>

      {/* Detail drawer — slides from the right (desktop) / bottom (mobile) on pin click */}
      <BuildingDetailDrawer cluster={selectedCluster} onClose={handleCloseDetail} />

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
            className="p-3 bg-brand-primary text-brand-primary-foreground border border-brand-primary shadow-lg animate-in slide-in-from-left-4 duration-500 max-w-[140px] sm:max-w-[200px] text-left"
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