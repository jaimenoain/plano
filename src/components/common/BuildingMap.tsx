import { useState, useEffect, useRef, useMemo } from "react";
import Map, { Marker, NavigationControl, MapRef } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers, MapPin, Maximize2, Minimize2 } from "lucide-react";
import { useUserLocation } from "../../hooks/useUserLocation";
import { MapItem, ClusterPoint, BuildingPoint } from "@/features/search/components/types";

interface BuildingMapProps {
  lat: number;
  lng: number;
  className?: string;
  status?: 'visited' | 'pending' | null;
  socialContext?: string | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  mapStyle?: string | object;
  locationPrecision?: 'exact' | 'approximate';
  items?: MapItem[];
  selectedId?: string;
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
  socialContext,
  isExpanded, 
  onToggleExpand, 
  mapStyle,
  locationPrecision = 'exact',
  items,
  selectedId
}: BuildingMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const { location: userLocation, requestLocation } = useUserLocation();

  useEffect(() => {
    requestLocation({ silent: true });
  }, []);

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
  } else if (socialContext) {
    strokeClass = "text-gray-500";
    fillClass = "fill-gray-300"; // Light Grey
    dotBgClass = "bg-gray-300";
  }

  if (isSatellite) {
    strokeClass = "text-white";
  }

  const pinColor = `${strokeClass} ${fillClass}`;
  const dotBorderClass = isSatellite ? "border-white" : "border-background";

  // When expanded, we remove the default containment styling (relative, rounded, border)
  // to allow full screen behavior controlled by the parent's className.
  const containerBaseClass = isExpanded
    ? "overflow-hidden"
    : "relative rounded-xl overflow-hidden border border-white/10";

  const handleClusterClick = (cluster: ClusterPoint) => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const currentZoom = map.getZoom();
    const maxZoom = map.getMaxZoom();
    const nextZoom = Math.min(maxZoom, currentZoom + 2);

    mapRef.current.flyTo({
      center: [cluster.lng, cluster.lat],
      zoom: nextZoom,
      duration: 500,
    });
  };

  return (
    <div className={`${containerBaseClass} ${className || ""}`}>
      <Map
        ref={mapRef}
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
        {userLocation && (
          <Marker
            longitude={userLocation.lng}
            latitude={userLocation.lat}
            anchor="center"
            style={{ zIndex: 1 }}
          >
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-500/20 absolute rounded-full animate-pulse" />
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg relative z-10" />
            </div>
          </Marker>
        )}

        {items && items.length > 0 ? (
          items.map((item) => {
            if (item.is_cluster) {
              const cluster = item as ClusterPoint;
              let sizeClass = "w-[30px] h-[30px] text-xs";
              if (cluster.count >= 1000) sizeClass = "w-[50px] h-[50px] text-base";
              else if (cluster.count >= 100) sizeClass = "w-[40px] h-[40px] text-sm";

              return (
                <Marker
                  key={cluster.id}
                  longitude={cluster.lng}
                  latitude={cluster.lat}
                  anchor="center"
                  style={{ zIndex: 20 }}
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    handleClusterClick(cluster);
                  }}
                >
                  <div
                    className={`${sizeClass} rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center font-bold transition-transform duration-200 hover:scale-110 hover:z-[50] cursor-pointer`}
                  >
                    {cluster.count >= 1000 ? `${(cluster.count / 1000).toFixed(1)}k` : cluster.count}
                  </div>
                </Marker>
              );
            } else {
              const building = item as BuildingPoint;
              const isSelected = selectedId === String(building.id);
              // For list items, we use default styling unless we extend MapItem to include status/etc.
              // Assuming default gray pin for list items.
              // Selected pin gets higher z-index (30) vs unselected (10).

              // We reuse the pin rendering logic but with default colors for list items
              // since BuildingPoint doesn't have status info currently.
              // We could potentially pass a lookup map for status if needed, but requirements didn't specify.

              const listPinColor = isSelected ? "text-primary fill-background" : "text-gray-500 fill-background";

              return (
                <Marker
                  key={building.id}
                  longitude={building.lng}
                  latitude={building.lat}
                  anchor="bottom"
                  style={{ zIndex: isSelected ? 30 : 10 }}
                  onClick={(e) => {
                    // Optional: handle building click if needed
                    // e.originalEvent.stopPropagation();
                  }}
                >
                  <div className="relative group hover:z-50">
                    <MapPin className={`w-8 h-8 drop-shadow-lg ${listPinColor}`} />
                    <div className="absolute top-[41.7%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25%] h-[25%] bg-white rounded-full pointer-events-none" />
                  </div>
                </Marker>
              );
            }
          })
        ) : (
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
        )}
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
