import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from "react-dom";
import { useSearchParams } from 'react-router';
import MapGL, { NavigationControl, ViewStateChangeEvent, GeolocateControl, MapRef } from 'react-map-gl/maplibre';
import maplibregl, { type GeolocateControl as MaplibreGeolocateControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { useURLMapState } from '@/features/maps/hooks/useURLMapState';
import { useStableMapUpdate } from '@/features/maps/hooks/useStableMapUpdate';
import { MapErrorBoundary } from './MapErrorBoundary';
import { MapMarkers } from './MapMarkers';
import { ItineraryRoutes } from './ItineraryRoutes';
import { DiscoveryBuilding } from '@/features/search/components/types';
import { ClusterResponse } from '../hooks/useMapData';
import { getBoundsFromBuildings } from '@/utils/map';
import { useItineraryStore } from '@/features/itinerary/stores/useItineraryStore';
import { SATELLITE_MAP_STYLE } from "@/features/maps/constants/satelliteMapStyle";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

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
  showItinerary
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

  const onMoveEnd = useCallback((evt: ViewStateChangeEvent) => {
    updateMapState({
      lat: evt.viewState.latitude,
      lng: evt.viewState.longitude,
      zoom: evt.viewState.zoom
    }, true);
  }, [updateMapState]);

  // Transform DiscoveryBuilding[] to ClusterResponse[]
  const clusters = useMemo<ClusterResponse[]>(() => {
    return buildings.map(b => {
        const itineraryInfo = itineraryMap.get(b.id);

        return {
            id: b.id,
            lat: b.location_lat,
            lng: b.location_lng,
            is_cluster: false,
            count: 1,
            rating: b.personal_rating || null,
            status: b.personal_status || null,
            color: b.color || null,
            name: b.name,
            slug: b.slug || undefined,
            image_url: b.main_image_url || undefined,
            image_attribution: b.image_attribution || undefined,

            // Custom fields
            is_custom_marker: b.isMarker,
            marker_category: b.markerCategory,
            notes: b.notes ?? null,
            is_candidate: b.isCandidate,
            address: b.address ?? null,
            google_place_id: b.google_place_id,
            website: b.website,

            // Itinerary fields
            itinerary_sequence: itineraryInfo?.sequence,
            itinerary_day_index: itineraryInfo?.dayIndex,
        };
    });
  }, [buildings, itineraryMap]);

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
    <div className={`relative h-full w-full overflow-hidden bg-surface-default ${isExpanded ? "fixed inset-0 z-[9999]" : ""}`}>
        <MapGL
            ref={mapRef}
            {...viewState}
            onMove={onMove}
            onMoveEnd={onMoveEnd}
            onLoad={() => setIsMapLoaded(true)}
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

            {showItinerary && <ItineraryRoutes />}

            <MapMarkers
                clusters={clusters}
                highlightedId={highlightedId}
                setHighlightedId={setHighlightedId}
                onRemoveFromCollection={handleRemove}
                onAddCandidate={handleAddCandidate}
            />
        </MapGL>

        {/* Top Left: Satellite Toggle */}
        <div className="absolute top-2 left-2 flex flex-col gap-2 z-[60]">
          <button
            onClick={(e) => {
                e.stopPropagation();
                setIsSatellite(!isSatellite);
            }}
            className="p-2 bg-surface-card/90 backdrop-blur-sm border border-border-default rounded-sm shadow-md hover:bg-surface-muted transition-colors flex items-center gap-2"
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
            className="absolute top-2 right-2 p-2 bg-surface-card/90 backdrop-blur-sm border border-border-default rounded-sm shadow-md hover:bg-surface-muted transition-colors z-[60]"
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

export function CollectionMapGL(props: CollectionMapGLProps) {
    return (
        <MapErrorBoundary>
            <CollectionMapGLContent {...props} />
        </MapErrorBoundary>
    );
}
