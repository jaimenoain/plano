/**
 * useCollectionMapClusters.ts
 *
 * Everything the collection map draws, as one `ClusterResponse[]`. Two sources,
 * deliberately kept separate (see docs/decisions/0021-collection-map-discovery-layer.md):
 *
 *   - the collection itself — client-side Supercluster over the already-loaded
 *     items, so pins react instantly to adds/removes and carry itinerary numbers;
 *   - the discovery layer — server-side `get_map_clusters_v3` by viewport, the
 *     only way to draw a catalogue far too large to hold in memory.
 *
 * Collection clusters come first in the merged array: `MapMarkers` de-duplicates
 * by marker key keeping the first occurrence, so a building in both layers keeps
 * its collection identity.
 *
 * Extracted from `CollectionMapGL` (with the itinerary sequence map it feeds) to
 * keep that component inside its size budget.
 */
import { useMemo } from 'react';
import type { DiscoveryBuilding } from '@/features/search';
import { useItineraryStore } from '@/features/itinerary';
import { useCollectionClusters } from './useCollectionClusters';
import {
  useCollectionDiscoveryClusters,
  type UseCollectionDiscoveryClustersProps,
} from './useCollectionDiscoveryClusters';
import type { ClusterResponse } from './useMapData';

export interface UseCollectionMapClustersProps {
  buildings: DiscoveryBuilding[];
  /** Number the pins with their itinerary stop sequence. */
  showItinerary?: boolean;
  zoom: number;
  discovery: UseCollectionDiscoveryClustersProps & {
    /** Draw only the discovery layer — the collection's own pins step aside. */
    hideCollectionPins: boolean;
  };
}

export function useCollectionMapClusters({
  buildings,
  showItinerary,
  zoom,
  discovery,
}: UseCollectionMapClustersProps): ClusterResponse[] {
  const days = useItineraryStore((state) => state.days);

  // Map building IDs to their itinerary sequence and day index
  const itineraryMap = useMemo(() => {
    if (!showItinerary) return new Map<string, { dayIndex: number; sequence: number }>();

    const map = new Map<string, { dayIndex: number; sequence: number }>();
    if (days) {
      days.forEach((day, dayIndex) => {
        day.stops?.forEach((stop, index) => {
          const key = stop.referenceId || stop.id;
          if (!map.has(key)) {
            map.set(key, { dayIndex, sequence: index + 1 });
          }
        });
      });
    }
    return map;
  }, [days, showItinerary]);

  const collectionClusters = useCollectionClusters(buildings, itineraryMap, zoom);
  const discoveryClusters = useCollectionDiscoveryClusters(discovery);

  return useMemo(() => {
    if (!discovery.enabled) return collectionClusters;
    if (discovery.hideCollectionPins) return discoveryClusters;
    return [...collectionClusters, ...discoveryClusters];
  }, [discovery.enabled, discovery.hideCollectionPins, collectionClusters, discoveryClusters]);
}
