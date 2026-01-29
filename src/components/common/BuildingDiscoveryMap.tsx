import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MapGL, { Marker, NavigationControl, MapRef } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Layers, Maximize2, Minimize2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DiscoveryBuilding } from "@/features/search/components/types";
import { findNearbyBuildingsRpc, fetchUserBuildingsMap } from "@/utils/supabaseFallback";
import { getBuildingImageUrl } from "@/utils/image";
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
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface BuildingDiscoveryMapProps {
  externalBuildings?: DiscoveryBuilding[];
  onRegionChange?: (center: { lat: number, lng: number }) => void;
  onBoundsChange?: (bounds: Bounds) => void;
  onMapInteraction?: () => void;
  forcedCenter?: { lat: number, lng: number } | null;
  forcedBounds?: Bounds | null;
  isFetching?: boolean;
  autoZoomOnLowCount?: boolean;
  resetInteractionTrigger?: number;
  highlightedId?: string | null;
  onMarkerClick?: (buildingId: string) => void;
}

export function BuildingDiscoveryMap({
  externalBuildings,
  onRegionChange,
  onBoundsChange,
  onMapInteraction,
  forcedCenter,
  forcedBounds,
  isFetching,
  autoZoomOnLowCount,
  resetInteractionTrigger,
  highlightedId,
  onMarkerClick
}: BuildingDiscoveryMapProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef = useRef<MapRef>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // State to track user interaction to disable auto-zoom
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);

  // Default view state (London)
  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 12
  });

  // Handle flyTo or fitBounds
  useEffect(() => {
    if (forcedBounds && mapRef.current) {
        mapRef.current.fitBounds(
            [
                [forcedBounds.west, forcedBounds.south], // [minLng, minLat]
                [forcedBounds.east, forcedBounds.north]  // [maxLng, maxLat]
            ],
            { padding: 20, duration: 1500 }
        );
    } else if (forcedCenter && mapRef.current) {
        mapRef.current.flyTo({
            center: [forcedCenter.lng, forcedCenter.lat],
            zoom: 13,
            duration: 1500
        });
    }
  }, [forcedCenter, forcedBounds]);

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
      radius: 40,
      maxZoom: 14 // Reduced maxZoom to break clusters earlier for approximate locations
    });
  }, []);

  const points = useMemo(() => buildings?.map(b => {
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

    return {
        type: 'Feature' as const,
        properties: { cluster: false, buildingId: b.id, ...b },
        geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat]
        }
    };
  }) || [], [buildings]);

  const [clusters, setClusters] = useState<any[]>([]);
  const viewStateRef = useRef(viewState);
  viewStateRef.current = viewState;

  const updateClusters = useMemo(() => {
    return () => {
        if (!mapRef.current) return;
        const bounds = mapRef.current.getBounds();
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as [number, number, number, number];
        const zoom = viewStateRef.current.zoom;
        setClusters(supercluster.getClusters(bbox, Math.round(zoom)));
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

  // Auto-zoom logic
  useEffect(() => {
    // Only proceed if auto-zoom is enabled and user hasn't interacted
    if (!autoZoomOnLowCount || userHasInteracted || isMapMoving || isFetching) return;

    // Ensure we have buildings to check against
    if (!buildings || buildings.length === 0) return;

    // Check minimum zoom level to prevent zooming out to world view excessively
    if (viewState.zoom <= 2) return;

    const visibleCount = clusters.reduce((acc, cluster) => {
        return acc + (cluster.properties.point_count || 1);
    }, 0);

    // If visible count is less than 5 AND we have more buildings available
    if (visibleCount < 5 && visibleCount < buildings.length) {
        const timer = setTimeout(() => {
            setViewState(prev => ({
                ...prev,
                zoom: prev.zoom - 1
            }));
        }, 500); // 0.5s delay to pace the zoom out

        return () => clearTimeout(timer);
    }
  }, [clusters, buildings, autoZoomOnLowCount, userHasInteracted, isMapMoving, isFetching, viewState.zoom]);

  const pins = useMemo(() => clusters.map(cluster => {
    const [longitude, latitude] = cluster.geometry.coordinates;
    const { cluster: isCluster, point_count: pointCount } = cluster.properties;

    if (isCluster) {
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
                    const leaves = supercluster.getLeaves(cluster.id, Infinity);
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
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shadow-md border-2 border-background cursor-pointer hover:scale-110 transition-transform"
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

    // Pin Protocol:
    // Charcoal: Visited
    // Neon (#EEFF41): Pending (Wishlist) & Social
    // Grey/Default: Discovery

    let pinColorClass = "text-gray-500 fill-background";
    let dotBgClass = "bg-gray-500";
    let pinTooltip = null;

    if (status === 'visited') {
        pinColorClass = "text-[#333333] fill-[#333333]"; // Charcoal
        dotBgClass = "bg-[#333333]";
        pinTooltip = <span className="ml-1 opacity-75 capitalize">(Visited)</span>;
    } else if (status === 'pending') {
        pinColorClass = "text-[#EEFF41] fill-[#EEFF41]"; // Neon
        dotBgClass = "bg-[#EEFF41]";
        pinTooltip = <span className="ml-1 opacity-75 capitalize">(Pending)</span>;
    } else if (building.social_context) {
        pinColorClass = "text-[#EEFF41] fill-[#EEFF41]"; // Neon
        dotBgClass = "bg-[#EEFF41]";
        pinTooltip = <span className="ml-1 opacity-90">({building.social_context})</span>;
    }

    const scaleClass = isHighlighted ? "scale-125 z-50" : "hover:scale-110";
    const markerClass = `cursor-pointer ${isHighlighted ? 'z-50' : 'hover:z-10'}`;

    return (
        <Marker
        key={building.buildingId}
        longitude={longitude}
        latitude={latitude}
        anchor={isApproximate ? "center" : "bottom"}
        onClick={(e) => {
            e.originalEvent.stopPropagation();
            if (onMarkerClick) {
                onMarkerClick(building.buildingId);
            } else {
                navigate(`/building/${building.buildingId}`);
            }
        }}
        className={markerClass}
        >
            <div
                data-testid={isApproximate ? "approximate-dot" : "exact-pin"}
                className="group relative flex flex-col items-center"
            >
            {/* Tooltip */}
            <div className={`absolute bottom-full mb-2 ${isHighlighted ? 'flex' : 'hidden group-hover:flex'} flex-col items-center whitespace-nowrap z-50`}>
                <div className="flex flex-col items-center bg-[#333333] rounded shadow-lg border border-[#EEFF41] overflow-hidden">
                    {imageUrl && (
                        <div className="w-[100px] h-[100px]">
                            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="text-[#EEFF41] text-xs px-2 py-1 flex items-center gap-1 w-full justify-center bg-[#333333]">
                        <span className="font-medium text-white">{building.name}</span>
                        {pinTooltip}
                    </div>
                </div>
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#EEFF41]"></div>
            </div>

            {isApproximate ? (
                <div className={`w-6 h-6 rounded-full border-2 border-background ${dotBgClass} drop-shadow-md transition-transform ${scaleClass}`} />
            ) : (
                <MapPin className={`w-8 h-8 ${pinColorClass} drop-shadow-md transition-transform ${scaleClass}`} />
            )}
            </div>
        </Marker>
    );
  }), [clusters, navigate, userBuildingsMap, supercluster, onMapInteraction, viewState.zoom, highlightedId, onMarkerClick]);

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
  };

  return (
    <div
        className={`w-full overflow-hidden border border-white/10 relative transition-all duration-300 ${
          isFullScreen
            ? 'fixed inset-0 z-[100] h-screen rounded-none'
            : 'h-full rounded-xl'
        }`}
        data-zoom={viewState.zoom}
        data-testid="map-container"
    >
      <MapGL
        ref={mapRef}
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
            if (evt.originalEvent) {
                setUserHasInteracted(true);
                onMapInteraction?.();
            }
        }}
        onLoad={evt => handleMapUpdate(evt.target)}
        onMoveEnd={evt => {
            setIsMapMoving(false);
            const { latitude, longitude } = evt.viewState;
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
}
