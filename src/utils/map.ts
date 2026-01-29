export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function getBoundsFromBuildings(buildings: { location_lat: number; location_lng: number }[]): Bounds | null {
  if (!buildings || buildings.length === 0) return null;

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  buildings.forEach((b) => {
    if (b.location_lat > north) north = b.location_lat;
    if (b.location_lat < south) south = b.location_lat;
    if (b.location_lng > east) east = b.location_lng;
    if (b.location_lng < west) west = b.location_lng;
  });

  return { north, south, east, west };
}
