/**
 * useCollectionMapSelection.ts
 *
 * Owns the collection detail page's detail-drawer selection (parity with
 * /search). A single retained ClusterResponse payload drives the drawer, opened
 * from either a map pin (setSelectedCluster) or a list row (selectItem /
 * selectDiscoverRow / selectSavedPlace), and cleared on close or when the shown
 * building is removed. Extracted to keep CollectionMapPage under its size budget.
 *
 * Every rail band converts to the same ClusterResponse, so the drawer opens
 * identically whichever list the click came from — the three bands read three
 * different RPCs and their row shapes disagree on nearly every field name.
 */
import { useCallback, useState } from 'react';
import type { ClusterResponse } from '@/features/maps';
import type { DiscoveryBuilding } from '@/features/search';
import type { DiscoverInViewRow } from '../api/discoverInView';
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

/**
 * Build the drawer payload from a Discover row (`get_buildings_list`). Flagged
 * `is_discovery` because the building is not in the collection: that is what
 * makes the drawer's membership action offer "Add" rather than "Remove".
 */
function discoverRowToCluster(row: DiscoverInViewRow): ClusterResponse {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    is_cluster: false,
    count: 1,
    rating: row.rating,
    status: row.status,
    construction_status: row.construction_status,
    name: row.name,
    slug: row.slug ?? undefined,
    image_url: row.image_url ?? undefined,
    city: row.city ?? undefined,
    is_discovery: true,
  };
}

/**
 * Build the drawer payload from a saved place (`user_buildings`). Its `status`
 * is the *construction* status, while the library status lives in
 * `personal_status` — the one field pairing the other two shapes invert.
 */
function savedPlaceToCluster(building: DiscoveryBuilding): ClusterResponse {
  return {
    id: building.id,
    lat: building.location_lat,
    lng: building.location_lng,
    is_cluster: false,
    count: 1,
    rating: building.personal_rating ?? null,
    status: building.personal_status ?? null,
    construction_status: building.status ?? null,
    name: building.name,
    slug: building.slug ?? undefined,
    image_url:
      (building.main_image_url || building.hero_image_url || building.community_preview_url) ??
      undefined,
    city: building.city ?? undefined,
    is_discovery: true,
  };
}

export function useCollectionMapSelection() {
  const [selectedCluster, setSelectedCluster] = useState<ClusterResponse | null>(null);

  const selectItem = useCallback(
    (item: CollectionItemWithBuilding) => setSelectedCluster(collectionItemToCluster(item)),
    [],
  );
  const selectDiscoverRow = useCallback(
    (row: DiscoverInViewRow) => setSelectedCluster(discoverRowToCluster(row)),
    [],
  );
  const selectSavedPlace = useCallback(
    (building: DiscoveryBuilding) => setSelectedCluster(savedPlaceToCluster(building)),
    [],
  );
  const closeDetail = useCallback(() => setSelectedCluster(null), []);
  /** Close the drawer if it is currently showing the given building. */
  const clearIfBuilding = useCallback(
    (buildingId: string) =>
      setSelectedCluster((prev) => (prev && String(prev.id) === buildingId ? null : prev)),
    [],
  );

  return {
    selectedCluster,
    setSelectedCluster,
    selectItem,
    selectDiscoverRow,
    selectSavedPlace,
    closeDetail,
    clearIfBuilding,
  };
}
