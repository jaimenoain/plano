import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MapGL, { Marker, NavigationControl } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

interface Building {
  id: string;
  name: string;
  main_image_url: string | null;
  location_lat: number;
  location_lng: number;
}

export function BuildingDiscoveryMap() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Default view state (London)
  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 12
  });

  const { data: buildings, isLoading } = useQuery({
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
  });

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
    const borderColor = status === 'visited'
        ? "border-green-500"
        : status === 'pending'
            ? "border-yellow-500"
            : "border-white"; // Default discovery

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
                <div className="bg-foreground text-background text-xs px-2 py-1 rounded shadow-lg">
                    {building.name}
                    {status && <span className="ml-1 opacity-75 capitalize">({status})</span>}
                </div>
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-foreground"></div>
            </div>

            <div className="relative">
                <div className={`w-8 h-8 rounded-full border-2 ${borderColor} shadow-md overflow-hidden bg-background transition-colors duration-200`}>
                    <Avatar className="h-full w-full">
                        <AvatarImage src={building.main_image_url || undefined} alt={building.name} className="object-cover" />
                        <AvatarFallback className="bg-primary/10">
                            <MapPin className={`h-4 w-4 ${status ? 'text-foreground' : 'text-primary'}`} />
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 ${status === 'visited' ? 'bg-green-500' : status === 'pending' ? 'bg-yellow-500' : 'bg-white'} rotate-45 transform translate-y-1/2 shadow-sm`}></div>
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
    <div className="h-[calc(100vh-100px)] w-full rounded-xl overflow-hidden border border-white/10 relative">
      <MapGL
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
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
