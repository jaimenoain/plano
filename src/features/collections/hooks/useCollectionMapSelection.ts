/**
 * useCollectionMapSelection.ts
 *
 * Owns the collection detail page's detail-drawer selection (parity with
 * /search). A single retained ClusterResponse payload drives the drawer, opened
 * from either a map pin (setSelectedCluster) or a list row (selectItem), and
 * cleared on close or when the shown building is removed. Extracted to keep
 * CollectionMapPage under its size budget.
 */
import { useCallback, useState } from 'react';
import type { ClusterResponse } from '@/features/maps';
import type { CollectionItemWithBuilding } from '../types';

/**
 * Build the drawer payload from a collection item, mirroring the shape a map pin
 * supplies so BuildingDetailDrawer renders identically from list or pin.
 */
function collectionItemToCluster(item: CollectionItemWithBuilding): ClusterResponse {
  const b = item.building;
  return {
    id: b.id,
    lat: b.location_lat,
    lng: b.location_lng,
    is_cluster: false,
    count: 1,
    rating: null,
    status: null,
    construction_status: null,
    name: b.name,
    slug: b.slug ?? undefined,
    image_url: (b.hero_image_url || b.community_preview_url) ?? undefined,
    city: b.city ?? undefined,
  };
}

export function useCollectionMapSelection() {
  const [selectedCluster, setSelectedCluster] = useState<ClusterResponse | null>(null);

  const selectItem = useCallback(
    (item: CollectionItemWithBuilding) => setSelectedCluster(collectionItemToCluster(item)),
    [],
  );
  const closeDetail = useCallback(() => setSelectedCluster(null), []);
  /** Close the drawer if it is currently showing the given building. */
  const clearIfBuilding = useCallback(
    (buildingId: string) =>
      setSelectedCluster((prev) => (prev && String(prev.id) === buildingId ? null : prev)),
    [],
  );

  return { selectedCluster, setSelectedCluster, selectItem, closeDetail, clearIfBuilding };
}
