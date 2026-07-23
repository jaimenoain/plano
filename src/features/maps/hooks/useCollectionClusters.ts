/**
 * useCollectionClusters.ts
 *
 * Client-side Supercluster clustering for the collection map. Builds the index
 * from the collection's buildings (+ itinerary sequence assignments) and returns
 * the visible ClusterResponse[] for the current zoom. Extracted from
 * CollectionMapGL to keep that component under its size budget; logic unchanged.
 */
import { useMemo } from 'react';
import Supercluster from 'supercluster';
import type { DiscoveryBuilding } from '@/features/search/components/types';
import { getGlobalTierRank } from '../utils/pinStyling';
import type { ClusterResponse } from './useMapData';

type ItineraryMap = Map<string, { dayIndex: number; sequence: number }>;

export function useCollectionClusters(
  buildings: DiscoveryBuilding[],
  itineraryMap: ItineraryMap,
  zoom: number,
): ClusterResponse[] {
  // Build supercluster index whenever buildings or itinerary assignments change.
  // Each point stores a numeric tier_rank (1–5) so clusters can surface the
  // highest-ranked building they contain via the reduce aggregation (max_tier).
  const superclusterIndex = useMemo(() => {
    const sc = new Supercluster({
      radius: 60,
      maxZoom: 16,
      map: (props: Record<string, unknown>) => ({ max_tier: (props.tier_rank as number) ?? 1 }),
      reduce: (acc: Record<string, unknown>, props: Record<string, unknown>) => {
        acc.max_tier = Math.max((acc.max_tier as number) ?? 1, (props.max_tier as number) ?? 1);
      },
    });

    const points = buildings
      .filter((b) => b.location_lat !== 0 || b.location_lng !== 0)
      .map((b) => {
        const itineraryInfo = itineraryMap.get(b.id);
        const tierLabel = typeof b.tier_rank === 'string' ? b.tier_rank : null;
        const tierRank = getGlobalTierRank(tierLabel);

        return {
          type: 'Feature' as const,
          properties: {
            id: b.id,
            name: b.name ?? '',
            slug: b.slug ?? null,
            image_url: b.main_image_url ?? null,
            image_attribution: b.image_attribution ?? null,
            tier_rank: tierRank,
            tier_rank_label: tierLabel,
            rating: b.personal_rating ?? null,
            status: b.personal_status ?? null,
            color: b.color ?? null,
            is_custom_marker: b.isMarker ?? false,
            marker_category: b.markerCategory ?? null,
            marker_google_primary_type: b.markerGooglePrimaryType ?? null,
            notes: b.notes ?? null,
            is_candidate: b.isCandidate ?? false,
            address: b.address ?? null,
            google_place_id: b.google_place_id ?? null,
            website: b.website ?? null,
            itinerary_sequence: itineraryInfo?.sequence,
            itinerary_day_index: itineraryInfo?.dayIndex,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [b.location_lng, b.location_lat],
          },
        };
      });

    sc.load(points);
    return sc;
  }, [buildings, itineraryMap]);

  // Recompute visible clusters on every zoom change (cheap index lookup).
  return useMemo<ClusterResponse[]>(() => {
    const roundedZoom = Math.round(zoom);
    const features = superclusterIndex.getClusters([-180, -85, 180, 85], roundedZoom);

    return features.map((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties as Record<string, unknown>;

      if (props.cluster) {
        return {
          id: props.cluster_id as string | number,
          lat,
          lng,
          is_cluster: true,
          count: props.point_count as number,
          max_tier: (props.max_tier as number) ?? 1,
          rating: null,
          status: null,
        } as ClusterResponse;
      }

      return {
        id: props.id as string,
        lat,
        lng,
        is_cluster: false,
        count: 1,
        name: props.name as string,
        slug: (props.slug as string | null) ?? undefined,
        image_url: (props.image_url as string | null) ?? undefined,
        image_attribution: (props.image_attribution as string[] | null) ?? undefined,
        tier_rank: props.tier_rank as number,
        tier_rank_label: props.tier_rank_label as string | null,
        rating: props.rating as number | null,
        status: props.status as string | null,
        color: props.color as string | null,
        is_custom_marker: props.is_custom_marker as boolean,
        marker_category: (props.marker_category as string | null) ?? undefined,
        marker_google_primary_type: props.marker_google_primary_type as string | null,
        notes: props.notes as string | null,
        is_candidate: props.is_candidate as boolean,
        address: props.address as string | null,
        google_place_id: props.google_place_id as string | null,
        website: (props.website as string | null) ?? undefined,
        itinerary_sequence: props.itinerary_sequence as number | undefined,
        itinerary_day_index: props.itinerary_day_index as number | undefined,
      } as ClusterResponse;
    });
  }, [superclusterIndex, zoom]);
}
