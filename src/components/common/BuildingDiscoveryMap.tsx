import { useState, useMemo, useRef, useEffect } from "react";
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
import { Bounds } from "@/utils/map";
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

interface BuildingDiscoveryMapProps {
  externalBuildings?: DiscoveryBuilding[];
  onAddCandidate?: (building: DiscoveryBuilding) => void;
  onRegionChange?: (center: { lat: number, lng: number }) => void;
  onBoundsChange?: (bounds: Bounds) => void;
  onMapInteraction?: () => void;
  forcedCenter?: { lat: number, lng: number } | null;
  forcedBounds?: Bounds | null;
  isFetching?: boolean;
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

export function BuildingDiscoveryMap({
  externalBuildings,
  onAddCandidate,
  onRegionChange,
  onBoundsChange,
  onMapInteraction,
  forcedCenter,
  forcedBounds,
  isFetching,
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
}: BuildingDiscoveryMapProps) {
  const { user } = useAuth();
  const mapRef = useRef<MapRef>(null);
  const isUserInteractionRef = useRef(false);
  const [mapInstance, setMapInstance] = useState<MapRef | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [hasVisibleCandidates, setHasVisibleCandidates] = useState(true);

  // Default view state (London)
  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 12
  });

  // Handle flyTo or fitBounds
  useEffect(() => {
    if (forcedBounds && mapInstance) {
        mapInstance.fitBounds(
            [
                [forcedBounds.west, forcedBounds.south], // [minLng, minLat]
                [forcedBounds.east, forcedBounds.north]  // [maxLng, maxLat]
            ],
            { padding: { top: 80, bottom: 40, left: 40, right: 40 }, duration: 1500, maxZoom: 19 }
        );
    } else if (forcedCenter && mapInstance) {
        mapInstance.flyTo({
            center: [forcedCenter.lng, forcedCenter.lat],
            zoom: 13,
            duration: 1500
        });
    }
  }, [forcedCenter, forcedBounds, mapInstance]);

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

  const candidates = useMemo(() => buildings?.filter(b => b.isCandidate) || [], [buildings]);

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
                onMapInteraction?.();
            }
        }}
        onDragStart={() => {
            onMapInteraction?.();
        }}
        onMoveStart={(evt) => {
            if (evt.originalEvent) {
                isUserInteractionRef.current = true;
                onMapInteraction?.();
            } else {
                isUserInteractionRef.current = false;
            }
        }}
        onLoad={evt => {
            handleMapUpdate(evt.target);
        }}
        onMoveEnd={evt => {
            const { latitude, longitude } = evt.viewState;
            if (isUserInteractionRef.current) {
                onRegionChange?.({ lat: latitude, lng: longitude });
            }
            handleMapUpdate(evt.target);
            isUserInteractionRef.current = false;
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
}
