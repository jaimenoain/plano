import { useState, useRef, useEffect } from "react";
import Map, { Marker, NavigationControl, GeolocateControl, MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers, Maximize2, Minimize2 } from "lucide-react";
import { MapPin as MapPinComponent } from "./MapPin";
import { getPinStyle } from "../utils/pinStyling";
import { ClusterResponse } from "../hooks/useMapData";
import { SATELLITE_MAP_STYLE } from "@/features/maps/constants/satelliteMapStyle";

interface BuildingLocationMapProps {
  lat: number;
  lng: number;
  className?: string;
  status?: 'visited' | 'pending' | 'ignored' | null;
  rating?: number;
  tierRank?: string | null;
  locationPrecision?: "exact" | "approximate" | string | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

export function BuildingLocationMap({
  lat,
  lng,
  className,
  status,
  rating = 0,
  tierRank,
  locationPrecision = 'exact',
  isExpanded,
  onToggleExpand
}: BuildingLocationMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isApproximate = locationPrecision === 'approximate';

  // Construct a partial ClusterResponse object to feed into getPinStyle
  const pinData: Partial<ClusterResponse> = {
    id: 'current-building', // Dummy ID
    lat,
    lng,
    rating: rating,
    status: status ?? null,
    tier_rank_label: tierRank || null,
    is_cluster: false,
    count: 1,
    location_approximate: isApproximate
  };

  // Get the style from the utility
  const pinStyle = getPinStyle(pinData as ClusterResponse);

  const outerClass =
    isExpanded
      ? "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      : `relative rounded-xl overflow-hidden border border-white/10 ${className || ""}`;

  const innerClass =
    isExpanded
      ? "relative w-full h-full max-w-7xl max-h-[90vh] bg-surface-default rounded-xl overflow-hidden shadow-2xl border border-white/10"
      : "w-full h-full";

  if (!isClient) {
    return (
      <div
        className={outerClass}
        onClick={isExpanded && onToggleExpand ? onToggleExpand : undefined}
        data-testid="map-backdrop"
      >
        <div
          className={`${innerClass} flex min-h-48 items-center justify-center bg-surface-muted`}
          onClick={isExpanded ? (e) => e.stopPropagation() : undefined}
          data-testid="map-inner-container"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div
      className={outerClass}
      onClick={isExpanded && onToggleExpand ? onToggleExpand : undefined}
      data-testid="map-backdrop"
    >
      <div
        className={innerClass}
        onClick={isExpanded ? (e) => e.stopPropagation() : undefined}
        data-testid="map-inner-container"
      >
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: lng,
            latitude: lat,
            zoom: 15
          }}
          mapLib={maplibregl}
          style={{ width: "100%", height: "100%" }}
          mapStyle={isSatellite ? SATELLITE_MAP_STYLE : DEFAULT_MAP_STYLE}
          attributionControl={false}
        >
          <NavigationControl position="bottom-right" />
          <GeolocateControl position="bottom-right" trackUserLocation={true} showUserLocation={true} />

          <Marker
              longitude={lng}
              latitude={lat}
              anchor={pinStyle.shape === 'pin' ? "bottom" : "center"}
              style={{ zIndex: 10 }}
          >
              <MapPinComponent
                  style={pinStyle}
                  isHovered={false}
              />
          </Marker>
        </Map>

        <div className="absolute top-2 left-2 flex flex-col gap-2 z-[60]">
            <button
              onClick={(e) => {
                  e.stopPropagation();
                  setIsSatellite(!isSatellite);
              }}
              className="p-2 bg-surface-default/90 backdrop-blur rounded-md border shadow-sm hover:bg-surface-muted transition-colors flex items-center gap-2"
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
              className="absolute top-2 right-2 p-2 bg-surface-default/90 backdrop-blur rounded-md border shadow-sm hover:bg-surface-muted transition-colors z-[60]"
              title={isExpanded ? "Collapse Map" : "Expand Map"}
          >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
