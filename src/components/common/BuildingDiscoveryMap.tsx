import { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import MapGL, { Marker, NavigationControl, MapRef } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Layers, Maximize2, Minimize2, Plus, Check, EyeOff, Bookmark, CheckSquare, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DiscoveryBuilding } from "@/features/search/components/types";
import { CollectionMarkerCategory } from "@/types/collection";
import { MarkerInfoCard } from "../collections/MarkerInfoCard";
import { MarkerPin } from "./MarkerPin";
import { findNearbyBuildingsRpc, fetchUserBuildingsMap } from "@/utils/supabaseFallback";
import { getBuildingImageUrl } from "@/utils/image";
import { Bounds, getBoundsFromBuildings } from "@/utils/map";
import Supercluster from "supercluster";

const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

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

interface Building {
  id: string;
  name: string;
  location_lat: number;
  location_lng: number;
  social_context?: string | null;
  location_precision?: 'exact' | 'approximate';
  main_image_url?: string | null;
  color?: string | null;
  isCandidate?: boolean;
  isDimmed?: boolean;
  isMarker?: boolean;
  markerCategory?: CollectionMarkerCategory;
  notes?: string | null;
  address?: string | null;
}

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
}

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
  showSavedCandidates
}, ref) => {
  const { user } = useAuth();
  const mapRef = useRef<MapRef>(null);
  const [mapInstance, setMapInstance] = useState<MapRef | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [hasVisibleCandidates, setHasVisibleCandidates] = useState(true);

  // State to track user interaction to disable auto-zoom
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);

  // Default view state (London)
  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 12
  });

  // Track initial fit to prevent loops
  const hasInitialFitRef = useRef(false);

  useImperativeHandle(ref, () => ({
      flyTo: (center, zoom) => {
          // --- GATEKEEPER ---
          const type = "flyTo";
          const payload = { center, zoom };
          console.log("🚨 GATEKEEPER: Request received via " + type, payload);
          const isPoison = (val: any) => val === null || val === undefined || Number.isNaN(Number(val)) || val === Infinity || val === -Infinity;
          if (isPoison(center?.lat) || isPoison(center?.lng) || isPoison(zoom)) {
               console.trace("🕵️‍♂️ WHO CALLED ME WITH POISON?");
          }
          // ------------------

          if (isMapMoving) return;
          mapRef.current?.flyTo({
              center: [center.lng, center.lat],
              zoom: zoom || 13,
              duration: 1500
          });
      },
      fitBounds: (bounds) => {
          // --- GATEKEEPER ---
          const type = "fitBounds";
          const payload = { bounds };
          console.log("🚨 GATEKEEPER: Request received via " + type, payload);
          const isPoison = (val: any) => val === null || val === undefined || Number.isNaN(Number(val)) || val === Infinity || val === -Infinity;
          if (
               !bounds ||
               isPoison(bounds.north) || isPoison(bounds.south) || isPoison(bounds.east) || isPoison(bounds.west)
          ) {
               console.trace("🕵️‍♂️ WHO CALLED ME WITH POISON?");
          }
          // ------------------

          if (isMapMoving) return;
          if (!bounds || !Number.isFinite(bounds.north) || !Number.isFinite(bounds.west)) return;
          mapRef.current?.fitBounds(
              [
                  [bounds.west, bounds.south],
                  [bounds.east, bounds.north]
              ],
              { padding: { top: 80, bottom: 40, left: 40, right: 40 }, duration: 1500, maxZoom: 19 }
           );
      }
  }), [isMapMoving]);

  const { data: internalBuildings, isLoading: internalLoading } = useQuery({
    queryKey: ["discovery-buildings"],
    queryFn: async () => {
      return await findNearbyBuildingsRpc({
        lat: viewState.latitude,
        long: viewState.longitude,
        radius_meters: 500000, // 500km
        name_query: ""
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !externalBuildings // Disable if external data provided
  });

  const buildings = externalBuildings || internalBuildings || [];
  const isLoading = externalBuildings ? false : internalLoading;

  // 1. THE FIREWALL - PARANOID VALIDATION
  const cleanBuildings = useMemo(() => {
    if (!buildings) return [];
    const valid = buildings.filter(b => {
      // REJECT invalid primitives immediately
      if (b.location_lat === null || b.location_lat === undefined) return false;
      if (b.location_lng === null || b.location_lng === undefined) return false;

      // REJECT invalid numbers (NaN)
      const lat = Number(b.location_lat);
      const lng = Number(b.location_lng);
      if (isNaN(lat) || isNaN(lng)) return false;

      // REJECT Null Island (0,0) specifically
      if (Math.abs(lat) < 0.00001 && Math.abs(lng) < 0.00001) return false;

      return true;
    });
    console.log(`🛡️ FINAL GUARD: Input ${buildings.length} -> Output ${valid.length}`);
    return valid;
  }, [buildings]);

  // --- DATA INTEGRITY GUARD ---
  useEffect(() => {
    // Only calculate bounds for valid buildings to avoid polluting stats with bad data
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

    cleanBuildings.forEach(b => {
        const lat = b.location_lat;
        const lng = b.location_lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
    });

    const blockedCount = buildings.length - cleanBuildings.length;

    if (buildings.length > 0) {
      console.log("📊 Data Integrity Report:", {
        totalBuildings: buildings.length,
        cleanBuildings: cleanBuildings.length,
        blockedCount,
        validBounds: { minLat, maxLat, minLng, maxLng }
      });
      console.log("🛡️ PARANOID FILTER: Keeping " + cleanBuildings.length + " of " + buildings.length);

      if (blockedCount > 0) {
        console.warn(`⚠️ FIREWALL: Blocked ${blockedCount} toxic buildings from rendering`);
      }
    }
  }, [buildings, cleanBuildings]);

  // --- FORENSIC: SCHEMA DETECTIVE ---
  useEffect(() => {
    if (buildings.length > 0) {
      console.groupCollapsed("🔬 FORENSIC REPORT: Schema Detective");
      const first = buildings[0];
      console.log("🕵️‍♂️ First Building Keys:", Object.keys(first));
      console.log("cx First Building Sample:", first);

      buildings.forEach((b, i) => {
         // Deep scan for loose types or alternative keys
         const anyB = b as any;
         const lat = anyB.location_lat ?? anyB.lat ?? anyB.latitude;
         const lng = anyB.location_lng ?? anyB.lng ?? anyB.longitude;

         const isPoison =
            lat === null || lat === undefined || Number.isNaN(Number(lat)) || Number(lat) === 0 || typeof lat === 'string' ||
            lng === null || lng === undefined || Number.isNaN(Number(lng)) || Number(lng) === 0 || typeof lng === 'string';

         if (isPoison) {
             console.warn(`⚠️ POISON DATA FOUND at Index ${i}: ID=${b.id}`, {
                 keys: Object.keys(b),
                 rawLat: lat,
                 rawLng: lng,
                 valLat: b.location_lat,
                 valLng: b.location_lng
             });
         }
      });
      console.groupEnd();
    }
  }, [buildings]);

  // --- FORENSIC: EXTERNAL DATA WATCHER ---
  useEffect(() => {
    if (externalBuildings && externalBuildings.length > 0) {
       console.log(`📦 PROP UPDATE: Received ${externalBuildings?.length} buildings from parent.`);
       if (externalBuildings.length > 0) {
          console.log("Sample of first 5 buildings:", externalBuildings.slice(0, 5));
       }
    }
  }, [externalBuildings]);

  // --- FORENSIC: STATE STALKER ---
  useEffect(() => {
    if (!viewState) return;

    const { latitude, longitude, zoom } = viewState;

    // Only log if meaningful change or anomaly
    // Source check
    const source = userHasInteracted ? "User Interaction" : (isMapMoving ? "Programmatic Move" : "Unknown/Init");

    // Anomaly Check
    if (Math.abs(latitude) < 0.001 && Math.abs(longitude) < 0.001) {
        console.groupCollapsed("🔬 FORENSIC REPORT: State Stalker (ANOMALY)");
        console.error(`🚨 ANOMALY: Camera dragged to Null Island! (${latitude}, ${longitude})`);
        console.log(`🎥 Camera Update [${source}]:`, { latitude, longitude, zoom });
        console.groupEnd();
    } else {
        // Standard logging for verbose debugging
        console.groupCollapsed("🔬 FORENSIC REPORT: State Stalker");
        console.log(`🎥 Camera Update [${source}]:`, { latitude, longitude, zoom });
        console.groupEnd();
    }

    // Invalid Check
    const isInvalid = (val: number | null | undefined) => val === null || val === undefined || Number.isNaN(val);
    if (isInvalid(latitude) || isInvalid(longitude) || isInvalid(zoom)) {
      console.error("🔥 CRITICAL: ViewState has invalid values!", viewState);
    }
  }, [viewState, userHasInteracted, isMapMoving]);
  // ---------------------------

  const candidates = useMemo(() => cleanBuildings?.filter(b => b.isCandidate) || [], [cleanBuildings]);

  const checkCandidatesVisibility = (map: maplibregl.Map) => {
    if (!showSavedCandidates || candidates.length === 0) {
      setHasVisibleCandidates(true);
      return;
    }
    const bounds = map.getBounds();
    const isVisible = candidates.some(b => bounds.contains([b.location_lng, b.location_lat]));
    setHasVisibleCandidates(isVisible);
  };

  useEffect(() => {
    if (mapRef.current) {
      checkCandidatesVisibility(mapRef.current.getMap());
    }
  }, [candidates, showSavedCandidates]);

  // Fetch user relationships
  const { data: userBuildingsMap } = useQuery({
    queryKey: ["user-buildings-map", user?.id],
    enabled: !!user,
    queryFn: async () => {
        if (!user) return new Map();
        return await fetchUserBuildingsMap(user.id);
    }
  });

  // Clustering logic
  const supercluster = useMemo(() => {
    return new Supercluster({
      radius: 30,
      maxZoom: 14 // Reduced maxZoom to break clusters earlier for approximate locations
    });
  }, []);

  // DEBUG: Data Interrogator
  useEffect(() => {
    if (!buildings) return;
    console.log("🕵️‍♂️ DATA INTERROGATOR STARTED: Scanning " + buildings.length + " buildings...");
    let badCount = 0;
    buildings.forEach((b, i) => {
      const lat = b.location_lat;
      const lng = b.location_lng;
      const isSuspicious =
        lat === null || lat === undefined ||
        lng === null || lng === undefined ||
        typeof lat !== 'number' || typeof lng !== 'number' ||
        isNaN(lat) || isNaN(lng) ||
        (Math.abs(Number(lat)) < 0.0001 && Math.abs(Number(lng)) < 0.0001);

      if (isSuspicious || i < 3) { // Log the first 3 for schema verification + any errors
        console.warn(
          `🔎 Row ${i} [${b.id}]: Name="${b.name}"`,
          `\n   Lat: ${lat} (Type: ${typeof lat})`,
          `\n   Lng: ${lng} (Type: ${typeof lng})`,
          `\n   Suspicious? ${isSuspicious ? 'YES 🚨' : 'No'}`
        );
        if (isSuspicious) badCount++;
      }
    });
    console.log(`🕵️‍♂️ DATA INTERROGATOR FINISHED. Found ${badCount} suspicious records.`);
  }, [buildings]);

  // --- FORENSIC: CHECKPOINT A ---
  useEffect(() => {
    let count = 0;
    buildings.forEach(b => {
      if (
        b.location_lat === null || b.location_lat === undefined ||
        b.location_lat === 0 ||
        isNaN(Number(b.location_lat))
      ) {
        count++;
      }
    });
    console.log(`🔍 CHECKPOINT A (Input): Total=${buildings.length}, Invalid=${count}`);
  }, [buildings]);

  const points = useMemo(() => cleanBuildings.map(b => {
    let [lng, lat] = [b.location_lng, b.location_lat];

    // Jitter logic for approximate locations to prevent perfect stacking
    if (b.location_precision === 'approximate') {
        let hash = 0;
        const seed = b.id;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
        }

        // ~200-300m spread to ensure visual separation
        // (0.001 deg is approx 111m lat / 70m lng in London)
        // Multiplier 0.005 provides enough spread to be distinct at zoom 14-15
        const latOffset = (((hash % 1000) / 1000) - 0.5) * 0.005;
        const lngOffset = ((((hash * 17) % 1000) / 1000) - 0.5) * 0.005;

        lng += lngOffset;
        lat += latOffset;
    }

    const coords = [lng, lat];
    if (coords[0] === null || coords[1] === null) console.error("💀 FATAL: Null coordinate generated for point:", b.id);

    // --- FORENSIC: CHECKPOINT B ---
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.error("🚨 CHECKPOINT B FAILURE: Generated NaN/Null coordinate!", {
            id: b.id,
            original: { lat: b.location_lat, lng: b.location_lng },
            calculated: { lat, lng },
            precision: b.location_precision
        });
    }

    return {
        type: 'Feature' as const,
        properties: { cluster: false, buildingId: b.id, ...b },
        geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat]
        }
    };
  }) || [], [cleanBuildings]);

  const [clusters, setClusters] = useState<any[]>([]);
  const viewStateRef = useRef(viewState);
  viewStateRef.current = viewState;

  const updateClusters = useMemo(() => {
    return () => {
        if (!mapRef.current) {
             return;
        }
        const bounds = mapRef.current.getBounds();
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as [number, number, number, number];
        const zoom = viewStateRef.current.zoom;
        const newClusters = supercluster.getClusters(bbox, Math.round(zoom));

        setClusters(newClusters);
    };
  }, [supercluster]);

  useEffect(() => {
    supercluster.load(points);
    updateClusters();
  }, [points, supercluster, updateClusters]);

  // Update clusters on map move
  useEffect(() => {
    updateClusters();
  }, [viewState, updateClusters]);

  // Effect to latch userHasInteracted if auto-zoom is disabled externally (e.g. via search/filter)
  useEffect(() => {
    if (!autoZoomOnLowCount) {
      setUserHasInteracted(true);
    }
  }, [autoZoomOnLowCount]);

  // Effect to reset user interaction state when triggered externally (e.g. on new search)
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
    setTimeout(() => {
        mapRef.current?.resize();
    }, 100);
  }, [isFullScreen]);


  const pins = useMemo(() => clusters.map(cluster => {
    const [longitude, latitude] = cluster.geometry.coordinates;

    // --- FORENSIC: CHECKPOINT C ---
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        console.error("🔥 CHECKPOINT C FAILURE: Attempting to render Marker with invalid coords", { id: cluster.properties.buildingId, lat: latitude, lng: longitude });
    }

    const { cluster: isCluster, point_count: pointCount } = cluster.properties;

    if (isCluster) {
        // Check if all items in the cluster are dimmed (e.g. existing items in "Show saved" mode)
        const leaves = supercluster.getLeaves(cluster.id, Infinity);
        const isAllDimmed = leaves.every(l => l.properties.isDimmed);

        return (
            <Marker
                key={`cluster-${cluster.id}`}
                longitude={longitude}
                latitude={latitude}
                onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setUserHasInteracted(true);
                    onMapInteraction?.();

                    let expansionZoom = Math.min(
                        supercluster.getClusterExpansionZoom(cluster.id),
                        20
                    );

                    // Check if this is a cluster of approximate locations
                    // If so, we want to zoom deep enough to reveal the jittered points
                    // We can reuse the leaves we already fetched
                    const isAllApproximate = leaves.every(l => l.properties.location_precision === 'approximate');

                    if (isAllApproximate) {
                         // Force zoom to a level where jitter is clearly visible (15+)
                         expansionZoom = Math.max(expansionZoom, 15);
                    }

                    if (expansionZoom <= viewState.zoom) {
                        expansionZoom = viewState.zoom + 2;
                    }

                    mapRef.current?.flyTo({
                        center: [longitude, latitude],
                        zoom: expansionZoom,
                        duration: 500
                    });
                }}
            >
                <div
                    data-testid="cluster-marker"
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold shadow-md border-2 border-background cursor-pointer transition-transform ${
                        isAllDimmed
                            ? "bg-gray-400 text-white scale-90 opacity-70 hover:scale-100 hover:opacity-100"
                            : "bg-primary text-primary-foreground hover:scale-110"
                    }`}
                >
                    {pointCount}
                </div>
            </Marker>
        );
    }

    // Leaf node
    const building = cluster.properties as (Building & { buildingId: string });
    const status = userBuildingsMap?.get(building.buildingId);
    const isApproximate = building.location_precision === 'approximate';
    const imageUrl = getBuildingImageUrl(building.main_image_url);
    const isHighlighted = highlightedId === building.buildingId;
    const isSelected = selectedPinId === building.buildingId;
    const isDimmed = building.isDimmed && !isHighlighted && !isSelected;

    // Pin Protocol:
    // Charcoal: Visited
    // Neon (#EEFF41): Pending (Wishlist) & Social
    // Grey/Default: Discovery

    let strokeClass = "text-gray-500";
    let fillClass = "fill-background";
    let dotBgClass = "bg-gray-500";
    let pinTooltip = null;

    if (status === 'visited') {
        strokeClass = "text-gray-600";
        fillClass = "fill-gray-600";
        dotBgClass = "bg-gray-600";
        pinTooltip = <span className="opacity-75 capitalize text-center">(Visited)</span>;
    } else if (status === 'pending') {
        strokeClass = "text-gray-500";
        fillClass = "fill-[#EEFF41]"; // Corporate Yellow
        dotBgClass = "bg-[#EEFF41]";
        pinTooltip = <span className="opacity-75 capitalize text-center">(Pending)</span>;
    } else if (building.social_context) {
        strokeClass = "text-gray-500";
        fillClass = "fill-gray-300"; // Light Grey
        dotBgClass = "bg-gray-300";
        pinTooltip = <span className="opacity-90 text-center">({building.social_context})</span>;
    }

    if (isDimmed) {
        strokeClass = "text-gray-400";
        fillClass = "fill-gray-100";
        dotBgClass = "bg-gray-300";
    }

    if (isSatellite) {
        strokeClass = "text-white";
    }

    const pinColorClass = `${strokeClass} ${fillClass}`;
    const dotBorderClass = isSatellite ? "border-white" : "border-background";

    const scaleClass = isHighlighted ? "scale-125 z-50" : (isDimmed ? "scale-90 opacity-70 hover:scale-100 hover:opacity-100" : "hover:scale-110");
    const markerClass = `cursor-pointer ${isHighlighted ? 'z-50' : (isDimmed ? 'z-0' : 'hover:z-10')}`;

    const pinStyle: React.CSSProperties = (building.color && !isDimmed) ? { color: building.color, fill: building.color } : {};
    const dotStyle: React.CSSProperties = (building.color && !isDimmed) ? { backgroundColor: building.color } : {};

    return (
        <Marker
        key={building.buildingId}
        longitude={longitude}
        latitude={latitude}
        anchor={isApproximate ? "center" : "bottom"}
        onClick={(e) => {
            e.originalEvent.stopPropagation();

            // Prevent navigation if clicking on an action button inside the tooltip
            if ((e.originalEvent.target as HTMLElement).closest('button')) {
                return;
            }

            const isTouch = window.matchMedia('(pointer: coarse)').matches;
            const isPinSelected = isSelected || isHighlighted;

            if (isTouch && !isPinSelected) {
                // First tap on mobile: Select pin
                setSelectedPinId(building.buildingId);
                setUserHasInteracted(true);
                onMapInteraction?.();
                return;
            }

            // Otherwise (Desktop click OR Mobile second tap): Navigate
            if (building.isMarker) {
                setSelectedPinId(building.buildingId);
            }

            if (onMarkerClick) {
                onMarkerClick(building.buildingId);
            } else {
                window.open(`/building/${building.buildingId}`, '_blank');
            }
        }}
        className={markerClass}
        >
            <div
                data-testid={isApproximate ? "approximate-dot" : "exact-pin"}
                className="group relative flex flex-col items-center"
            >
            {building.isMarker && isSelected ? (
                 <div
                    className="absolute bottom-full mb-2 z-50 cursor-default text-left"
                    onClick={e => e.stopPropagation()}
                 >
                    <MarkerInfoCard
                        marker={building as unknown as DiscoveryBuilding}
                        onClose={() => {
                            if (isSelected) setSelectedPinId(null);
                            onClosePopup?.();
                        }}
                        onUpdateNote={onUpdateMarkerNote}
                        onDelete={onRemoveMarker}
                    />
                 </div>
            ) : (
                /* Tooltip - pb-2 used instead of mb-2 to create a hit area bridge for hover */
                <div
                    data-testid="building-tooltip"
                    className={`absolute bottom-full pb-2 ${isHighlighted || isSelected ? 'flex' : 'hidden group-hover:flex'} flex-col items-center whitespace-nowrap z-50`}
                >
                    <div className="flex flex-col items-center bg-[#333333] rounded shadow-lg border border-[#EEFF41] overflow-hidden">
                        {showImages && imageUrl && (
                            <div className="w-[200px] h-[200px]">
                                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="text-[#EEFF41] text-xs px-2 py-1 flex flex-col items-center w-full justify-center bg-[#333333]">
                            <span className="font-medium text-white text-center">{building.name}</span>
                            {pinTooltip}

                            <div className="flex items-center gap-2 mt-1">
                                {onHide && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onHide(building.buildingId);
                                        }}
                                        className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[60]"
                                        title="Hide"
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
                                        className={`p-1 rounded-full transition-colors z-[60] ${status === 'pending' ? 'bg-[#EEFF41] text-black hover:bg-[#EEFF41]/80' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                        title="Save"
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
                                        className={`p-1 rounded-full transition-colors z-[60] ${status === 'visited' ? 'bg-[#EEFF41] text-black hover:bg-[#EEFF41]/80' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                        title="Mark as Visited"
                                    >
                                        <CheckSquare className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {building.isCandidate && (
                                <div className="flex items-center justify-center gap-2 mt-1">
                                    {onHideCandidate && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onHideCandidate(building.buildingId);
                                            }}
                                            className="bg-white/10 text-white rounded-full p-1 hover:bg-white/20 transition-colors z-[60]"
                                            title="Hide suggestion"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                    {onAddCandidate && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddCandidate(building as unknown as DiscoveryBuilding);
                                            }}
                                            className="bg-[#EEFF41] text-black rounded-full p-1 hover:bg-white transition-colors z-[60]"
                                            title="Add to map"
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
                                    className="mt-1 bg-green-500 text-white rounded-full p-1 hover:bg-green-600 transition-colors z-[60]"
                                    title="Remove from map"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#EEFF41]"></div>
                </div>
            )}

            {isApproximate ? (
                <div
                    className={`w-6 h-6 rounded-full border-2 ${dotBorderClass} ${dotBgClass} drop-shadow-md transition-transform ${scaleClass}`}
                    style={dotStyle}
                />
            ) : building.isMarker ? (
                <div className={`relative transition-transform ${scaleClass}`}>
                    <MarkerPin
                        category={building.markerCategory}
                        color={building.color || undefined}
                    />
                </div>
            ) : (
                <div className={`relative transition-transform ${scaleClass}`}>
                    <MapPin
                        className={`${isDimmed ? 'w-6 h-6' : 'w-8 h-8'} ${pinColorClass} drop-shadow-md`}
                        style={pinStyle}
                    />
                    {/* White dot overlay to keep inner circle white when pin is filled */}
                    <div className="absolute top-[41.7%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25%] h-[25%] bg-white rounded-full pointer-events-none" />
                </div>
            )}
            </div>
        </Marker>
    );
  }), [clusters, userBuildingsMap, supercluster, onMapInteraction, viewState.zoom, highlightedId, onMarkerClick, isSatellite, selectedPinId, onAddCandidate, onRemoveItem, onHide, onHideCandidate, onSave, onVisit]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleMapUpdate = (map: maplibregl.Map) => {
      const bounds = map.getBounds();
      onBoundsChange?.({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
      });
      checkCandidatesVisibility(map);
  };

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
        ref={(node) => {
            mapRef.current = node;
            setMapInstance(node);
        }}
        onError={(e) => {
          console.group("💥 MAPBOX CRASH CAUGHT");
          console.error("Error:", e.error);
          console.log("Current ViewState:", viewState);
          console.trace("Stack at crash time");
          console.groupEnd();
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
            handleMapUpdate(evt.target);
        }}
        onMoveEnd={evt => {
            setIsMapMoving(false);
            const { latitude, longitude } = evt.viewState;

            // --- EVENT SPY ---
            console.log("Map Move End:", evt.viewState);
            // Check for extremely small non-zero numbers which indicate float underflow/corruption
            if ((Math.abs(latitude) > 0 && Math.abs(latitude) < 1e-6) ||
                (Math.abs(longitude) > 0 && Math.abs(longitude) < 1e-6)) {
                 console.warn("👻 GHOST COORDINATE DETECTED in onMoveEnd!", evt.viewState);
            }
            // ----------------

            onRegionChange?.({ lat: latitude, lng: longitude });
            handleMapUpdate(evt.target);
        }}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
        mapStyle={isSatellite ? SATELLITE_STYLE : DEFAULT_MAP_STYLE}
      >
        <NavigationControl position="bottom-right" />
        {pins}
      </MapGL>

      {showSavedCandidates && candidates.length > 0 && !hasVisibleCandidates && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur px-4 py-2 rounded-full shadow-md text-sm z-10 text-center pointer-events-none border animate-in fade-in slide-in-from-top-2">
           No saved places in this area. Zoom out to find them.
        </div>
      )}

      <button
          onClick={(e) => {
              e.stopPropagation();
              setUserHasInteracted(true);
              onMapInteraction?.();
              setIsSatellite(!isSatellite);
          }}
          className="absolute top-2 left-2 p-2 bg-background/90 backdrop-blur rounded-md border shadow-sm hover:bg-muted transition-colors z-10 flex items-center gap-2"
          title={isSatellite ? "Show Map" : "Show Satellite"}
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
          className="absolute top-2 right-2 p-2 bg-background/90 backdrop-blur rounded-md border shadow-sm hover:bg-muted transition-colors z-10"
          title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
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
