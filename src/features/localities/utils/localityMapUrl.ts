import type { LocalityBuildingDTO } from "../types";

/**
 * Zoom level that frames a city on the search map — the same city-scale zoom
 * `AddBuilding` and the collection map use.
 */
export const LOCALITY_MAP_ZOOM = 12;

/** A geolocated point good enough to centre a map on. */
function isUsableCoord(lat: number | null | undefined, lng: number | null | undefined) {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  // (0, 0) is the "no location" sentinel LocalityBuildingDTO uses, and Null
  // Island is never a real city centre.
  return lat !== 0 || lng !== 0;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Derive a city centre from the buildings already loaded for the page. Used
 * when `localities.lat/lng` is null (a city whose buildings were all added
 * after the coordinate backfill, or one with no geolocated buildings yet).
 *
 * Median rather than mean, for the same reason the backfill migration uses it:
 * one mis-geocoded building would otherwise drag the centre out of town.
 */
export function deriveLocalityCenter(
  buildings: Pick<LocalityBuildingDTO, "location_lat" | "location_lng">[],
): { lat: number; lng: number } | null {
  const points = buildings.filter((b) => isUsableCoord(b.location_lat, b.location_lng));
  if (points.length === 0) return null;
  return {
    lat: median(points.map((b) => b.location_lat)),
    lng: median(points.map((b) => b.location_lng)),
  };
}

/**
 * The city guide's "Explore map" destination: the real search map, opened with
 * its viewport already sitting over this city.
 *
 * `/map` reads `lat`/`lng`/`zoom` straight into the map store
 * (`parseMapStateFromParams`), and supplying `lat`/`lng` also suppresses the
 * page's silent geolocation prompt — so the member lands on their city rather
 * than on the zoom-2 world view or wherever their GPS puts them.
 *
 * Falls back to a text search on the city name when no coordinate is available
 * anywhere, which at least lands the member somewhere relevant.
 */
export function buildLocalityMapUrl({
  city,
  lat,
  lng,
  buildings = [],
}: {
  city: string;
  lat?: number | null;
  lng?: number | null;
  buildings?: Pick<LocalityBuildingDTO, "location_lat" | "location_lng">[];
}): string {
  const center = isUsableCoord(lat, lng)
    ? { lat: lat as number, lng: lng as number }
    : deriveLocalityCenter(buildings);

  if (!center) return `/map?q=${encodeURIComponent(city)}`;

  const params = new URLSearchParams({
    lat: String(center.lat),
    lng: String(center.lng),
    zoom: String(LOCALITY_MAP_ZOOM),
  });
  return `/map?${params.toString()}`;
}
