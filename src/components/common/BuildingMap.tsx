import Map, { Marker, NavigationControl } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Maximize2, Minimize2 } from "lucide-react";

interface BuildingMapProps {
  lat: number;
  lng: number;
  className?: string;
  status?: 'visited' | 'pending' | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  mapStyle?: string;
}

const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

export function BuildingMap({ 
  lat, 
  lng, 
  className, 
  status, 
  isExpanded, 
  onToggleExpand, 
  mapStyle 
}: BuildingMapProps) {
  const pinColor = status === 'visited'
    ? "text-[#333333] fill-[#333333]" // Charcoal
    : status === 'pending'
      ? "text-yellow-500 fill-yellow-500/20"
      : "text-blue-500 fill-blue-500/20";

  // When expanded, we remove the default containment styling (relative, rounded, border)
  // to allow full screen behavior controlled by the parent's className.
  const containerBaseClass = isExpanded
    ? "overflow-hidden"
    : "relative rounded-xl overflow-hidden border border-white/10";

  return (
    <div className={`${containerBaseClass} ${className || ""}`}>
      <Map
        initialViewState={{
          longitude: lng,
          latitude: lat,
          zoom: 15
        }}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle || DEFAULT_MAP_STYLE}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" />
        <Marker
          longitude={lng}
          latitude={lat}
          anchor="bottom"
        >
            <MapPin className={`w-8 h-8 drop-shadow-lg ${pinColor}`} />
        </Marker>
      </Map>

      {onToggleExpand && (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
            }}
            className="absolute top-2 right-2 p-2 bg-background/90 backdrop-blur rounded-md border shadow-sm hover:bg-muted transition-colors z-10"
            title={isExpanded ? "Collapse Map" : "Expand Map"}
        >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}