import Map, { Marker, NavigationControl } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin } from "lucide-react";

interface BuildingMapProps {
  lat: number;
  lng: number;
  className?: string;
}

export function BuildingMap({ lat, lng, className }: BuildingMapProps) {
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
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
      >
        <NavigationControl position="bottom-right" />
        <Marker
          longitude={lng}
          latitude={lat}
          anchor="bottom"
        >
            <MapPin className="w-8 h-8 text-red-500 fill-red-500/20 drop-shadow-lg" />
        </Marker>
      </Map>
    </div>
  );
}
