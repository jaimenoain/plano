import Map, { Marker, NavigationControl } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin } from "lucide-react";

interface BuildingMapProps {
  lat: number;
  lng: number;
  className?: string;
  status?: 'visited' | 'pending' | null;
}

export function BuildingMap({ lat, lng, className, status }: BuildingMapProps) {
  const pinColor = status === 'visited'
    ? "text-green-500 fill-green-500/20"
    : status === 'pending'
      ? "text-yellow-500 fill-yellow-500/20"
      : "text-blue-500 fill-blue-500/20";

  return (
    <div className={`rounded-xl overflow-hidden border border-white/10 relative ${className || ""}`}>
      <Map
        initialViewState={{
          longitude: lng,
          latitude: lat,
          zoom: 15
        }}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
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
    </div>
  );
}
