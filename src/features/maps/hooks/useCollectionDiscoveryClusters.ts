/**
 * useCollectionDiscoveryClusters.ts
 *
 * The collection map's *discovery layer*: every building in the current
 * viewport, so an owner or editor can explore the catalogue from inside the
 * collection and add what belongs. It is the same server-side path `/search`
 * uses (`get_map_clusters_v3` via `useMapData`) with no filters, so there is no
 * new RPC and no new query — only a post-pass that removes buildings the
 * collection already holds and tags the rest for de-emphasized styling.
 *
 * Known imprecision: a cluster bubble is an opaque server-side count, so it can
 * still include buildings already in the collection. Only un-clustered pins can
 * be de-duplicated; zooming in resolves the overlap.
 */
import { useMemo } from 'react';
import type { Bounds } from '@/utils/map';
import type { MapFilters } from '@/types/plano-map';
import type { MapClusterViewport } from './useMapClusterViewport';
import { useMapData, type ClusterResponse } from './useMapData';

/**
 * `useMapData` skips the RPC entirely on all-zero bounds, which is how this hook
 * expresses "disabled" — a real viewport can never have zero extent.
 */
const DISABLED_BOUNDS: Bounds = { north: 0, south: 0, east: 0, west: 0 };

/** Stable identity: a fresh `{}` each render would re-key the query on every pan. */
const NO_FILTERS: MapFilters = {};

export interface UseCollectionDiscoveryClustersProps {
  /** The viewer asked for the discovery layer (owner/editor only). */
  enabled: boolean;
  /** Live, throttled map viewport; null until the map has loaded. */
  viewport: MapClusterViewport | null;
  /** Buildings already in the collection — never drawn twice. */
  collectionBuildingIds: Set<string>;
}

export function useCollectionDiscoveryClusters({
  enabled,
  viewport,
  collectionBuildingIds,
}: UseCollectionDiscoveryClustersProps): ClusterResponse[] {
  const active = enabled && !!viewport;

  const { clusters } = useMapData({
    bounds: active ? viewport!.bounds : DISABLED_BOUNDS,
    zoom: active ? viewport!.zoom : 0,
    filters: NO_FILTERS,
    mode: 'discover',
  });

  return useMemo<ClusterResponse[]>(() => {
    if (!active || !clusters) return [];
    return clusters
      .filter((c) => c.is_cluster || !collectionBuildingIds.has(String(c.id)))
      .map((c) => ({ ...c, is_discovery: true }));
  }, [active, clusters, collectionBuildingIds]);
}
