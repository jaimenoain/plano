import { useMemo, useState } from "react";
import MapGL, { Marker, NavigationControl } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { getBuildingImageUrl } from "@/utils/image";

// Helper to parse PostGIS POINT string (WKT)
// Format: POINT(lng lat)
const parseLocation = (loc: string | unknown): { lat: number; lng: number } | null => {
  if (typeof loc !== "string") return null;

  // Clean up the string just in case
  const cleanLoc = loc.trim();

  // Match POINT(lng lat)
  const match = cleanLoc.match(/POINT\s*\((-?\d+\.?\d*)\s+(-?\d+\.?\d*)\)/i);
  if (match) {
    return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
  }
  return null;
};

interface SessionMapProps {
  buildings: {
    id: string;
    name: string;
    location: unknown;
    main_image_url: string | null;
    address?: string | null;
  }[];
  className?: string;
  interactive?: boolean;
}

export function SessionMap({ buildings, className, interactive = true }: SessionMapProps) {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(null);

  const markers = useMemo(() => {
    return buildings
      .map((b) => {
        const coords = parseLocation(b.location);
        if (!coords) return null;
        return { ...b, ...coords };
      })
      .filter((b): b is typeof b & { lat: number; lng: number } => b !== null);
  }, [buildings]);

  const bounds = useMemo(() => {
    if (markers.length === 0) return null;

    // Calculate bounds
    const lats = markers.map(m => m.lat);
    const lngs = markers.map(m => m.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      minLng, minLat, maxLng, maxLat
    };
  }, [markers]);

  if (markers.length === 0) return null;

  // Determine initial view state
  // If we have bounds, we can center.
  // For simplicity, we'll calculate center and a heuristic zoom,
  // or rely on the Map's fitBounds if we were using a ref.
  // Since this is a "mini-map", let's just center on the average.

  const centerLat = bounds ? (bounds.minLat + bounds.maxLat) / 2 : 51.5074;
  const centerLng = bounds ? (bounds.minLng + bounds.maxLng) / 2 : -0.1278;

  // Heuristic zoom
  let zoom = 13;
  if (bounds) {
      const latDiff = bounds.maxLat - bounds.minLat;
      const lngDiff = bounds.maxLng - bounds.minLng;
      const maxDiff = Math.max(latDiff, lngDiff);
      if (maxDiff > 0.5) zoom = 9;
      else if (maxDiff > 0.1) zoom = 11;
      else if (maxDiff > 0.05) zoom = 12;
      else if (maxDiff > 0.01) zoom = 14;
      else if (maxDiff === 0) zoom = 15;
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-white/10 bg-muted/20 ${className}`}>
      <MapGL
        initialViewState={{
          longitude: centerLng,
          latitude: centerLat,
          zoom: zoom
        }}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        scrollZoom={interactive}
        dragPan={interactive}
        doubleClickZoom={interactive}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {markers.map((building) => (
            <Marker
                key={building.id}
                longitude={building.lng}
                latitude={building.lat}
                anchor="bottom"
                onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    if (interactive) {
                        navigate(`/building/${building.id}`);
                    }
                }}
                className={interactive ? "cursor-pointer hover:z-10" : "cursor-pointer"}
            >
                <div
                    className="group relative flex flex-col items-center"
                    onMouseEnter={() => setActiveId(building.id)}
                    onMouseLeave={() => setActiveId(null)}
                >
                    {/* Tooltip */}
                    <div className={`absolute bottom-full mb-2 ${activeId === building.id ? 'flex' : 'hidden'} flex-col items-center whitespace-nowrap z-50`}>
                        <div className="bg-foreground text-background text-xs px-2 py-1 rounded shadow-lg font-medium max-w-[150px] truncate">
                            {building.name}
                        </div>
                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-foreground"></div>
                    </div>

                    <div className="relative transform transition-transform hover:scale-110">
                        <div className="w-8 h-8 rounded-full border-2 border-white shadow-md overflow-hidden bg-background">
                            <Avatar className="h-full w-full">
                                <AvatarImage src={getBuildingImageUrl(building.main_image_url) || undefined} alt={building.name} className="object-cover" />
                                <AvatarFallback className="bg-primary/10">
                                    <MapPin className="h-4 w-4 text-primary" />
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 transform translate-y-1/2 shadow-sm"></div>
                    </div>
                </div>
            </Marker>
        ))}
      </MapGL>
      {!interactive && (
          <div className="absolute inset-0 z-10 bg-transparent" />
      )}
    </div>
  );
}
