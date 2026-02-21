
export interface BuildingLocation {
  id: string;
  lat: number;
  lng: number;
  [key: string]: any;
}

interface Point {
  lat: number;
  lng: number;
}

function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
}

export function kMeans<T extends BuildingLocation>(buildings: T[], k: number, maxIterations: number = 100): T[][] {
  if (!buildings || buildings.length === 0) {
    return [];
  }

  if (k <= 0) {
      return [];
  }

  if (buildings.length <= k) {
    // Each building gets its own cluster
    return buildings.map(b => [b]);
  }

  // Initialize centroids
  // We can pick k random buildings as initial centroids
  let centroids: Point[] = [];
  const indices = new Set<number>();

  // Safety break to prevent infinite loop if for some reason random picking fails (unlikely)
  let attempts = 0;
  while (centroids.length < k && attempts < buildings.length * 2) {
    const idx = Math.floor(Math.random() * buildings.length);
    if (!indices.has(idx)) {
      indices.add(idx);
      centroids.push({ lat: buildings[idx].lat, lng: buildings[idx].lng });
    }
    attempts++;
  }

  // If we couldn't find k unique points (duplicate coords?), fill with existing
  while (centroids.length < k) {
      centroids.push({ lat: buildings[0].lat, lng: buildings[0].lng });
  }

  let clusters: T[][] = Array.from({ length: k }, () => []);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign buildings to nearest centroid
    const newClusters: T[][] = Array.from({ length: k }, () => []);

    for (const building of buildings) {
      let minDist = Infinity;
      let clusterIndex = 0;

      centroids.forEach((centroid, index) => {
        const d = distance(building, centroid);
        if (d < minDist) {
          minDist = d;
          clusterIndex = index;
        }
      });

      newClusters[clusterIndex].push(building);
    }

    // Update centroids
    const newCentroids: Point[] = [];
    let converged = true;

    for (let i = 0; i < k; i++) {
      const cluster = newClusters[i];
      if (cluster.length === 0) {
        // Handle empty cluster: Keep old centroid
        newCentroids.push(centroids[i]);
        continue;
      }

      const sumLat = cluster.reduce((sum, b) => sum + b.lat, 0);
      const sumLng = cluster.reduce((sum, b) => sum + b.lng, 0);

      const newCentroid = {
        lat: sumLat / cluster.length,
        lng: sumLng / cluster.length
      };

      newCentroids.push(newCentroid);

      if (distance(centroids[i], newCentroid) > 0.000001) {
        converged = false;
      }
    }

    centroids = newCentroids;
    clusters = newClusters;

    if (converged) break;
  }

  // Filter out empty clusters and return
  return clusters.filter(c => c.length > 0);
}
