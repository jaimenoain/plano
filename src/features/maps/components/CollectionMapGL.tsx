import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from "react-dom";
import { useSearchParams } from 'react-router-dom';
import MapGL, { NavigationControl, ViewStateChangeEvent, GeolocateControl, MapRef } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, Maximize2, Minimize2 } from "lucide-react";
import { useURLMapState, DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM } from '@/features/maps/hooks/useURLMapState';
import { useStableMapUpdate } from '@/features/maps/hooks/useStableMapUpdate';
import { MapErrorBoundary } from './MapErrorBoundary';
import { MapMarkers } from './MapMarkers';
import { ItineraryRoutes } from './ItineraryRoutes';
import { DiscoveryBuilding } from '@/features/search/components/types';
import { ClusterResponse } from '../hooks/useMapData';
import { getBoundsFromBuildings } from '@/utils/map';
import { useItineraryStore } from '@/features/itinerary/stores/useItineraryStore';

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

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

interface CollectionMapGLProps {
  buildings: DiscoveryBuilding[];
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
  onRemoveItem?: (id: string) => void;
  onAddCandidate?: (building: DiscoveryBuilding) => void;
  onUpdateMarkerNote?: (id: string, note: string) => void;
  onRemoveMarker?: (id: string) => void;
  showSavedCandidates?: boolean;
}

function CollectionMapGLContent({
  buildings,
  highlightedId,
  setHighlightedId,
  onRemoveItem,
  onAddCandidate,
  onUpdateMarkerNote,
  onRemoveMarker,
  showSavedCandidates
}: CollectionMapGLProps) {
  const { lat, lng, zoom, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);
  const mapRef = useRef<MapRef>(null);

  const days = useItineraryStore((state) => state.days);

  // Map building IDs to their itinerary sequence and day index
  const itineraryMap = useMemo(() => {
    const map = new Map<string, { dayIndex: number; sequence: number }>();
    days.forEach((day, dayIndex) => {
        day.buildings.forEach((building, index) => {
            if (!map.has(building.id)) {
                map.set(building.id, {
                    dayIndex: dayIndex,
                    sequence: index + 1
                });
            }
        });
    });
    return map;
  }, [days]);

  const [searchParams] = useSearchParams();
  // Determine if we should auto-fit bounds on mount (only if no explicit URL params provided)
  const [shouldAutoFit] = useState(() => !searchParams.has('lat') && !searchParams.has('lng'));

  const [isSatellite, setIsSatellite] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasFittedBounds, setHasFittedBounds] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geolocateControlRef = useRef<any>(null);

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

                      // Update both local viewState and URL immediately
                      // This atomic update prevents race conditions with the URL sync hook
                      setViewState({
                          latitude: center.lat,
                          longitude: center.lng,
                          zoom: zoom
                      });
                      updateMapState({
                          lat: center.lat,
                          lng: center.lng,
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

            // Custom fields
            is_custom_marker: (b as any).isMarker,
            notes: (b as any).notes,
            is_candidate: (b as any).isCandidate,
            address: (b as any).address,

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

  const handleRemove = useCallback((id: string) => {
      // In CollectionMap, handleRemoveItem checks both items and markers by ID.
      // So passing ID is sufficient for parent to distinguish.
      if (onRemoveItem) onRemoveItem(id);
  }, [onRemoveItem]);


  const mapContent = (
    <div className={`relative h-full w-full overflow-hidden bg-background ${isExpanded ? "fixed inset-0 z-[9999]" : ""}`}>
        <MapGL
            ref={mapRef}
            {...viewState}
            onMove={onMove}
            onMoveEnd={onMoveEnd}
            onLoad={() => setIsMapLoaded(true)}
            mapLib={maplibregl}
            mapStyle={isSatellite ? SATELLITE_STYLE : MAP_STYLE}
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

            <ItineraryRoutes />

            <MapMarkers
                clusters={clusters}
                highlightedId={highlightedId}
                setHighlightedId={setHighlightedId}
                onRemoveFromCollection={handleRemove}
                onAddCandidate={handleAddCandidate}
            />
        </MapGL>

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

export function CollectionMapGL(props: CollectionMapGLProps) {
    return (
        <MapErrorBoundary>
            <CollectionMapGLContent {...props} />
        </MapErrorBoundary>
    );
}
