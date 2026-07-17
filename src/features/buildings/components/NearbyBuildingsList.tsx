import { MapPin, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getBuildingImageUrl } from "@/utils/image";

export interface NearbyBuilding {
  id: string;
  name: string;
  address: string | null;
  location_lat: number;
  location_lng: number;
  dist_meters: number;
  similarity_score?: number;
  location_precision?: "exact" | "approximate";
  main_image_url?: string | null;
}

/** A building is a location match if it's within 50m or flagged approximate. */
function isLocationMatch(b: NearbyBuilding): boolean {
  return b.dist_meters <= 50 || b.location_precision === "approximate";
}

function BuildingRow({
  building,
  onSelect,
  variant,
}: {
  building: NearbyBuilding;
  onSelect: (id: string) => void;
  variant: "location" | "name";
}) {
  const isLocation = variant === "location";
  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-sm border text-sm transition-colors ${
        isLocation
          ? "border-feedback-warning/40 bg-feedback-warning/10 hover:bg-feedback-warning/15"
          : "hover:bg-surface-muted/50"
      }`}
    >
      <div
        className="cursor-pointer flex gap-3"
        // Locality URL not available: NearbyBuilding does not include locality_country_code/city_slug — requires duplicate-check RPC to join localities table
        onClick={() => onSelect(building.id)}
      >
        <Avatar className="h-10 w-10 rounded-none">
          {!isLocation && (
            <AvatarImage
              src={getBuildingImageUrl(building.main_image_url) || undefined}
              alt={building.name}
              className="object-cover"
            />
          )}
          <AvatarFallback className="rounded-none">
            <Building2 className="h-5 w-5 text-text-secondary" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium flex justify-between items-start">
            <span className="truncate pr-1">{building.name}</span>
            <span
              className={`text-xs whitespace-nowrap ${
                isLocation ? "text-feedback-warning font-medium" : "text-text-secondary"
              }`}
            >
              {isLocation
                ? `${building.dist_meters.toFixed(0)}m`
                : `${(building.dist_meters / 1000).toFixed(1)}km`}
            </span>
          </div>
          {building.address && (
            <p className="text-xs text-text-secondary line-clamp-2">{building.address}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The grouped list of already-in-database buildings surfaced by the duplicate
 * check — "Same location / vicinity" (warning-toned) and "Similar names (far
 * away)". Shared by the Add Building sidebar panel and the duplicate dialog.
 */
export function NearbyBuildingsList({
  duplicates,
  onSelect,
}: {
  duplicates: NearbyBuilding[];
  onSelect: (id: string) => void;
}) {
  const locationMatches = duplicates.filter(isLocationMatch);
  const nameMatches = duplicates.filter((d) => !isLocationMatch(d));

  return (
    <>
      {locationMatches.length > 0 && (
        <div className="space-y-2">
          <div className="eyebrow tracking-widest flex items-center gap-2">
            <MapPin className="h-3 w-3" /> Same location / vicinity
          </div>
          {locationMatches.map((building) => (
            <BuildingRow
              key={building.id}
              building={building}
              onSelect={onSelect}
              variant="location"
            />
          ))}
        </div>
      )}

      {nameMatches.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="eyebrow tracking-widest">Similar names (far away)</div>
          {nameMatches.map((building) => (
            <BuildingRow
              key={building.id}
              building={building}
              onSelect={onSelect}
              variant="name"
            />
          ))}
        </div>
      )}
    </>
  );
}
