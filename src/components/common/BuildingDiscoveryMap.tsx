import { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { createPortal } from "react-dom";
import MapGL, { Marker, NavigationControl, MapRef, Source, Layer, LayerProps, MapLayerMouseEvent } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Layers, Maximize2, Minimize2, Plus, Check, EyeOff, Bookmark, CheckSquare, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DiscoveryBuilding, DiscoveryBuildingMapPin, MapItem, ClusterPoint, BuildingPoint } from "@/features/search/components/types";
import { CollectionMarkerCategory } from "@/types/collection";
import { MarkerInfoCard } from "../collections/MarkerInfoCard";
import { findNearbyBuildingsRpc, fetchUserBuildingsMap } from "@/utils/supabaseFallback";
import { getBuildingImageUrl } from "@/utils/image";
import { Bounds } from "@/utils/map";

// Constants
const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const JITTER_MULTIPLIER = 0.005;
const CLUSTER_MAX_ZOOM = 14;
const NULL_ISLAND_THRESHOLD = 0.00001;
const MAP_ANIMATION_TIMEOUT = 3000; // Safety timeout for stuck animations
const RESIZE_DELAY = 100;
const FLY_TO_DURATION = 1500;
const IDEMPOTENCY_EPSILON = 0.0001;
const DEFAULT_ZOOM = 12;
const DEFAULT_FLY_TO_ZOOM = 13;

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
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
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

// Types
// Use DiscoveryBuildingMapPin as base, and extend with properties used internally
interface Building extends DiscoveryBuildingMapPin {
  name?: string; // Optional in lightweight map pin
  markerCategory?: CollectionMarkerCategory;
  notes?: string | null;
  address?: string | null;
}

export interface BuildingDiscoveryMapRef {
  flyTo: (center: { lat: number, lng: number }, zoom?: number) => void;
  fitBounds: (bounds: Bounds) => void;
}

interface BuildingDiscoveryMapProps {
  externalBuildings?: DiscoveryBuildingMapPin[] | DiscoveryBuilding[] | MapItem[];
  onAddCandidate?: (building: DiscoveryBuildingMapPin) => void; // Update type
  onRegionChange?: (region: { lat: number, lng: number, zoom?: number }) => void;
  onBoundsChange?: (bounds: Bounds) => void;
  onMapInteraction?: () => void;
  isFetching?: boolean;
  autoZoomOnLowCount?: boolean;
  resetInteractionTrigger?: number;
  highlightedId?: string | null;
  onMarkerClick?: (buildingId: string) => void;
  showImages?: boolean;
  onRemoveItem?: (buildingId: string) => void;
  onHide?: (buildingId: string) => void;
  onHideCandidate?: (buildingId: string) => void;
  onSave?: (buildingId: string) => void;
  onVisit?: (buildingId: string) => void;
  onUpdateMarkerNote?: (id: string, note: string) => void;
  onRemoveMarker?: (id: string) => void;
  onClosePopup?: () => void;
  showSavedCandidates?: boolean;
  forcedBounds?: Bounds | null;
  onMapLoad?: () => void;
}

// Utility Functions

/**
 * Validates if coordinates are within valid ranges and not at (0,0)
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    lat >= -90 && 
    lat <= 90 && 
    lng >= -180 && 
    lng <= 180 &&
    !(Math.abs(lat) < NULL_ISLAND_THRESHOLD && Math.abs(lng) < NULL_ISLAND_THRESHOLD)
  );
}

function formatCount(count: number): string {
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
}

/**
 * Simple hash function for consistent pseudo-random number generation
 * Uses Java's String.hashCode algorithm
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Memoized hash values for building IDs to avoid recalculation
 */
const buildingHashCache = new Map<string, number>();

function getCachedHash(buildingId: string): number {
  if (!buildingHashCache.has(buildingId)) {
    buildingHashCache.set(buildingId, hashString(buildingId));
  }
  return buildingHashCache.get(buildingId)!;
}

/**
 * Generate deterministic coordinate offsets for approximate locations
 */
function getJitteredCoordinates(buildingId: string, lat: number, lng: number): [number, number] {
  const hash = getCachedHash(buildingId);
  
  // ~200-300m spread to ensure visual separation
  // (0.001 deg is approx 111m lat / 70m lng in London)
  const latOffset = (((hash % 1000) / 1000) - 0.5) * JITTER_MULTIPLIER;
  const lngOffset = ((((hash * 17) % 1000) / 1000) - 0.5) * JITTER_MULTIPLIER;
  
  return [lng + lngOffset, lat + latOffset];
}

// Layer Styles
const clusterLayer: LayerProps = {
  id: 'clusters',
  type: 'circle',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1'],
    'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40]
  }
};

const clusterCountLayer: LayerProps = {
  id: 'cluster-count',
  type: 'symbol',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['Noto Sans Bold'],
    'text-size': 12
  }
};

const unclusteredPointLayer: LayerProps = {
  id: 'unclustered-point',
  type: 'circle',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': [
        'case',
        ['boolean', ['get', 'isDimmed'], false], '#e0e0e0', // Dimmed color
        ['has', 'color'], ['get', 'color'], // Use explicit color if available
        '#888888' // Default fallback
    ],
    'circle-radius': [
        'case',
        ['==', ['get', 'location_precision'], 'approximate'], 5,
        ['boolean', ['get', 'isMarker'], false], 6, // Markers slightly smaller/same
        6 // Standard building dot
    ],
    'circle-stroke-width': 1,
    'circle-stroke-color': '#fff',
    'circle-opacity': [
        'case',
        ['boolean', ['get', 'isDimmed'], false], 0.6,
        ['==', ['get', 'location_precision'], 'approximate'], 0.7,
        1
    ]
  }
};

export const BuildingDiscoveryMap = forwardRef<BuildingDiscoveryMapRef, BuildingDiscoveryMapProps>(({
  externalBuildings,
  onAddCandidate,
  onRegionChange,
  onBoundsChange,
  onMapInteraction,
  isFetching,
  autoZoomOnLowCount,
  resetInteractionTrigger,
  highlightedId,
  onMarkerClick,
  showImages = true,
  onRemoveItem,
  onHide,
  onHideCandidate,
  onSave,
  onVisit,
  onUpdateMarkerNote,
  onRemoveMarker,
  onClosePopup,
  showSavedCandidates,
  forcedBounds,
  onMapLoad
}, ref) => {
  const { user } = useAuth();
  const mapRef = useRef<MapRef>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<(Building & { buildingId: string }) | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [hasVisibleCandidates, setHasVisibleCandidates] = useState(true);
  const [mapStyleError, setMapStyleError] = useState(false);

  // State to track user interaction to disable auto-zoom
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const isMapMovingRef = useRef(false);
  const mapMovingTimeoutRef = useRef<NodeJS.Timeout>();

  // Default view state (London)
  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: DEFAULT_ZOOM
  });

  // Safety timeout to reset isMapMoving if it gets stuck
  useEffect(() => {
    if (isMapMoving) {
      if (mapMovingTimeoutRef.current) {
        clearTimeout(mapMovingTimeoutRef.current);
      }
      mapMovingTimeoutRef.current = setTimeout(() => {
        console.warn('Map animation timeout - resetting isMapMoving');
        setIsMapMoving(false);
        isMapMovingRef.current = false;
      }, MAP_ANIMATION_TIMEOUT);
    }
    
    return () => {
      if (mapMovingTimeoutRef.current) {
        clearTimeout(mapMovingTimeoutRef.current);
      }
    };
  }, [isMapMoving]);

  const fitMapBounds = useCallback((bounds: Bounds) => {
    if (!mapRef.current) return;

    try {
        mapRef.current.getMap().stop();
    } catch (e) {
        // Ignore
    }

    if (isMapMovingRef.current) {
      return;
    }

    if (!bounds || !Number.isFinite(bounds.north) || !Number.isFinite(bounds.west)) {
      return;
    }

    const currentBounds = mapRef.current.getBounds();
    const ne = currentBounds.getNorthEast();
    const sw = currentBounds.getSouthWest();

    const isSame =
      Math.abs(ne.lat - bounds.north) < IDEMPOTENCY_EPSILON &&
      Math.abs(ne.lng - bounds.east) < IDEMPOTENCY_EPSILON &&
      Math.abs(sw.lat - bounds.south) < IDEMPOTENCY_EPSILON &&
      Math.abs(sw.lng - bounds.west) < IDEMPOTENCY_EPSILON;

    if (isSame) {
      return;
    }

    mapRef.current.fitBounds(
      [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north]
      ],
      { padding: { top: 80, bottom: 40, left: 40, right: 40 }, duration: FLY_TO_DURATION, maxZoom: 19 }
    );
  }, []);

  useEffect(() => {
    if (forcedBounds && isMapLoaded) {
      fitMapBounds(forcedBounds);
    }
  }, [forcedBounds, isMapLoaded, fitMapBounds]);

  useImperativeHandle(ref, () => ({
    flyTo: (center, zoom) => {
      mapRef.current?.getMap().stop();

      if (isMapMovingRef.current) {
        return;
      }

      if (mapRef.current) {
        const currentCenter = mapRef.current.getCenter();
        const currentZoom = mapRef.current.getZoom();
        const dist = Math.sqrt(
          Math.pow(currentCenter.lng - center.lng, 2) +
          Math.pow(currentCenter.lat - center.lat, 2)
        );
        const targetZoom = zoom || DEFAULT_FLY_TO_ZOOM;
        if (dist < IDEMPOTENCY_EPSILON && Math.abs(currentZoom - targetZoom) < 0.1) {
          return;
        }
      }

      mapRef.current?.flyTo({
        center: [center.lng, center.lat],
        zoom: zoom || DEFAULT_FLY_TO_ZOOM,
        duration: FLY_TO_DURATION
      });
    },
    fitBounds: fitMapBounds
  }), [fitMapBounds]);

  // Fetch internal buildings if no external buildings provided
  const { data: internalBuildings, isLoading: internalLoading, error: buildingsError } = useQuery({
    queryKey: ["discovery-buildings"],
    queryFn: async () => {
      try {
        return await findNearbyBuildingsRpc({
          lat: viewState.latitude,
          long: viewState.longitude,
          radius_meters: 500000, // 500km
          name_query: ""
        });
      } catch (error) {
        console.error('Error fetching nearby buildings:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !externalBuildings,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const buildings = externalBuildings || internalBuildings || [];
  const isLoading = externalBuildings ? false : internalLoading;

  // Validation logic
  const cleanBuildings = useMemo(() => {
    if (!buildings) {
        return [];
    }

    const cleaned = buildings.filter(b => {
      // MapItem handling
      if ('lat' in b) {
          const lat = Number((b as MapItem).lat);
          const lng = Number((b as MapItem).lng);
          if (isNaN(lat) || isNaN(lng)) return false;
          return isValidCoordinate(lat, lng);
      }

      // Legacy handling
      if (b.location_lat === null || b.location_lat === undefined) return false;
      if (b.location_lng === null || b.location_lng === undefined) return false;
      const lat = Number(b.location_lat);
      const lng = Number(b.location_lng);
      if (isNaN(lat) || isNaN(lng)) return false;
      return isValidCoordinate(lat, lng);
    });

    // Convert to Building type for internal use where possible
    // Note: Clusters won't map perfectly to Building, but we handle them in geoJsonData
    return cleaned;
  }, [buildings]);

  const candidates = useMemo(() => {
    // Candidates only exist in legacy format
    return (cleanBuildings as any[]).filter(b => !('is_cluster' in b) && b.isCandidate) || [];
  }, [cleanBuildings]);

  const checkCandidatesVisibility = useCallback((map: maplibregl.Map) => {
    if (!showSavedCandidates || candidates.length === 0) {
      setHasVisibleCandidates(true);
      return;
    }
    const bounds = map.getBounds();
    const isVisible = candidates.some((b: any) => bounds.contains([b.location_lng, b.location_lat]));
    setHasVisibleCandidates(isVisible);
  }, [candidates, showSavedCandidates]);

  useEffect(() => {
    if (mapRef.current) {
      checkCandidatesVisibility(mapRef.current.getMap());
    }
  }, [candidates, showSavedCandidates, checkCandidatesVisibility]);

  // Fetch user relationships
  const { data: userBuildingsMap, error: userBuildingsError } = useQuery({
    queryKey: ["user-buildings-map", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return new Map();
      try {
        return await fetchUserBuildingsMap(user.id);
      } catch (error) {
        console.error('Error fetching user buildings map:', error);
        throw error;
      }
    },
    retry: 2
  });

  // Prepare GeoJSON Source
  const geoJsonData = useMemo(() => {
    let isServerClustered = false;
    if (cleanBuildings.length > 0 && 'is_cluster' in cleanBuildings[0]) {
        isServerClustered = true;
    }

    const features = cleanBuildings.map((b: any) => {
        // Handle Server Side Clusters
        if ('is_cluster' in b) {
            const item = b as MapItem;
            if (item.is_cluster) {
                const clusterItem = item as ClusterPoint;
                 return {
                    type: 'Feature' as const,
                    properties: {
                        cluster: true,
                        point_count: clusterItem.count,
                        point_count_abbreviated: formatCount(clusterItem.count),
                        cluster_id: clusterItem.id
                    },
                    geometry: {
                        type: 'Point' as const,
                        coordinates: [clusterItem.lng, clusterItem.lat]
                    }
                };
            } else {
                const buildingItem = item as BuildingPoint;
                // Treat as building point
                const status = userBuildingsMap?.get(String(buildingItem.id));
                const isSelected = selectedPinId === String(buildingItem.id);
                const isHighlighted = highlightedId === String(buildingItem.id);
                const isDimmed = !isHighlighted && !isSelected; // Simple dimming logic, customize as needed

                // Pin Color Logic
                let pinColor = "#888888";
                if (status === 'visited') pinColor = "#4b5563";
                else if (status === 'pending') pinColor = "#EEFF41";

                return {
                    type: 'Feature' as const,
                    properties: {
                        cluster: false,
                        buildingId: String(buildingItem.id),
                        status,
                        color: pinColor,
                        isDimmed: false, // Defaulting false for now unless externalBuildings provides it
                        location_precision: 'exact',
                        isMarker: false,
                        name: buildingItem.name,
                        main_image_url: buildingItem.image_url
                    },
                    geometry: {
                        type: 'Point' as const,
                        coordinates: [buildingItem.lng, buildingItem.lat]
                    }
                };
            }
        }

        // Legacy Handling
        let [lng, lat] = [b.location_lng, b.location_lat];

        // Apply jitter for approximate locations
        if (b.location_precision === 'approximate') {
          [lng, lat] = getJitteredCoordinates(b.id, lat, lng);
        }

        const status = userBuildingsMap?.get(b.id);
        const isApproximate = b.location_precision === 'approximate';
        const isHighlighted = highlightedId === b.id;
        const isSelected = selectedPinId === b.id;
        const isDimmed = b.isDimmed && !isHighlighted && !isSelected;

        // Pin Protocol
        let pinColor = "#888888"; // Default Grey

        if (b.color) {
            pinColor = b.color;
        } else if (status === 'visited') {
            pinColor = "#4b5563"; // gray-600
        } else if (status === 'pending') {
            pinColor = "#EEFF41"; // Neon
        } else if (b.social_context) {
            pinColor = "#d1d5db"; // gray-300
        }

        return {
          type: 'Feature' as const,
          properties: {
            ...b,
            buildingId: b.id, // ensure buildingId is present
            status,
            color: pinColor,
            isDimmed,
            location_precision: b.location_precision,
            isMarker: b.isMarker
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat]
          }
        };
    });

    return {
        data: {
            type: 'FeatureCollection' as const,
            features
        },
        isServerClustered
    };
  }, [cleanBuildings, userBuildingsMap, highlightedId, selectedPinId, isSatellite]);

  // Handle Layer Click
  const onLayerClick = useCallback((event: MapLayerMouseEvent) => {
    event.originalEvent.stopPropagation();
    const feature = event.features?.[0];

    if (!feature) {
      if (selectedPinId) {
        setSelectedPinId(null);
      }
      return;
    }

    const clusterId = feature.properties?.cluster_id;

    if (clusterId && geoJsonData.isServerClustered) {
         // Server side cluster click - just zoom in
         const zoom = mapRef.current?.getZoom();
         if (zoom) {
            mapRef.current?.flyTo({
                center: (feature.geometry as any).coordinates,
                zoom: zoom + 2, // Hardcode zoom step for server clusters
                duration: 500
            });
         }
         setUserHasInteracted(true);
         onMapInteraction?.();
         return;
    }

    // Client side cluster id (numeric usually)
    const isClientCluster = feature.properties?.cluster;

    if (isClientCluster) {
        // Client Cluster Click
        const clusterId = feature.properties?.cluster_id; // Mapbox internal ID
        const mapboxSource = mapRef.current?.getMap().getSource('buildings') as maplibregl.GeoJSONSource;

        // Safety check if source is valid
        if (mapboxSource && mapboxSource.getClusterExpansionZoom) {
            mapboxSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err) return;
                mapRef.current?.flyTo({
                    center: (feature.geometry as any).coordinates,
                    zoom: zoom || DEFAULT_ZOOM + 2,
                    duration: 500
                });
            });
        }
        setUserHasInteracted(true);
        onMapInteraction?.();
    } else {
        // Point Click
        const buildingId = feature.properties?.buildingId;
        const isMarker = feature.properties?.isMarker;

        if (buildingId) {
            const isTouch = window.matchMedia('(pointer: coarse)').matches;
            const isPinSelected = selectedPinId === buildingId || highlightedId === buildingId;

            if (isTouch && !isPinSelected) {
                setSelectedPinId(buildingId);
                setUserHasInteracted(true);
                onMapInteraction?.();
                return;
            }

            if (isMarker) {
                setSelectedPinId(buildingId);
            }

            if (onMarkerClick) {
                onMarkerClick(buildingId);
            } else {
                const url = `/building/${buildingId}`;
                if (window.location) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            }
            setUserHasInteracted(true);
            onMapInteraction?.();
        }
    }
  }, [selectedPinId, highlightedId, onMarkerClick, onMapInteraction, geoJsonData.isServerClustered]);

  // Handle Mouse Events for Hover
  const onMouseEnter = useCallback((event: MapLayerMouseEvent) => {
      if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
      }
      const feature = event.features?.[0];
      if (feature && !feature.properties?.cluster) {
          const bId = feature.properties?.buildingId;
          const matchedBuilding = cleanBuildings.find((b: any) => String(b.id) === bId);
          if (matchedBuilding) {
              // Convert to Building if MapItem
              if ('lat' in matchedBuilding) {
                  setHoveredBuilding({
                    ...matchedBuilding,
                    buildingId: String(matchedBuilding.id),
                    location_lat: matchedBuilding.lat,
                    location_lng: matchedBuilding.lng
                  } as unknown as Building & { buildingId: string });
              } else {
                  setHoveredBuilding({ ...matchedBuilding, buildingId: matchedBuilding.id } as Building & { buildingId: string });
              }
          }
      }
      if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = 'pointer';
      }
  }, [cleanBuildings]);

  const onMouseLeave = useCallback(() => {
      if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
          setHoveredBuilding(null);
      }, 150); // Small delay to allow moving to tooltip

      if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = '';
      }
  }, []);

  // Effect to latch userHasInteracted if auto-zoom is disabled externally
  useEffect(() => {
    if (!autoZoomOnLowCount) {
      setUserHasInteracted(true);
    }
  }, [autoZoomOnLowCount]);

  // Effect to reset user interaction state when triggered externally
  useEffect(() => {
    if (resetInteractionTrigger !== undefined) {
      setUserHasInteracted(false);
    }
  }, [resetInteractionTrigger]);

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Handle Map Resize when fullscreen toggles
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      mapRef.current?.resize();
    }, RESIZE_DELAY);
    
    return () => clearTimeout(timeoutId);
  }, [isFullScreen]);

  // Cleanup fullscreen on unmount
  useEffect(() => {
    return () => {
      if (isFullScreen) {
        setIsFullScreen(false);
      }
    };
  }, []);

  // Sync selectedPinId if highlightedId changes
  useEffect(() => {
      if (highlightedId) {
          setSelectedPinId(highlightedId);
      }
  }, [highlightedId]);

  // Render Overlay Markers (Selected or Hovered)
  const overlayMarkers = useMemo(() => {
      const markers = [];

      const renderTooltipContent = (building: Building & { buildingId: string }, isInteractive: boolean) => {
          const status = userBuildingsMap?.get(building.buildingId);
          const imageUrl = getBuildingImageUrl(building.main_image_url);

          let pinTooltip = null;
          if (status === 'visited') pinTooltip = <span className="opacity-75 capitalize text-center">(Visited)</span>;
          else if (status === 'pending') pinTooltip = <span className="opacity-75 capitalize text-center">(Pending)</span>;
          else if (building.social_context) pinTooltip = <span className="opacity-90 text-center">({building.social_context})</span>;

          return (
            <div className={`flex flex-col items-center bg-[#333333] rounded shadow-lg border border-[#EEFF41] overflow-hidden ${isInteractive ? 'pointer-events-auto' : ''}`}>
              {showImages && imageUrl && (
                <div className="w-[200px] h-[200px]">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="text-[#EEFF41] text-xs px-2 py-1 flex flex-col items-center w-full justify-center bg-[#333333]">
                <span className="font-medium text-white text-center">{building.name || "Building"}</span>
                {pinTooltip}

                <div className="flex items-center gap-2 mt-1">
                  {onHide && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onHide(building.buildingId);
                      }}
                      className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[60]"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onSave && !building.isMarker && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSave(building.buildingId);
                      }}
                      className={`p-1 rounded-full transition-colors z-[60] ${status === 'pending' ? 'bg-[#EEFF41] text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${status === 'pending' ? 'fill-current' : ''}`} />
                    </button>
                  )}
                  {onVisit && !building.isMarker && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onVisit(building.buildingId);
                      }}
                      className={`p-1 rounded-full transition-colors z-[60] ${status === 'visited' ? 'bg-[#EEFF41] text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Candidate Actions */}
                  {building.isCandidate && (
                    <div className="flex items-center justify-center gap-2 mt-1">
                        {onHideCandidate && (
                        <button
                            onClick={(e) => {
                            e.stopPropagation();
                            onHideCandidate(building.buildingId);
                            }}
                            className="bg-white/10 text-white rounded-full p-1 hover:bg-white/20"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        )}
                        {onAddCandidate && (
                        <button
                            onClick={(e) => {
                            e.stopPropagation();
                            onAddCandidate(building as unknown as DiscoveryBuildingMapPin);
                            }}
                            className="bg-[#EEFF41] text-black rounded-full p-1 hover:bg-white"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        )}
                    </div>
                )}
                {!building.isCandidate && onRemoveItem && (
                    <button
                        onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(building.buildingId);
                        }}
                        className="mt-1 bg-green-500 text-white rounded-full p-1 hover:bg-green-600"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                )}
              </div>
            </div>
          );
      };

      // Selected Pin Marker
      if (selectedPinId) {
          const building = cleanBuildings.find((b: any) => String(b.id) === selectedPinId);
          if (building) {
              let lng, lat;
              if ('lat' in building) {
                  lat = building.lat;
                  lng = building.lng;
              } else {
                  lat = building.location_lat;
                  lng = building.location_lng;
                  if (building.location_precision === 'approximate') {
                      [lng, lat] = getJitteredCoordinates(building.id, lat, lng);
                  }
              }

              if (building.isMarker) {
                  markers.push(
                      <Marker
                          key={`selected-${building.id}`}
                          longitude={lng}
                          latitude={lat}
                          anchor="bottom"
                          onClick={(e) => e.originalEvent.stopPropagation()}
                      >
                          <div className="absolute bottom-full mb-2 z-50 cursor-default text-left">
                               <MarkerInfoCard
                                  marker={building as unknown as DiscoveryBuilding}
                                  onClose={() => {
                                      setSelectedPinId(null);
                                      onClosePopup?.();
                                  }}
                                  onUpdateNote={onUpdateMarkerNote}
                                  onDelete={onRemoveMarker}
                               />
                          </div>
                      </Marker>
                  );
              } else {
                  // Selected Candidate - Show Tooltip (allows interactions)
                   markers.push(
                      <Marker
                          key={`selected-candidate-${building.id}`}
                          longitude={lng}
                          latitude={lat}
                          anchor="bottom"
                          onClick={(e) => e.originalEvent.stopPropagation()}
                      >
                           <div className="absolute bottom-6 pb-2 flex flex-col items-center whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-200">
                                {renderTooltipContent({ ...building, buildingId: String(building.id) }, true)}
                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#EEFF41]"></div>
                           </div>
                      </Marker>
                   );
              }
          }
      }

      // Hovered Pin Marker (Tooltip with Actions) - Only if not selected
      if (hoveredBuilding && hoveredBuilding.buildingId !== selectedPinId) {
          const building = hoveredBuilding;
          let [lng, lat] = [building.location_lng, building.location_lat];
           if (building.location_precision === 'approximate') {
              [lng, lat] = getJitteredCoordinates(building.buildingId, lat, lng);
          }

          markers.push(
              <Marker
                  key={`hovered-${building.buildingId}`}
                  longitude={lng}
                  latitude={lat}
                  anchor="bottom"
                  style={{ pointerEvents: 'none' }} // Tooltip container shouldn't block map, but tooltip content should
              >
                  {/* Invisible container to hold tooltip */}
                  <div
                    className="relative flex flex-col items-center"
                    onMouseEnter={() => {
                        if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = null;
                        }
                    }}
                    onMouseLeave={() => {
                        if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                        }
                        hoverTimeoutRef.current = setTimeout(() => {
                            setHoveredBuilding(null);
                        }, 150);
                    }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-6 pb-2 flex flex-col items-center whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
                        {renderTooltipContent(building, true)}
                         <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#EEFF41]"></div>
                    </div>
                  </div>
              </Marker>
          );
      }

      return markers;
  }, [selectedPinId, hoveredBuilding, cleanBuildings, userBuildingsMap, onUpdateMarkerNote, onRemoveMarker, onClosePopup, showImages, onHide, onSave, onVisit, onHideCandidate, onAddCandidate, onRemoveItem]);

  // Error state display
  if (buildingsError) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[50vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Failed to load buildings. Retrying...
        </p>
      </div>
    );
  }

  if (userBuildingsError) {
    console.warn("[BuildingDiscoveryMap] Failed to load user data, proceeding without it.", userBuildingsError);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleMapUpdate = useCallback((map: maplibregl.Map) => {
    const bounds = map.getBounds();
    onBoundsChange?.({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    });
    checkCandidatesVisibility(map);
  }, [onBoundsChange, checkCandidatesVisibility]);

  const mapContent = (
    <div
      className={`w-full overflow-hidden border border-white/10 transition-all duration-300 bg-background ${
        isFullScreen
          ? 'fixed inset-0 z-[5000] h-[100dvh] rounded-none m-0 p-0'
          : 'relative h-full rounded-xl'
      }`}
      data-zoom={viewState.zoom}
      data-testid="map-container"
    >
      <MapGL
        ref={mapRef}
        onError={(e) => {
          console.group("💥 MAP ERROR");
          console.error("Error:", e.error);
          console.log("Current ViewState:", viewState);
          console.trace("Stack trace");
          console.groupEnd();

          const errMsg = e.error?.message || "";
          if (errMsg.toLowerCase().includes("style") || 
              errMsg.toLowerCase().includes("load") || 
              errMsg.toLowerCase().includes("evaluate")) {
            console.warn("⚠️ Map style error. Switching to Satellite fallback.");
            setMapStyleError(true);
            if (!isSatellite) {
              setIsSatellite(true);
            }
          }
        }}
        {...viewState}
        attributionControl={false}
        onMove={evt => {
          setViewState(evt.viewState);
          if (evt.originalEvent) {
            setUserHasInteracted(true);
            onMapInteraction?.();
          }
        }}
        onDragStart={() => {
          setUserHasInteracted(true);
          onMapInteraction?.();
        }}
        onMoveStart={(evt) => {
          setIsMapMoving(true);
          isMapMovingRef.current = true;
          if (evt.originalEvent) {
            setUserHasInteracted(true);
            onMapInteraction?.();
          }
        }}
        onLoad={evt => {
          setIsMapLoaded(true);
          handleMapUpdate(evt.target);
          onMapLoad?.();
        }}
        onMoveEnd={evt => {
          setIsMapMoving(false);
          isMapMovingRef.current = false;
          const { latitude, longitude, zoom } = evt.viewState;

          onRegionChange?.({ lat: latitude, lng: longitude, zoom });
          handleMapUpdate(evt.target);
        }}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
        mapStyle={isSatellite ? SATELLITE_STYLE : DEFAULT_MAP_STYLE}
        interactiveLayerIds={['clusters', 'cluster-count', 'unclustered-point']}
        onClick={onLayerClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <NavigationControl position="bottom-right" />

        <Source
            id="buildings"
            type="geojson"
            data={geoJsonData.data}
            cluster={!geoJsonData.isServerClustered}
            clusterMaxZoom={CLUSTER_MAX_ZOOM}
            clusterRadius={50}
        >
            <Layer {...clusterLayer} />
            <Layer {...clusterCountLayer} />
            <Layer {...unclusteredPointLayer} />
        </Source>

        {overlayMarkers}
      </MapGL>

      {showSavedCandidates && candidates.length > 0 && !hasVisibleCandidates && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur px-4 py-2 rounded-full shadow-md text-sm z-10 text-center pointer-events-none border animate-in fade-in slide-in-from-top-2">
          No saved places in this area. Zoom out to find them.
        </div>
      )}

      {mapStyleError && !isSatellite && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 backdrop-blur px-4 py-2 rounded-full shadow-md text-sm z-10 text-center text-white border border-red-700">
          Map style error. Try satellite view.
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          setUserHasInteracted(true);
          onMapInteraction?.();
          setIsSatellite(!isSatellite);
          if (mapStyleError && !isSatellite) {
            setMapStyleError(false);
          }
        }}
        className="absolute top-2 left-2 p-2 bg-background/90 backdrop-blur rounded-md border shadow-sm hover:bg-muted transition-colors z-10 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary"
        title={isSatellite ? "Show Map" : "Show Satellite"}
        aria-label={isSatellite ? "Show Map" : "Show Satellite"}
      >
        <Layers className="w-4 h-4" />
        <span className="text-xs font-medium">{isSatellite ? "Map" : "Satellite"}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setUserHasInteracted(true);
          onMapInteraction?.();
          setIsFullScreen(!isFullScreen);
        }}
        className="absolute top-2 right-2 p-2 bg-background/90 backdrop-blur rounded-md border shadow-sm hover:bg-muted transition-colors z-10 focus-visible:ring-2 focus-visible:ring-primary"
        title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        aria-label={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
    </div>
  );

  if (isFullScreen) {
    return createPortal(mapContent, document.body);
  }

  return mapContent;
});

BuildingDiscoveryMap.displayName = "BuildingDiscoveryMap";
