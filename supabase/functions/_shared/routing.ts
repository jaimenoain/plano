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

        const coordinates = cluster
            .map(b => `${b.lng},${b.lat}`)
            .join(';');

        const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/${mapboxProfile}/${coordinates}?roundtrip=false&source=any&destination=any&geometries=geojson&access_token=${mapboxAccessToken}`;

        const response = await fetch(url);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Mapbox API error: ${response.status} ${errText}`);
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
