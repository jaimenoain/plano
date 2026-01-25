import { useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers, MapPin, Maximize2, Minimize2 } from "lucide-react";

interface BuildingMapProps {
  lat: number;
  lng: number;
  className?: string;
  status?: 'visited' | 'pending' | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  mapStyle?: string | object;
  locationPrecision?: 'exact' | 'approximate';
}

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

export function BuildingMap({ 
  lat, 
  lng, 
  className, 
  status, 
  isExpanded, 
  onToggleExpand, 
  mapStyle,
  locationPrecision = 'exact'
}: BuildingMapProps) {
  const [isSatellite, setIsSatellite] = useState(false);

  const isApproximate = locationPrecision === 'approximate';

  let pinColor = "text-gray-500 fill-background";
  let dotBgClass = "bg-gray-500";

  if (status === 'visited') {
    pinColor = "text-[#333333] fill-[#333333]"; // Charcoal
    dotBgClass = "bg-[#333333]";
  } else if (status === 'pending') {
    pinColor = "text-yellow-500 fill-yellow-500/20";
    dotBgClass = "bg-yellow-500";
  }

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
        mapStyle={isSatellite ? SATELLITE_STYLE : (mapStyle || DEFAULT_MAP_STYLE)}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" />
        <Marker
          longitude={lng}
          latitude={lat}
          anchor={isApproximate ? "center" : "bottom"}
        >
            {isApproximate ? (
               <div className={`w-5 h-5 rounded-full border-2 border-background ${dotBgClass} drop-shadow-lg`} />
            ) : (
               <MapPin className={`w-8 h-8 drop-shadow-lg ${pinColor}`} />
            )}
        </Marker>
      </Map>

      {isExpanded && (
        <button
            onClick={(e) => {
                e.stopPropagation();
                setIsSatellite(!isSatellite);
            }}
            className="absolute top-2 left-2 p-2 bg-background/90 backdrop-blur rounded-md border shadow-sm hover:bg-muted transition-colors z-10 flex items-center gap-2"
            title={isSatellite ? "Show Map" : "Show Satellite"}
        >
            <Layers className="w-4 h-4" />
            <span className="text-xs font-medium">{isSatellite ? "Map" : "Satellite"}</span>
        </button>
      )}

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