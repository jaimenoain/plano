import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MapGL, { Marker, NavigationControl } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Building {
  id: string;
  name: string;
  main_image_url: string | null;
  location_lat: number;
  location_lng: number;
}

export function BuildingDiscoveryMap() {
  const navigate = useNavigate();

  // Default view state (London)
  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 12
  });

  const { data: buildings, isLoading } = useQuery({
    queryKey: ["discovery-buildings"],
    queryFn: async () => {
      // Fetch buildings using find_nearby_buildings with a very large radius to get "all" (or a significant subset)
      // Since we want to show what's in the DB, we center the search on the current view center or a default.
      // However, to populate the map initially, let's try to get a broad set.
      // The RPC requires lat/long. Let's use the current view center.
      // 500km radius should cover a lot for a "stub".
      // Ideally we would fetch based on viewport bounds, but for now fixed fetch is okay.

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
    // We might want to refetch when view changes significantly, but for a stub, once is fine or on mount.
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const pins = useMemo(() => buildings?.map(building => (
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
            </div>
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-foreground"></div>
        </div>

        <div className="relative">
            <div className="w-8 h-8 rounded-full border-2 border-white shadow-md overflow-hidden bg-background">
                <Avatar className="h-full w-full">
                    <AvatarImage src={building.main_image_url || undefined} alt={building.name} className="object-cover" />
                    <AvatarFallback className="bg-primary/10">
                        <MapPin className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                </Avatar>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 transform translate-y-1/2 shadow-sm"></div>
        </div>
        </div>
    </Marker>
  )), [buildings, navigate]);

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
