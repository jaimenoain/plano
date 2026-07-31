import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from "react-dom";
import { useSearchParams } from 'react-router';
import MapGL, { NavigationControl, ViewStateChangeEvent, GeolocateControl, MapRef } from 'react-map-gl/maplibre';
import maplibregl, { type GeolocateControl as MaplibreGeolocateControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { useURLMapState } from '@/features/maps/hooks/useURLMapState';
import { useMapWheelZoomCapture } from '@/features/maps/hooks/useMapWheelZoomCapture';
import { useStableMapUpdate } from '@/features/maps/hooks/useStableMapUpdate';
import { MapErrorBoundary } from './MapErrorBoundary';
import { MapMarkers } from './MapMarkers';
import { BuildingDetailDrawer } from './BuildingDetailDrawer';
import { ItineraryRoutes } from './ItineraryRoutes';
import { MapChromeButton } from './MapChromeButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { DiscoveryBuilding } from '@/features/search/components/types';
import { ClusterResponse } from '../hooks/useMapData';
import { useCollectionMapClusters } from '../hooks/useCollectionMapClusters';
import { useMapClusterViewport } from '../hooks/useMapClusterViewport';
import { CollectionMembershipAction } from './CollectionMembershipAction';
import { getBoundsFromBuildings, type Bounds } from '@/utils/map';
import { SATELLITE_MAP_STYLE } from "@/features/maps/constants/satelliteMapStyle";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

/** Lifts zoom/geo controls above home-indicator + browser overlay chrome on small screens. */
const MAP_CONTROL_SAFE_AREA_STYLE = {
  marginBottom: "env(safe-area-inset-bottom, 0px)",
} as const;

/** Stable empty set — a fresh one per render would re-run the discovery memo. */
const EMPTY_BUILDING_IDS: Set<string> = new Set();

interface CollectionMapGLProps {
  buildings: DiscoveryBuilding[];
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
  onRemoveItem?: (id: string) => void;
  onAddCandidate?: (building: DiscoveryBuilding) => void;
  onUpdateMarkerNote?: (id: string, note: string) => void;
  onRemoveMarker?: (id: string) => void;
  showSavedCandidates?: boolean;
  showItinerary?: boolean;
  /** Fired when the visible geographic viewport changes (initial load, pan, zoom). */
  onViewportBoundsChange?: (bounds: Bounds) => void;
  /** Extra control below Satellite (top-left); kept out of bottom UI (nav / map-list toggle). */
  bottomLeftOverlay?: ReactNode;
  /**
   * Selection-mode (parity with /search). When `onSelectBuilding` is provided,
   * pins open the right-side BuildingDetailDrawer instead of the hover popup +
   * open-in-new-tab. `selectedCluster` is the currently-open payload (retained
   * by the parent so the drawer survives cluster recompute / panning).
   */
  selectedCluster?: ClusterResponse | null;
  onSelectBuilding?: (cluster: ClusterResponse) => void;
  onCloseDetail?: () => void;
  /** Drawer action — remove the open building from the collection (owner/contributor). */
  onRemoveFromCollection?: (buildingId: string) => void;
  /**
   * Discovery view (owner/editor only): also draw every building in the current
   * viewport, de-emphasized, so the collection can be built from the map.
   * `hideCollectionPins` then drops the collection's own pins to leave only what
   * could still be added, and `onAddToCollection` is the drawer's add action.
   */
  discoveryEnabled?: boolean;
  hideCollectionPins?: boolean;
  /** Buildings already collected — de-duplicates and disarms the discovery layer. */
  collectionBuildingIds?: Set<string>;
  onAddToCollection?: (cluster: ClusterResponse) => void;
  /**
   * On-demand re-frame (e.g. "Zoom to results" after a collection search). The
   * camera moves only when `token` changes, so re-renders and filtered building
   * lists never move it on their own — that stays the one-shot auto-fit's job.
   */
  fitBoundsRequest?: { bounds: Bounds; token: number } | null;
}

function CollectionMapGLContent({
  buildings,
  highlightedId,
  setHighlightedId,
  onRemoveItem,
  onAddCandidate,
  onUpdateMarkerNote: _onUpdateMarkerNote,
  onRemoveMarker: _onRemoveMarker,
  showSavedCandidates: _showSavedCandidates,
  showItinerary,
  onViewportBoundsChange,
  bottomLeftOverlay,
  selectedCluster,
  onSelectBuilding,
  onCloseDetail,
  onRemoveFromCollection,
  discoveryEnabled,
  hideCollectionPins,
  collectionBuildingIds,
  onAddToCollection,
  fitBoundsRequest,
}: CollectionMapGLProps) {
  const { lat, lng, zoom, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);
  const mapRef = useRef<MapRef>(null);
  const isMobile = useIsMobile();

  // Live viewport for the discovery layer's bbox RPC: throttled during pan,
  // immediate on a zoom-level change (the collection's own pins need neither).
  const { viewport, scheduleViewportUpdate, flushPendingViewport } = useMapClusterViewport();

  const [searchParams] = useSearchParams();
  // Determine if we should auto-fit bounds on mount (only if no explicit URL params provided)
  const [shouldAutoFit] = useState(() => !searchParams.has('lat') && !searchParams.has('lng'));

  const [isSatellite, setIsSatellite] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasFittedBounds, setHasFittedBounds] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const geolocateControlRef = useRef<MaplibreGeolocateControl | null>(null);

  useMapWheelZoomCapture(mapRef, isMapLoaded);

  const [viewState, setViewState] = useState({
    latitude: lat,
    longitude: lng,
    zoom: zoom
  });

  // Sync local state with URL
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

  // Fit bounds logic
  useEffect(() => {
      if (!hasFittedBounds && buildings.length > 0 && mapRef.current && isMapLoaded) {
          if (shouldAutoFit) {
              const bounds = getBoundsFromBuildings(buildings);
              if (bounds) {
                  // Calculate target state deterministically
                  const camera = mapRef.current.getMap().cameraForBounds(
                      [
                          [bounds.west, bounds.south],
                          [bounds.east, bounds.north]
                      ],
                      { padding: 50 }
                  );

                  if (camera && camera.center && typeof camera.zoom === 'number') {
                      const { center, zoom } = camera;
                      const ll = maplibregl.LngLat.convert(center);

                      // Update both local viewState and URL immediately
                      // This atomic update prevents race conditions with the URL sync hook
                      setViewState({
                          latitude: ll.lat,
                          longitude: ll.lng,
                          zoom: zoom
                      });
                      updateMapState({
                          lat: ll.lat,
                          lng: ll.lng,
                          zoom: zoom
                      }, true);

                      setHasFittedBounds(true);
                  }
              }
          } else {
             setHasFittedBounds(true);
          }
      }
  }, [buildings, hasFittedBounds, shouldAutoFit, isMapLoaded, updateMapState]);

  // On-demand re-frame. Keyed on the token so only an explicit request moves the
  // camera; `onMove`/`onMoveEnd` then reconcile viewState and the URL as usual.
  const lastFitToken = useRef(0);
  useEffect(() => {
    if (!fitBoundsRequest || !isMapLoaded) return;
    if (fitBoundsRequest.token === lastFitToken.current) return;
    lastFitToken.current = fitBoundsRequest.token;
    const { bounds } = fitBoundsRequest;
    mapRef.current?.getMap().fitBounds(
      [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ],
      { padding: 60, maxZoom: 16, duration: 600 },
    );
  }, [fitBoundsRequest, isMapLoaded]);

  const onMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
    const map = mapRef.current?.getMap();
    if (map) scheduleViewportUpdate(map, evt.viewState.zoom);
    updateMapState({
      lat: evt.viewState.latitude,
      lng: evt.viewState.longitude,
      zoom: evt.viewState.zoom
    }, false);
  }, [updateMapState, scheduleViewportUpdate]);

  const reportViewportBounds = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    flushPendingViewport(map, map.getZoom());
    if (!onViewportBoundsChange) return;
    const b = map.getBounds();
    onViewportBoundsChange({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }, [onViewportBoundsChange, flushPendingViewport]);

  const onMoveEnd = useCallback((evt: ViewStateChangeEvent) => {
    updateMapState({
      lat: evt.viewState.latitude,
      lng: evt.viewState.longitude,
      zoom: evt.viewState.zoom
    }, true);
    reportViewportBounds();
  }, [updateMapState, reportViewportBounds]);

  // Programmatic fit-to-bounds does not always emit onMoveEnd; refresh viewport after fit.
  useEffect(() => {
    if (!isMapLoaded || !hasFittedBounds) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        reportViewportBounds();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [hasFittedBounds, isMapLoaded, reportViewportBounds]);

  const clusters = useCollectionMapClusters({
    buildings,
    showItinerary,
    zoom: viewState.zoom,
    discovery: {
      enabled: !!discoveryEnabled,
      hideCollectionPins: !!hideCollectionPins,
      viewport,
      collectionBuildingIds: collectionBuildingIds ?? EMPTY_BUILDING_IDS,
    },
  });

  const handleAddCandidate = useCallback((id: string) => {
      if (onAddCandidate) {
          const building = buildings.find(b => b.id === id);
          if (building) {
             onAddCandidate(building);
          }
      }
  }, [onAddCandidate, buildings]);

  const handleRemove = onRemoveItem;

  // Selection-mode click: open the right-side detail drawer (parity with /search).
  // On desktop, nudge the map left so the selected pin isn't hidden behind the
  // ~448px panel; mobile uses a bottom sheet so no pan is needed.
  const handleSelectBuilding = useCallback(
    (cluster: ClusterResponse) => {
      if (!onSelectBuilding) return;
      onSelectBuilding(cluster);
      if (!isMobile) {
        mapRef.current?.getMap().easeTo({
          center: [cluster.lng, cluster.lat],
          offset: [-160, 0],
          duration: 400,
        });
      }
    },
    [onSelectBuilding, isMobile],
  );

  if (!isClient) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-surface-default">
        <div
          className="flex h-full min-h-[240px] w-full items-center justify-center bg-surface-muted"
          aria-hidden
        >
          <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
        </div>
      </div>
    );
  }

  const mapContent = (
    <div className={`relative h-full w-full overflow-hidden bg-surface-default ${isExpanded ? "fixed inset-0 z-9999" : ""}`}>
        <MapGL
            ref={mapRef}
            {...viewState}
            onMove={onMove}
            onMoveEnd={onMoveEnd}
            onLoad={() => {
              setIsMapLoaded(true);
              requestAnimationFrame(() => {
                reportViewportBounds();
              });
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
                style={MAP_CONTROL_SAFE_AREA_STYLE}
            />
            <NavigationControl position="bottom-right" style={MAP_CONTROL_SAFE_AREA_STYLE} />

            {showItinerary && <ItineraryRoutes />}

            <MapMarkers
                clusters={clusters}
                highlightedId={highlightedId}
                setHighlightedId={setHighlightedId}
                onRemoveFromCollection={handleRemove}
                onAddCandidate={handleAddCandidate}
                onSelectBuilding={onSelectBuilding ? handleSelectBuilding : undefined}
            />
        </MapGL>

        {/* Top Left: Satellite + optional collection actions (avoid bottom nav / mobile map-list toggle). */}
        <div className="absolute top-2 left-2 z-40 flex max-w-[min(100vw-5rem,20rem)] flex-col gap-2">
          <MapChromeButton
            icon={<Layers className="h-4 w-4 shrink-0" strokeWidth={1.5} />}
            label={isSatellite ? "Map" : "Satellite"}
            title={isSatellite ? "Show Map" : "Show Satellite"}
            onClick={(e) => {
                e.stopPropagation();
                setIsSatellite(!isSatellite);
            }}
          />
          {bottomLeftOverlay ? (
            <div className="pointer-events-auto min-w-0" onClick={(e) => e.stopPropagation()}>
              {bottomLeftOverlay}
            </div>
          ) : null}
        </div>

        {/* Top Right: Fullscreen Toggle */}
        <MapChromeButton
            icon={isExpanded ? <Minimize2 className="h-4 w-4" strokeWidth={1.5} /> : <Maximize2 className="h-4 w-4" strokeWidth={1.5} />}
            title={isExpanded ? "Collapse Map" : "Expand Map"}
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="absolute top-2 right-2 z-40"
        />

        {/* Selection-mode detail drawer (parity with /search). Desktop: a
            non-modal panel anchored to this map container; mobile: a bottom
            sheet that portals to <body>, so it shows even in list view. */}
        {onSelectBuilding && (
          <BuildingDetailDrawer
            cluster={selectedCluster ?? null}
            onClose={() => onCloseDetail?.()}
            onRemoveFromCollection={onRemoveFromCollection}
            onAddCandidate={handleAddCandidate}
            closeOnOutsideClick
            collectionAction={
              <CollectionMembershipAction
                cluster={selectedCluster ?? null}
                inCollection={!!collectionBuildingIds?.has(String(selectedCluster?.id))}
                onAdd={onAddToCollection}
                onRemove={onRemoveFromCollection}
              />
            }
          />
        )}
    </div>
  );

  if (isExpanded) {
    return createPortal(mapContent, document.body);
  }

  return mapContent;
}

export function CollectionMapGL(props: CollectionMapGLProps) {
    return (
        <MapErrorBoundary>
            <CollectionMapGLContent {...props} />
        </MapErrorBoundary>
    );
}
