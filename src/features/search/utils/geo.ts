/**
 * Coordinate helpers for the search map. Extracted from useBuildingSearch.
 */
const EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters
const VALID_LOCATION_THRESHOLD = 0.0001; // Threshold for filtering invalid (0,0) coordinates

// Haversine distance in meters
export function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = EARTH_RADIUS_METERS * c;
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Validate if coordinates are valid and not at (0,0)
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(Math.abs(lat) < VALID_LOCATION_THRESHOLD && Math.abs(lng) < VALID_LOCATION_THRESHOLD)
  );
}
