import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MapGL, { Marker, NavigationControl, GeolocateControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { MapPin as MapPinMarker } from "@/features/maps/components/MapPin";
import { getPinStyle } from "@/features/maps/utils/pinStyling";
import type { ClusterResponse } from "@/features/maps/hooks/useMapData";

// ─── Map Tab ─────────────────────────────────────────────────────────────────

interface NearbyBuilding {
  id: string;
  short_id: number;
  slug: string | null;
  name: string;
  address: string | null;
  location_lat: number;
  location_lng: number;
  dist_meters: number;
  main_image_url: string | null;
  tier_rank_label: string | null;
  location_approximate: boolean;
}

const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const NEARBY_RADIUS_METERS = 1000;

export function BuildingMapTab({
  lat,
  lng,
  buildingId,
  buildingName,
}: {
  lat: number;
  lng: number;
  buildingId: string;
  buildingName: string;
}) {
  const [isClient, setIsClient] = useState(false);
  const [showNearby, setShowNearby] = useState(false);
  const [nearbyBuildings, setNearbyBuildings] = useState<NearbyBuilding[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => { setIsClient(true); }, []);

  const handleShowNearby = useCallback(async () => {
    if (showNearby) { setShowNearby(false); setNearbyError(null); return; }
    setIsLoadingNearby(true);
    setNearbyError(null);
    try {
      const { data, error } = await supabase.rpc("find_nearby_buildings", {
        lat,
        long: lng,
        radius_meters: NEARBY_RADIUS_METERS,
      });
      if (error) {
        setNearbyError(error.message);
      } else if (data) {
        setNearbyBuildings(
          (data as unknown as NearbyBuilding[]).filter((b) => b.id !== buildingId),
        );
      }
    } finally {
      setIsLoadingNearby(false);
      setShowNearby(true);
    }
  }, [lat, lng, buildingId, showNearby]);

  if (!isClient) {
    return <div className="h-[420px] md:h-[600px] bg-surface-muted" />;
  }

  return (
    <div className="relative h-[420px] md:h-[600px] w-full">
      <MapGL
        initialViewState={{ longitude: lng, latitude: lat, zoom: 15 }}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
        mapStyle={DEFAULT_MAP_STYLE}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" trackUserLocation showUserLocation />

        {/* Current building marker */}
        <Marker longitude={lng} latitude={lat} anchor="bottom" style={{ zIndex: 20 }}>
          <div className="flex flex-col items-center gap-0.5">
            <div className="bg-text-primary text-surface-default text-[10px] font-medium px-2 py-0.5 whitespace-nowrap max-w-[140px] truncate shadow-xs">
              {buildingName}
            </div>
            <div className="w-3 h-3 bg-text-primary rotate-45 -mt-1 shadow-xs" />
          </div>
        </Marker>

        {/* Nearby building markers */}
        {showNearby && nearbyBuildings
          .filter(b => typeof b.location_lat === 'number' && typeof b.location_lng === 'number')
          .map((b) => {
            const pinData: ClusterResponse = {
              id: b.id,
              lat: b.location_lat,
              lng: b.location_lng,
              is_cluster: false,
              count: 1,
              rating: null,
              status: null,
              name: b.name,
              slug: b.slug ?? undefined,
              tier_rank_label: b.tier_rank_label,
              location_approximate: b.location_approximate,
            };
            const pinStyle = getPinStyle(pinData);
            const isHovered = hoveredId === b.id;
            const MAP_MARKER_Z_MAX = 36;
            const zIndex = isHovered ? 37 : Math.min(pinStyle.zIndex, MAP_MARKER_Z_MAX);
            return (
              <Marker
                key={b.id}
                longitude={b.location_lng}
                latitude={b.location_lat}
                anchor="center"
                style={{ zIndex }}
              >
                <Link
                  to={b.slug ? `/building/${b.short_id}/${b.slug}` : `/building/${b.id}`}
                  onMouseEnter={() => setHoveredId(b.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  aria-label={b.name}
                >
                  <MapPinMarker style={pinStyle} isHovered={isHovered} />
                </Link>
              </Marker>
            );
          })}
      </MapGL>

      {/* Show nearby buildings button */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-50">
        <button
          type="button"
          onClick={() => void handleShowNearby()}
          disabled={isLoadingNearby}
          className="flex items-center gap-2 bg-surface-default border border-border-default shadow-md px-4 py-2.5 text-xs font-medium uppercase tracking-widest text-text-primary hover:bg-surface-muted transition-colors disabled:opacity-60"
        >
          {isLoadingNearby ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          {showNearby
            ? `Hide nearby (${nearbyBuildings.length})`
            : "Show nearby buildings"}
        </button>
      </div>

      {/* Nearby count badge */}
      {showNearby && nearbyError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-surface-default border border-border-default shadow-xs px-3 py-1.5 text-xs text-feedback-destructive">
          Could not load nearby buildings
        </div>
      )}
      {showNearby && !nearbyError && nearbyBuildings.length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-surface-default border border-border-default shadow-xs px-3 py-1.5 text-xs text-text-secondary">
          No other buildings found within 1 km
        </div>
      )}
    </div>
  );
}
