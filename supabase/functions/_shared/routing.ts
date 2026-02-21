import { BuildingLocation } from "./clustering.ts";

export interface RouteResult {
  dayNumber: number;
  buildingIds: string[];
  routeGeometry: any;
  isFallback: boolean;
}

export async function generateRouteForCluster(
  cluster: BuildingLocation[],
  dayNumber: number,
  transportMode: string,
  mapboxAccessToken?: string
): Promise<RouteResult> {
    const buildingIds = cluster.map(b => b.id);

    if (cluster.length < 2) {
        return {
            dayNumber,
            buildingIds,
            routeGeometry: null,
            isFallback: false
        };
    }

    try {
        if (!mapboxAccessToken) {
            throw new Error('Mapbox token missing');
        }

        const mapboxProfile = transportMode === 'cycling' ? 'cycling' :
                              transportMode === 'walking' ? 'walking' : 'driving';

        // Limit for Optimization API is 12 coordinates.
        // If we have more, we can't optimize directly.
        // Fallback strategy: Sort by Nearest Neighbor heuristic, then use Directions API (which handles 25 points, so we chunk if needed).
        if (cluster.length > 12) {
            console.log(`Cluster size ${cluster.length} exceeds Optimization API limit (12). Using Directions API with Nearest Neighbor heuristic.`);

            // 1. Sort using heuristic
            const sortedCluster = sortClusterByNearestNeighbor(cluster);

            // 2. Get geometry from Directions API (chunked)
            const geometry = await getDirectionsGeometry(sortedCluster, mapboxProfile, mapboxAccessToken);

            if (!geometry) {
                throw new Error("Failed to generate directions geometry");
            }

            return {
                dayNumber,
                buildingIds: sortedCluster.map(b => b.id),
                routeGeometry: geometry,
                isFallback: false
            };
        }

        // Use Optimization API for small clusters (<= 12)
        const coordinates = cluster
            .map(b => `${b.lng},${b.lat}`)
            .join(';');

        const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/${mapboxProfile}/${coordinates}?roundtrip=false&source=any&destination=any&geometries=geojson&access_token=${mapboxAccessToken}`;

        const response = await fetch(url);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Mapbox Optimization API error: ${response.status} ${errText}`);
        }

        const data = await response.json();

        if (!data.trips || data.trips.length === 0) {
            throw new Error('No optimized route found');
        }

        const sortedWaypoints = data.waypoints.sort((a: any, b: any) => a.trips_index - b.trips_index);
        const sortedCluster = sortedWaypoints.map((wp: any) => cluster[wp.waypoint_index]);

        return {
            dayNumber,
            buildingIds: sortedCluster.map((b: any) => b.id),
            routeGeometry: data.trips[0].geometry,
            isFallback: false
        };

    } catch (error) {
        console.warn(`Routing failed for day ${dayNumber}:`, error);

        const sortedCluster = sortClusterByNearestNeighbor(cluster);
        const fallbackGeometry = {
            type: "LineString",
            coordinates: sortedCluster.map(b => [b.lng, b.lat])
        };

        return {
            dayNumber,
            buildingIds: sortedCluster.map(b => b.id),
            routeGeometry: fallbackGeometry,
            isFallback: true
        };
    }
}

async function getDirectionsGeometry(
  locations: BuildingLocation[],
  profile: string,
  accessToken: string
): Promise<any> {
  // Mapbox Directions API limit is 25
  const chunkSize = 25;
  const chunks: BuildingLocation[][] = [];

  // Create chunks with 1 point overlap to ensure continuity
  // i.e., Chunk 1: 0..24, Chunk 2: 24..49
  // The logic i += (chunkSize - 1) ensures the last element of chunk N becomes the first element of chunk N+1
  for (let i = 0; i < locations.length; i += (chunkSize - 1)) {
      const end = Math.min(i + chunkSize, locations.length);
      const chunk = locations.slice(i, end);
      chunks.push(chunk);
      if (end === locations.length) break;
  }

  const geometries: any[] = [];

  for (const chunk of chunks) {
      if (chunk.length < 2) continue;

      const coords = chunk.map(b => `${b.lng},${b.lat}`).join(';');

      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?geometries=geojson&steps=false&access_token=${accessToken}`;

      const res = await fetch(url);
      if (!res.ok) {
          const err = await res.text();
          console.warn(`Directions API chunk failed: ${res.status} ${err}`);
          throw new Error(`Directions API chunk failed: ${res.status}`);
      }
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
          geometries.push(data.routes[0].geometry);
      }
  }

  // Merge geometries (LineStrings)
  if (geometries.length === 0) return null;

  const mergedCoordinates: any[] = [];
  geometries.forEach((geo, index) => {
      if (index > 0) {
          // Skip first point as it duplicates last point of previous chunk
          mergedCoordinates.push(...geo.coordinates.slice(1));
      } else {
          mergedCoordinates.push(...geo.coordinates);
      }
  });

  return {
      type: 'LineString',
      coordinates: mergedCoordinates
  };
}

function sortClusterByNearestNeighbor(buildings: BuildingLocation[]): BuildingLocation[] {
    if (buildings.length <= 2) return buildings;

    const sorted: BuildingLocation[] = [buildings[0]];
    const remaining = new Set(buildings.slice(1));

    while (remaining.size > 0) {
        const current = sorted[sorted.length - 1];
        let nearest: BuildingLocation | null = null;
        let minDist = Infinity;

        for (const candidate of remaining) {
            const d = Math.sqrt(Math.pow(candidate.lat - current.lat, 2) + Math.pow(candidate.lng - current.lng, 2));
            if (d < minDist) {
                minDist = d;
                nearest = candidate;
            }
        }

        if (nearest) {
            sorted.push(nearest);
            remaining.delete(nearest);
        } else {
            break;
        }
    }
    return sorted;
}
