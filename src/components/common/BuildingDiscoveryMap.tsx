import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MapGL, { Marker, NavigationControl, MapRef } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { DiscoveryBuilding } from "@/features/search/components/types";
import { findNearbyBuildingsRpc, fetchUserBuildingsMap } from "@/utils/supabaseFallback";
import Supercluster from "supercluster";

interface Building {
  id: string;
  name: string;
  main_image_url: string | null;
  location_lat: number;
  location_lng: number;
  social_context?: string | null;
}

interface BuildingDiscoveryMapProps {
    externalBuildings?: DiscoveryBuilding[];
    onRegionChange?: (center: { lat: number, lng: number }) => void;
    forcedCenter?: { lat: number, lng: number } | null;
}

export function BuildingDiscoveryMap({ externalBuildings, onRegionChange, forcedCenter }: BuildingDiscoveryMapProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef = useRef<MapRef>(null);

  // Default view state (London)
  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 12
  });

  // Handle flyTo
  useEffect(() => {
    if (forcedCenter && mapRef.current) {
        mapRef.current.flyTo({
            center: [forcedCenter.lng, forcedCenter.lat],
            zoom: 13,
            duration: 1500
        });
    }
  }, [forcedCenter]);

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
      maxZoom: 16
    });
  }, []);

  const points = useMemo(() => buildings?.map(b => ({
    type: 'Feature' as const,
    properties: { cluster: false, buildingId: b.id, ...b },
    geometry: {
      type: 'Point' as const,
      coordinates: [b.location_lng, b.location_lat]
    }
  })) || [], [buildings]);

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
                    const expansionZoom = Math.min(
                        supercluster.getClusterExpansionZoom(cluster.id),
                        20
                    );

                    mapRef.current?.flyTo({
                        center: [longitude, latitude],
                        zoom: expansionZoom,
                        duration: 500
                    });
                }}
            >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shadow-md border-2 border-background cursor-pointer hover:scale-110 transition-transform">
                    {pointCount}
                </div>
            </Marker>
        );
    }

    // Leaf node
    const building = cluster.properties as (Building & { buildingId: string });
    const status = userBuildingsMap?.get(building.buildingId);

    // Pin Protocol:
    // Charcoal: Visited
    // Neon (#EEFF41): Pending (Wishlist) & Social
    // Grey/Default: Discovery

    let pinColorClass = "border-gray-400";
    let dotColorClass = "bg-[#333333]"; // Dark anchor point
    let pinTooltip = null;

    if (status === 'visited') {
        pinColorClass = "border-[#333333]"; // Charcoal
        dotColorClass = "bg-[#333333]";
        pinTooltip = <span className="ml-1 opacity-75 capitalize">(Visited)</span>;
    } else if (status === 'pending') {
        pinColorClass = "border-[#EEFF41]"; // Neon
        dotColorClass = "bg-[#333333]"; // Dark anchor
        pinTooltip = <span className="ml-1 opacity-75 capitalize">(Pending)</span>;
    } else if (building.social_context) {
        pinColorClass = "border-[#EEFF41]"; // Neon
        dotColorClass = "bg-[#333333]"; // Dark anchor
        pinTooltip = <span className="ml-1 opacity-90">({building.social_context})</span>;
    }

    return (
        <Marker
        key={building.buildingId}
        longitude={longitude}
        latitude={latitude}
        anchor="bottom"
        onClick={(e) => {
            e.originalEvent.stopPropagation();
            navigate(`/building/${building.buildingId}`);
        }}
        className="cursor-pointer hover:z-10"
        >
            <div className="group relative flex flex-col items-center">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center whitespace-nowrap z-50">
                <div className="bg-[#333333] text-[#EEFF41] text-xs px-2 py-1 rounded shadow-lg flex items-center gap-1 border border-[#EEFF41]">
                    <span className="font-medium text-white">{building.name}</span>
                    {pinTooltip}
                </div>
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#EEFF41]"></div>
            </div>

            <div className="relative">
                <div className={`w-8 h-8 rounded-full border-2 ${pinColorClass} shadow-md overflow-hidden bg-background transition-colors duration-200`}>
                    <Avatar className="h-full w-full">
                        <AvatarImage src={building.main_image_url || undefined} alt={building.name} className="object-cover" />
                        <AvatarFallback className="bg-primary/10">
                            <MapPin className={`h-4 w-4 ${status ? 'text-foreground' : 'text-primary'}`} />
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 ${dotColorClass} rotate-45 transform translate-y-1/2 shadow-sm`}></div>
            </div>
            </div>
        </Marker>
    );
  }), [clusters, navigate, userBuildingsMap, supercluster]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-white/10 relative">
      <MapGL
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onMoveEnd={evt => {
            const { latitude, longitude } = evt.viewState;
            onRegionChange?.({ lat: latitude, lng: longitude });
        }}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
      >
        <NavigationControl position="bottom-right" />
        {pins}
      </MapGL>

      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur px-3 py-2 rounded-md border shadow-sm text-sm font-medium z-10">
         {buildings?.length || 0} Buildings Nearby
      </div>
    </div>
  );
}
