export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function getBoundsFromBuildings(buildings: { location_lat: number; location_lng: number }[]): Bounds | null {
  if (!buildings || buildings.length === 0) return null;

  // Filter out invalid coordinates (0,0 or null/undefined)
  const validBuildings = buildings.filter(b =>
    b.location_lat !== undefined &&
    b.location_lng !== undefined &&
    b.location_lat !== null &&
    b.location_lng !== null &&
    !(Math.abs(b.location_lat) < 0.0001 && Math.abs(b.location_lng) < 0.0001) // Treat roughly 0,0 as invalid
  );

  if (validBuildings.length === 0) return null;

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  validBuildings.forEach((b) => {
    if (b.location_lat > north) north = b.location_lat;
    if (b.location_lat < south) south = b.location_lat;
    if (b.location_lng > east) east = b.location_lng;
    if (b.location_lng < west) west = b.location_lng;
  });

  return { north, south, east, west };
}
