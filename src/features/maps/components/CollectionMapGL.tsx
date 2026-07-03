import { useEffect, useState, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { createPortal } from "react-dom";
import { useSearchParams } from 'react-router';
import MapGL, { NavigationControl, ViewStateChangeEvent, GeolocateControl, MapRef } from 'react-map-gl/maplibre';
import maplibregl, { type GeolocateControl as MaplibreGeolocateControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Supercluster from 'supercluster';
import { Layers, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { useURLMapState } from '@/features/maps/hooks/useURLMapState';
import { useMapWheelZoomCapture } from '@/features/maps/hooks/useMapWheelZoomCapture';
import { useStableMapUpdate } from '@/features/maps/hooks/useStableMapUpdate';
import { MapErrorBoundary } from './MapErrorBoundary';
import { MapMarkers } from './MapMarkers';
import { ItineraryRoutes } from './ItineraryRoutes';
import { DiscoveryBuilding } from '@/features/search/components/types';
import { ClusterResponse } from '../hooks/useMapData';
import { getBoundsFromBuildings, type Bounds } from '@/utils/map';
import { useItineraryStore } from '@/features/itinerary/stores/useItineraryStore';
import { SATELLITE_MAP_STYLE } from "@/features/maps/constants/satelliteMapStyle";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

/** Lifts zoom/geo controls above home-indicator + browser overlay chrome on small screens. */
const MAP_CONTROL_SAFE_AREA_STYLE = {
  marginBottom: "env(safe-area-inset-bottom, 0px)",
} as const;

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
}: CollectionMapGLProps) {
  const { lat, lng, zoom, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);
  const mapRef = useRef<MapRef>(null);

  const days = useItineraryStore((state) => state.days);

  // Map building IDs to their itinerary sequence and day index
  const itineraryMap = useMemo(() => {
    if (!showItinerary) return new Map();

    const map = new Map<string, { dayIndex: number; sequence: number }>();
    if (days) {
      days.forEach((day, dayIndex) => {
          day.stops?.forEach((stop, index) => {
              const key = stop.referenceId || stop.id;
              if (!map.has(key)) {
                  map.set(key, {
                      dayIndex: dayIndex,
                      sequence: index + 1
                  });
              }
          });
      });
    }
    return map;
  }, [days, showItinerary]);

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

  const onMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
    updateMapState({
      lat: evt.viewState.latitude,
      lng: evt.viewState.longitude,
      zoom: evt.viewState.zoom
    }, false);
  }, [updateMapState]);

  const reportViewportBounds = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !onViewportBoundsChange) return;
    const b = map.getBounds();
    onViewportBoundsChange({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }, [onViewportBoundsChange]);

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
    if (!isMapLoaded || !hasFittedBounds || !onViewportBoundsChange) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        reportViewportBounds();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [hasFittedBounds, isMapLoaded, onViewportBoundsChange, reportViewportBounds]);

  // Build supercluster index whenever buildings or itinerary assignments change.
  // Each point stores a numeric tier_rank (1–3) so clusters can surface the
  // highest-ranked building they contain via the reduce aggregation (max_tier).
  const superclusterIndex = useMemo(() => {
    const sc = new Supercluster({
      radius: 60,
      maxZoom: 16,
      map: (props: Record<string, unknown>) => ({ max_tier: (props.tier_rank as number) ?? 1 }),
      reduce: (acc: Record<string, unknown>, props: Record<string, unknown>) => {
        acc.max_tier = Math.max((acc.max_tier as number) ?? 1, (props.max_tier as number) ?? 1);
      },
    });

    const points = buildings
      .filter(b => b.location_lat !== 0 || b.location_lng !== 0)
      .map(b => {
        const itineraryInfo = itineraryMap.get(b.id);
        const tierLabel = typeof b.tier_rank === 'string' ? b.tier_rank : null;
        let tierRank = 1;
        if (tierLabel === 'Top 1%') tierRank = 3;
        else if (tierLabel === 'Top 5%') tierRank = 2;
        else if (tierLabel === 'Top 20%' || tierLabel === 'Top 10%') tierRank = 1;

        return {
          type: 'Feature' as const,
          properties: {
            id: b.id,
            name: b.name ?? '',
            slug: b.slug ?? null,
            image_url: b.main_image_url ?? null,
            image_attribution: b.image_attribution ?? null,
            tier_rank: tierRank,
            tier_rank_label: tierLabel,
            rating: b.personal_rating ?? null,
            status: b.personal_status ?? null,
            color: b.color ?? null,
            is_custom_marker: b.isMarker ?? false,
            marker_category: b.markerCategory ?? null,
            marker_google_primary_type: b.markerGooglePrimaryType ?? null,
            notes: b.notes ?? null,
            is_candidate: b.isCandidate ?? false,
            address: b.address ?? null,
            google_place_id: b.google_place_id ?? null,
            website: b.website ?? null,
            itinerary_sequence: itineraryInfo?.sequence,
            itinerary_day_index: itineraryInfo?.dayIndex,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [b.location_lng, b.location_lat],
          },
        };
      });

    sc.load(points);
    return sc;
  }, [buildings, itineraryMap]);

  // Recompute visible clusters on every zoom change (cheap index lookup).
  const clusters = useMemo<ClusterResponse[]>(() => {
    const zoom = Math.round(viewState.zoom);
    const features = superclusterIndex.getClusters([-180, -85, 180, 85], zoom);

    return features.map(feature => {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties as Record<string, unknown>;

      if (props.cluster) {
        return {
          id: props.cluster_id as string | number,
          lat,
          lng,
          is_cluster: true,
          count: props.point_count as number,
          max_tier: (props.max_tier as number) ?? 1,
          rating: null,
          status: null,
        } as ClusterResponse;
      }

      return {
        id: props.id as string,
        lat,
        lng,
        is_cluster: false,
        count: 1,
        name: props.name as string,
        slug: (props.slug as string | null) ?? undefined,
        image_url: (props.image_url as string | null) ?? undefined,
        image_attribution: (props.image_attribution as string[] | null) ?? undefined,
        tier_rank: props.tier_rank as number,
        tier_rank_label: props.tier_rank_label as string | null,
        rating: props.rating as number | null,
        status: props.status as string | null,
        color: props.color as string | null,
        is_custom_marker: props.is_custom_marker as boolean,
        marker_category: (props.marker_category as string | null) ?? undefined,
        marker_google_primary_type: props.marker_google_primary_type as string | null,
        notes: props.notes as string | null,
        is_candidate: props.is_candidate as boolean,
        address: props.address as string | null,
        google_place_id: props.google_place_id as string | null,
        website: (props.website as string | null) ?? undefined,
        itinerary_sequence: props.itinerary_sequence as number | undefined,
        itinerary_day_index: props.itinerary_day_index as number | undefined,
      } as ClusterResponse;
    });
  }, [superclusterIndex, viewState.zoom]);

  const handleAddCandidate = useCallback((id: string) => {
      if (onAddCandidate) {
          const building = buildings.find(b => b.id === id);
          if (building) {
             onAddCandidate(building);
          }
      }
  }, [onAddCandidate, buildings]);

  const handleRemove = onRemoveItem;

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
            />
        </MapGL>

        {/* Top Left: Satellite + optional collection actions (avoid bottom nav / mobile map-list toggle). */}
        <div className="absolute top-2 left-2 z-40 flex max-w-[min(100vw-5rem,20rem)] flex-col gap-2">
          <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                setIsSatellite(!isSatellite);
            }}
            className="flex items-center gap-2 rounded-sm border border-border-default bg-surface-card/90 p-2 shadow-md backdrop-blur-xs transition-colors hover:bg-surface-muted"
            title={isSatellite ? "Show Map" : "Show Satellite"}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span className="hidden text-xs font-medium sm:inline">{isSatellite ? "Map" : "Satellite"}</span>
          </button>
          {bottomLeftOverlay ? (
            <div className="pointer-events-auto min-w-0" onClick={(e) => e.stopPropagation()}>
              {bottomLeftOverlay}
            </div>
          ) : null}
        </div>

        {/* Top Right: Fullscreen Toggle */}
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
            }}
            className="absolute top-2 right-2 z-40 rounded-sm border border-border-default bg-surface-card/90 p-2 shadow-md backdrop-blur-xs transition-colors hover:bg-surface-muted"
            title={isExpanded ? "Collapse Map" : "Expand Map"}
        >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
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
