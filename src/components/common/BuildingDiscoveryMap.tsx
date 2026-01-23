import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MapGL, { Marker, NavigationControl, MapRef } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { DiscoveryBuilding } from "@/features/search/components/types";

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
      const { data, error } = await supabase.rpc('find_nearby_buildings', {
        lat: viewState.latitude,
        long: viewState.longitude,
        radius_meters: 500000, // 500km
        name_query: ""
      });

      if (error) {
        console.error("Error fetching buildings:", error);
        return [];
      }
      return data as Building[];
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

        const { data, error } = await supabase
            .from("user_buildings")
            .select("building_id, status")
            .eq("user_id", user.id);

        if (error) {
            console.error("Error fetching user buildings:", error);
            return new Map();
        }

        const map = new Map();
        data.forEach(item => {
            map.set(item.building_id, item.status);
        });
        return map;
    }
  });

  const pins = useMemo(() => buildings?.map(building => {
    const status = userBuildingsMap?.get(building.id);

    // Pin Protocol:
    // Green: Visited
    // Yellow: Pending (Wishlist)
    // Purple: Recommended (Social Context)
    // Grey/Default: Discovery

    let pinColorClass = "border-gray-400";
    let dotColorClass = "bg-gray-400";
    let pinTooltip = null;

    if (status === 'visited') {
        pinColorClass = "border-green-500";
        dotColorClass = "bg-green-500";
        pinTooltip = <span className="ml-1 opacity-75 capitalize">(Visited)</span>;
    } else if (status === 'pending') {
        pinColorClass = "border-yellow-500";
        dotColorClass = "bg-yellow-500";
        pinTooltip = <span className="ml-1 opacity-75 capitalize">(Pending)</span>;
    } else if (building.social_context) {
        pinColorClass = "border-purple-500";
        dotColorClass = "bg-purple-500";
        pinTooltip = <span className="ml-1 opacity-90 text-purple-200">({building.social_context})</span>;
    }

    return (
        <Marker
        key={building.id}
        longitude={building.location_lng}
        latitude={building.location_lat}
        anchor="bottom"
        onClick={(e) => {
            e.originalEvent.stopPropagation();
            navigate(`/building/${building.id}`);
        }}
        className="cursor-pointer hover:z-10"
        >
            <div className="group relative flex flex-col items-center">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center whitespace-nowrap z-50">
                <div className="bg-foreground text-background text-xs px-2 py-1 rounded shadow-lg flex items-center gap-1">
                    <span className="font-medium">{building.name}</span>
                    {pinTooltip}
                </div>
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-foreground"></div>
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
  }), [buildings, navigate, userBuildingsMap]);

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
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
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
