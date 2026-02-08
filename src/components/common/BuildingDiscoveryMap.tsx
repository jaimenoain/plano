import { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { createPortal } from "react-dom";
import MapGL, { Marker, NavigationControl, MapRef, Source, Layer, LayerProps } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Layers, Maximize2, Minimize2, Plus, Check, EyeOff, Bookmark, CheckSquare, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/use-debounce";
import { DiscoveryBuilding } from "@/features/search/components/types";
import { CollectionMarkerCategory } from "@/types/collection";
import { MarkerInfoCard } from "../collections/MarkerInfoCard";
import { findNearbyBuildingsRpc, fetchUserBuildingsMap } from "@/utils/supabaseFallback";
import { getBuildingImageUrl } from "@/utils/image";
import { Bounds } from "@/utils/map";

// Constants
const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const JITTER_MULTIPLIER = 0.005;
const CLUSTER_RADIUS = 30;
const CLUSTER_MAX_ZOOM = 14;
const APPROXIMATE_MIN_ZOOM = 15;
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
export interface BuildingDiscoveryMapRef {
  flyTo: (center: { lat: number, lng: number }, zoom?: number) => void;
  fitBounds: (bounds: Bounds) => void;
}

interface BuildingDiscoveryMapProps {
  externalBuildings?: DiscoveryBuilding[];
  onAddCandidate?: (building: DiscoveryBuilding) => void;
  onRegionChange?: (center: { lat: number, lng: number }) => void;
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
    'circle-color': [
      'case',
      ['==', ['get', 'dimmed_count'], ['get', 'point_count']],
      '#9ca3af', // gray-400 (dimmed)
      '#EEFF41'  // Default primary (neon)
    ],
    'circle-radius': 20,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff'
  }
};

const clusterCountLayer: LayerProps = {
  id: 'cluster-count',
  type: 'symbol',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12
  },
  paint: {
    'text-color': [
        'case',
        ['==', ['get', 'dimmed_count'], ['get', 'point_count']],
        '#ffffff', // text-white for dimmed
        '#000000'  // text-black for primary (neon background)
    ]
  }
};

const unclusteredPointLayer: LayerProps = {
  id: 'unclustered-point',
  type: 'circle',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': [
      'case',
      ['boolean', ['get', 'isDimmed'], false],
      '#f3f4f6', // gray-100 (dimmed fill)
      ['match', ['get', 'status'],
        'visited', '#4b5563', // gray-600
        'pending', '#EEFF41', // Neon
        // default (discovery)
        '#ffffff' // fill-background (white)
      ]
    ],
    'circle-radius': [
      'case',
      ['boolean', ['get', 'isDimmed'], false],
      6,
      8
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': [
      'case',
      ['boolean', ['get', 'isDimmed'], false],
      '#9ca3af', // gray-400
      ['match', ['get', 'status'],
        'visited', '#4b5563', // gray-600
        'pending', '#6b7280', // gray-500
        // default
        '#6b7280' // gray-500
      ]
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
  forcedBounds
}, ref) => {
  const { user } = useAuth();
  const mapRef = useRef<MapRef>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [hasVisibleCandidates, setHasVisibleCandidates] = useState(true);
  const [mapStyleError, setMapStyleError] = useState(false);

  // State to track user interaction to disable auto-zoom
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const mapMovingTimeoutRef = useRef<NodeJS.Timeout>();

  // Default view state (London)
  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: DEFAULT_ZOOM
  });

  const debouncedViewState = useDebounce(viewState, 500);

  // Track initial fit to prevent loops
  const hasInitialFitRef = useRef(false);

  // Safety timeout to reset isMapMoving if it gets stuck
  useEffect(() => {
    if (isMapMoving) {
      if (mapMovingTimeoutRef.current) {
        clearTimeout(mapMovingTimeoutRef.current);
      }
      mapMovingTimeoutRef.current = setTimeout(() => {
        console.warn('Map animation timeout - resetting isMapMoving');
        setIsMapMoving(false);
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

    // Stop any current movement before fitting bounds
    try {
        mapRef.current.getMap().stop();
    } catch (e) {
        // Ignore
    }

    if (isMapMoving) {
      return;
    }

    if (!bounds || !Number.isFinite(bounds.north) || !Number.isFinite(bounds.west)) {
      return;
    }

    // Idempotency Check
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
  }, [isMapMoving]);

  // Handle forced bounds updates
  useEffect(() => {
    if (forcedBounds && isMapLoaded) {
      fitMapBounds(forcedBounds);
    }
  }, [forcedBounds, isMapLoaded, fitMapBounds]);

  useImperativeHandle(ref, () => ({
    flyTo: (center, zoom) => {
      // Stop any current movement before flying
      mapRef.current?.getMap().stop();

      if (isMapMoving) {
        return;
      }

      // Idempotency check
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
  }), [isMapMoving, fitMapBounds]);

  // Fetch internal buildings if no external buildings provided
  const { data: internalBuildings, isLoading: internalLoading, error: buildingsError } = useQuery({
    queryKey: ["discovery-buildings", debouncedViewState.latitude, debouncedViewState.longitude],
    queryFn: async () => {
      try {
        return await findNearbyBuildingsRpc({
          lat: debouncedViewState.latitude,
          long: debouncedViewState.longitude,
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

  // Validation logic with improved coordinate checking
  const cleanBuildings = useMemo(() => {
    if (!buildings) return [];

    return buildings.filter(b => {
      // Reject invalid primitives immediately
      if (b.location_lat === null || b.location_lat === undefined) {
        return false;
      }
      if (b.location_lng === null || b.location_lng === undefined) {
        return false;
      }

      // Reject invalid numbers (NaN)
      const lat = Number(b.location_lat);
      const lng = Number(b.location_lng);
      if (isNaN(lat) || isNaN(lng)) {
        return false;
      }

      // Use centralized validation function
      return isValidCoordinate(lat, lng);
    });
  }, [buildings]);

  const candidates = useMemo(() => cleanBuildings?.filter(b => b.isCandidate) || [], [cleanBuildings]);

  const checkCandidatesVisibility = useCallback((map: maplibregl.Map) => {
    if (!showSavedCandidates || candidates.length === 0) {
      setHasVisibleCandidates(true);
      return;
    }
    const bounds = map.getBounds();
    const isVisible = candidates.some(b => bounds.contains([b.location_lng, b.location_lat]));
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

  // Prepare GeoJSON data
  const points = useMemo(() => {
    const features = cleanBuildings.map(b => {
      let [lng, lat] = [b.location_lng, b.location_lat];

      // Apply jitter for approximate locations
      if (b.location_precision === 'approximate') {
        [lng, lat] = getJitteredCoordinates(b.id, lat, lng);
      }

      const status = userBuildingsMap?.get(b.id) || null;

      // Sanitize properties for safety
      const safeProps: Record<string, any> = {
          status,
          isDimmed: b.isDimmed ? true : false,
          isMarker: b.isMarker ? true : false,
          location_precision: b.location_precision || 'exact',
          // Add numeric props for potential clustering aggregation/filters
          dimmed_count: b.isDimmed ? 1 : 0
      };

      const numericKeys = ['year_completed', 'year', 'distance', 'social_score', 'rating', 'short_id'];

      Object.keys(b).forEach(key => {
        const val = (b as any)[key];
        if (key !== 'id' && !safeProps.hasOwnProperty(key)) { // don't overwrite
            if (val === null || val === undefined) {
                if (numericKeys.includes(key)) {
                    safeProps[key] = 0;
                } else {
                    safeProps[key] = "";
                }
            } else {
                safeProps[key] = val;
            }
        }
      });

      safeProps.id = String(b.id);
      safeProps.buildingId = String(b.id);

      return {
        type: 'Feature' as const,
        properties: safeProps,
        geometry: {
          type: 'Point' as const,
          coordinates: [lng, lat]
        }
      };
    });

    return {
        type: "FeatureCollection",
        features
    };
  }, [cleanBuildings, userBuildingsMap]);

  // Selected building logic
  const selectedBuilding = useMemo(() => {
      if (!selectedPinId) return null;
      return cleanBuildings.find(b => b.id === selectedPinId);
  }, [cleanBuildings, selectedPinId]);

  // Tooltip Logic
  const renderTooltip = () => {
    if (!selectedBuilding) return null;

    if (selectedBuilding.isMarker) {
        // Custom User Marker
        return (
            <div
                className="absolute bottom-full mb-2 z-50 cursor-default text-left"
                onClick={e => e.stopPropagation()}
            >
                <MarkerInfoCard
                    marker={selectedBuilding as unknown as DiscoveryBuilding}
                    onClose={() => {
                        setSelectedPinId(null);
                        onClosePopup?.();
                    }}
                    onUpdateNote={onUpdateMarkerNote}
                    onDelete={onRemoveMarker}
                />
            </div>
        );
    }

    // Discovery Building Tooltip
    const imageUrl = getBuildingImageUrl(selectedBuilding.main_image_url);
    const status = userBuildingsMap?.get(selectedBuilding.id);
    let pinTooltip = null;
    if (status === 'visited') {
        pinTooltip = <span className="opacity-75 capitalize text-center">(Visited)</span>;
    } else if (status === 'pending') {
        pinTooltip = <span className="opacity-75 capitalize text-center">(Pending)</span>;
    } else if (selectedBuilding.social_context) {
        pinTooltip = <span className="opacity-90 text-center">({selectedBuilding.social_context})</span>;
    }

    return (
        <div
            data-testid="building-tooltip"
            className="absolute bottom-full pb-2 flex flex-col items-center whitespace-nowrap z-50"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex flex-col items-center bg-[#333333] rounded shadow-lg border border-[#EEFF41] overflow-hidden">
                {showImages && imageUrl && (
                <div className="w-[200px] h-[200px]">
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                )}
                <div className="text-[#EEFF41] text-xs px-2 py-1 flex flex-col items-center w-full justify-center bg-[#333333]">
                <span className="font-medium text-white text-center">{selectedBuilding.name}</span>
                {pinTooltip}

                <div className="flex items-center gap-2 mt-1">
                    {onHide && (
                    <button
                        onClick={(e) => {
                        e.stopPropagation();
                        onHide(selectedBuilding.id);
                        }}
                        className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[60] focus-visible:ring-2 focus-visible:ring-white"
                        title="Hide"
                        aria-label="Hide building"
                    >
                        <EyeOff className="w-3.5 h-3.5" />
                    </button>
                    )}
                    {onSave && !selectedBuilding.isMarker && (
                    <button
                        onClick={(e) => {
                        e.stopPropagation();
                        onSave(selectedBuilding.id);
                        }}
                        className={`p-1 rounded-full transition-colors z-[60] focus-visible:ring-2 focus-visible:ring-white ${status === 'pending' ? 'bg-[#EEFF41] text-black hover:bg-[#EEFF41]/80' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        title="Save"
                        aria-label="Save building"
                    >
                        <Bookmark className={`w-3.5 h-3.5 ${status === 'pending' ? 'fill-current' : ''}`} />
                    </button>
                    )}
                    {onVisit && !selectedBuilding.isMarker && (
                    <button
                        onClick={(e) => {
                        e.stopPropagation();
                        onVisit(selectedBuilding.id);
                        }}
                        className={`p-1 rounded-full transition-colors z-[60] focus-visible:ring-2 focus-visible:ring-white ${status === 'visited' ? 'bg-[#EEFF41] text-black hover:bg-[#EEFF41]/80' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        title="Mark as Visited"
                        aria-label="Mark as visited"
                    >
                        <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                    )}
                </div>

                {selectedBuilding.isCandidate && (
                    <div className="flex items-center justify-center gap-2 mt-1">
                    {onHideCandidate && (
                        <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onHideCandidate(selectedBuilding.id);
                        }}
                        className="bg-white/10 text-white rounded-full p-1 hover:bg-white/20 transition-colors z-[60] focus-visible:ring-2 focus-visible:ring-white"
                        title="Hide suggestion"
                        aria-label="Hide suggestion"
                    >
                        <X className="w-4 h-4" />
                        </button>
                    )}
                    {onAddCandidate && (
                        <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddCandidate(selectedBuilding as unknown as DiscoveryBuilding);
                        }}
                        className="bg-[#EEFF41] text-black rounded-full p-1 hover:bg-white transition-colors z-[60] focus-visible:ring-2 focus-visible:ring-white"
                        title="Add to map"
                        aria-label="Add to map"
                    >
                        <Plus className="w-4 h-4" />
                        </button>
                    )}
                    </div>
                )}
                {!selectedBuilding.isCandidate && onRemoveItem && (
                    <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(selectedBuilding.id);
                    }}
                    className="mt-1 bg-green-500 text-white rounded-full p-1 hover:bg-green-600 transition-colors z-[60] focus-visible:ring-2 focus-visible:ring-white"
                    title="Remove from map"
                    aria-label="Remove from map"
                    >
                    <Check className="w-4 h-4" />
                    </button>
                )}
                </div>
            </div>
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#EEFF41]"></div>
        </div>
    );
  };

  // Error state display
  if (buildingsError || userBuildingsError) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[50vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {buildingsError ? 'Failed to load buildings. Retrying...' : 'Failed to load user data. Retrying...'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
        onClick={() => {
          if (selectedPinId) {
            setSelectedPinId(null);
          }
        }}
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
          if (evt.originalEvent) {
            setUserHasInteracted(true);
            onMapInteraction?.();
          }
        }}
        onLoad={evt => {
          setIsMapLoaded(true);
          handleMapUpdate(evt.target);
        }}
        onMoveEnd={evt => {
          setIsMapMoving(false);
          const { latitude, longitude } = evt.viewState;

          onRegionChange?.({ lat: latitude, lng: longitude });
          handleMapUpdate(evt.target);
        }}
        interactiveLayerIds={['clusters', 'unclustered-point']}
        onMouseEnter={(e) => {
            // Change cursor to pointer
            if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
        }}
        onMouseLeave={() => {
            if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
        }}
        onClick={(e) => {
             const feature = e.features?.[0];
             if (!feature) return;

             const clusterId = feature.properties?.cluster_id;

             if (feature.layer.id === 'clusters') {
                 const mapboxSource = mapRef.current?.getMap().getSource('buildings') as maplibregl.GeoJSONSource;

                 mapboxSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
                     if (err) return;

                     mapRef.current?.flyTo({
                         center: (feature.geometry as any).coordinates,
                         zoom: zoom || DEFAULT_ZOOM,
                         duration: 500
                     });
                 });

                 setUserHasInteracted(true);
                 onMapInteraction?.();
                 e.originalEvent.stopPropagation();
             } else if (feature.layer.id === 'unclustered-point') {
                 const buildingId = feature.properties?.buildingId;
                 setSelectedPinId(buildingId);

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
                 e.originalEvent.stopPropagation();
             }
        }}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
        mapStyle={isSatellite ? SATELLITE_STYLE : DEFAULT_MAP_STYLE}
      >
        <NavigationControl position="bottom-right" />

        <Source
            id="buildings"
            type="geojson"
            data={points as any} // Cast because TS sometimes complains about FeatureCollection strictness
            cluster={true}
            clusterMaxZoom={CLUSTER_MAX_ZOOM}
            clusterRadius={CLUSTER_RADIUS}
            clusterProperties={{
                dimmed_count: ['+', ['case', ['boolean', ['get', 'isDimmed'], false], 1, 0]]
            }}
        >
            <Layer {...clusterLayer} />
            <Layer {...clusterCountLayer} />
            <Layer {...unclusteredPointLayer} />
        </Source>

        {/* Selected Building Marker (Interactive Overlay) */}
        {selectedBuilding && (
            <Marker
                longitude={selectedBuilding.location_lng}
                latitude={selectedBuilding.location_lat}
                anchor="bottom"
            >
                {renderTooltip()}
                {/* Visual anchor for the popup */}
                <div className="w-2 h-2 bg-transparent" />
            </Marker>
        )}

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
