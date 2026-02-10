import { useState, useRef } from "react";
import Map, { Marker, NavigationControl, GeolocateControl, MapRef } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers, MapPin, Maximize2, Minimize2 } from "lucide-react";

interface BuildingLocationMapProps {
  lat: number;
  lng: number;
  className?: string;
  status?: 'visited' | 'pending' | 'ignored' | null;
  locationPrecision?: 'exact' | 'approximate';
  isExpanded?: boolean;
  onToggleExpand?: () => void;
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

export function BuildingLocationMap({
  lat,
  lng,
  className,
  status,
  locationPrecision = 'exact',
  isExpanded,
  onToggleExpand
}: BuildingLocationMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [isSatellite, setIsSatellite] = useState(false);

  const isApproximate = locationPrecision === 'approximate';

  let strokeClass = "text-gray-500";
  let fillClass = "fill-background";
  let dotBgClass = "bg-gray-500";

  if (status === 'visited') {
    strokeClass = "text-gray-600";
    fillClass = "fill-gray-600";
    dotBgClass = "bg-gray-600";
  } else if (status === 'pending') {
    strokeClass = "text-gray-500";
    fillClass = "fill-[#EEFF41]";
    dotBgClass = "bg-[#EEFF41]";
  }

  if (isSatellite) {
    strokeClass = "text-white";
  }

  const pinColor = `${strokeClass} ${fillClass}`;
  const dotBorderClass = isSatellite ? "border-white" : "border-background";

  return (
    <div className={`relative ${isExpanded ? "fixed inset-0 z-50 h-screen w-screen bg-background" : "rounded-xl overflow-hidden border border-white/10"} ${className || ""}`}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: lng,
          latitude: lat,
          zoom: 15
        }}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
        mapStyle={isSatellite ? SATELLITE_STYLE : DEFAULT_MAP_STYLE}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" trackUserLocation={true} showUserLocation={true} />

        <Marker
            longitude={lng}
            latitude={lat}
            anchor={isApproximate ? "center" : "bottom"}
            style={{ zIndex: 10 }}
        >
            {isApproximate ? (
                <div className={`w-6 h-6 rounded-full border-2 ${dotBorderClass} ${dotBgClass} drop-shadow-lg`} />
            ) : (
                <div className="relative">
                    <MapPin className={`w-8 h-8 drop-shadow-lg ${pinColor}`} />
                    <div className="absolute top-[41.7%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25%] h-[25%] bg-white rounded-full pointer-events-none" />
                </div>
            )}
        </Marker>
      </Map>

      <div className="absolute top-2 left-2 flex flex-col gap-2 z-10">
          <button
            onClick={(e) => {
                e.stopPropagation();
                setIsSatellite(!isSatellite);
            }}
            className="p-2 bg-background/90 backdrop-blur rounded-md border shadow-sm hover:bg-muted transition-colors flex items-center gap-2"
            title={isSatellite ? "Show Map" : "Show Satellite"}
          >
            <Layers className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">{isSatellite ? "Map" : "Satellite"}</span>
          </button>
      </div>

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
