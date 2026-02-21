
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

function balanceClusters<T extends BuildingLocation>(clusters: T[][], k: number, totalBuildings: number): T[][] {
  // If we have very few buildings per day, strict balancing might force bad splits.
  if (totalBuildings < k * 2) {
    return clusters;
  }

  const idealSize = totalBuildings / k;
  // Threshold: Ensure smallest cluster has at least ~70% of the ideal size
  // e.g. for 13 items / 2 days = 6.5 -> min 4.
  const minSize = Math.max(1, Math.floor(idealSize * 0.7));

  // Rebalance loop
  // Limit iterations to prevent infinite loop (max iterations = total buildings to be safe)
  for (let i = 0; i < totalBuildings; i++) {
    // Find smallest and largest clusters
    let minIdx = -1;
    let maxIdx = -1;
    let minCount = Infinity;
    let maxCount = -Infinity;

    for (let c = 0; c < clusters.length; c++) {
      if (clusters[c].length < minCount) {
        minCount = clusters[c].length;
        minIdx = c;
      }
      if (clusters[c].length > maxCount) {
        maxCount = clusters[c].length;
        maxIdx = c;
      }
    }

    // Check termination conditions
    if (minCount >= minSize) break; // Smallest is big enough
    if (maxCount <= minSize + 1) break; // Largest cannot give more points without becoming too small
    if (minIdx === maxIdx) break; // Only one cluster or all equal

    // Move a point from max to min
    // Heuristic: Pick the point in Max that is closest to Min's centroid
    const targetCluster = clusters[minIdx];
    const sourceCluster = clusters[maxIdx];

    // Calculate centroid of target cluster
    let targetCentroid: Point;
    if (targetCluster.length > 0) {
      targetCentroid = {
        lat: targetCluster.reduce((sum, b) => sum + b.lat, 0) / targetCluster.length,
        lng: targetCluster.reduce((sum, b) => sum + b.lng, 0) / targetCluster.length
      };
    } else {
       // Should not happen as input is filtered, but fallback just in case
       targetCentroid = { lat: 0, lng: 0 };
    }

    let bestPointIdx = -1;
    let bestDist = Infinity;

    // Find the point in the source cluster that is closest to the target centroid
    for (let p = 0; p < sourceCluster.length; p++) {
      const d = distance(sourceCluster[p], targetCentroid);
      if (d < bestDist) {
        bestDist = d;
        bestPointIdx = p;
      }
    }

    if (bestPointIdx !== -1) {
      const point = sourceCluster.splice(bestPointIdx, 1)[0];
      targetCluster.push(point);
    } else {
      break;
    }
  }

  return clusters;
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

  // Filter out empty clusters
  const finalClusters = clusters.filter(c => c.length > 0);

  // Apply load balancing
  return balanceClusters(finalClusters, k, buildings.length);
}
