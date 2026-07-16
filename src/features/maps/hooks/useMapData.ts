import { useMemo, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveConstructionStatuses } from '@/lib/buildingStatus';
import { Bounds } from '@/utils/map';
import { MapFilters, MapMode } from '@/types/plano-map';
import { getGlobalTierRank, getPersonalTierRank } from '../utils/pinStyling';

export interface ClusterResponse {
  id: string | number;
  lat: number;
  lng: number;
  is_cluster: boolean;
  count: number;
  rating: number | null;
  status: string | null;
  name?: string;
  slug?: string;
  image_url?: string;
  image_attribution?: string[];
  is_custom_marker?: boolean;
  marker_category?: string;
  /** Google Places primary type for trip-logistics pins (e.g. `bakery`); refines icon vs coarse `marker_category`. */
  marker_google_primary_type?: string | null;
  notes?: string | null;
  is_candidate?: boolean;
  address?: string | null;
  google_place_id?: string | null;
  website?: string | null;
  tier_rank_label?: string | null;
  tier_rank?: number;
  location_approximate?: boolean;
  max_tier?: number;
  color?: string | null;
  itinerary_sequence?: number;
  itinerary_day_index?: number;
  photos_count?: number;
  city?: string;
  /** Raw construction status (buildings.status: Built/Lost/Unbuilt/Under Construction/Temporary). Distinct from `status` (user library status). Null for clusters. */
  construction_status?: string | null;
}

export interface UseMapDataProps {
  bounds: Bounds;
  zoom: number;
  filters: MapFilters;
  mode?: MapMode;
}

// 30% buffer
const BUFFER_RATIO = 0.3;
const MAX_LAT = 85;
const MIN_LAT = -85;
const MAX_LNG = 180;
const MIN_LNG = -180;

function calculateFetchBox(bounds: Bounds): Bounds {
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;

  const latBuffer = latSpan * BUFFER_RATIO;
  const lngBuffer = lngSpan * BUFFER_RATIO;

  const north = Math.min(MAX_LAT, bounds.north + latBuffer);
  const south = Math.max(MIN_LAT, bounds.south - latBuffer);
  const east = Math.min(MAX_LNG, bounds.east + lngBuffer);
  const west = Math.max(MIN_LNG, bounds.west - lngBuffer);

  return { north, south, east, west };
}

/** Row shape from `get_map_clusters_v3` RPC (subset used for tier logic). */
interface MapClusterRpcRow {
  rating?: number | null;
  status?: string | null;
  tier_rank?: string | number | null;
}

type MapClusterRpcItem = MapClusterRpcRow & Record<string, unknown>;

function calculateTierRank(item: MapClusterRpcRow, mode: MapMode): number {
  // Mode selects the code (aligned with getPinStyle): library → the user's own
  // points; discover → global percentile bands. Numeric rank 1–5 for
  // downstream aggregation; pins style from the label / rating directly.
  if (mode === 'library') {
    return getPersonalTierRank(item.rating, item.status);
  }
  return getGlobalTierRank(typeof item.tier_rank === 'string' ? item.tier_rank : null);
}

export function useMapData({ bounds, zoom, filters, mode = 'discover' }: UseMapDataProps) {
  const fetchBox = useMemo(() => calculateFetchBox(bounds), [bounds]);
  const zoomLevel = Math.round(zoom);

  // Phase 3 — flatten filters to a stable scalar key. The previous queryKey
  // included whole object references (filters.collections, filters.contacts,
  // filters.creditCompany, filters.people) whose identity changed every render
  // and queued up RPC calls during fast map panning.
  const statusFilter = useMemo(() => resolveConstructionStatuses(filters), [filters]);
  const filterKey = useMemo(() => {
    const allAttributeIds = [
      ...(filters.attributes || []),
      ...(filters.materials || []),
      ...(filters.styles || []),
      ...(filters.contexts || []),
    ];
    const uniqueAttributeIds = [...new Set(allAttributeIds)];
    return JSON.stringify({
      query: filters.query ?? null,
      category: filters.category ?? null,
      typologies: filters.typologies ?? null,
      attributeIds: uniqueAttributeIds,
      peopleIds: filters.people?.map((p) => p.id) ?? null,
      status: filters.status ?? null,
      minRating: filters.minRating ?? null,
      personalMinRating: filters.personalMinRating ?? null,
      contactMinRating: filters.contactMinRating ?? null,
      ratedBy: filters.contacts?.map((c) => c.name) ?? filters.ratedBy ?? null,
      filterContacts: filters.filterContacts ?? null,
      collections: filters.collections?.map((c) => c.id) ?? null,
      folders: filters.folderIds ?? null,
      hideVisited: filters.hideVisited ?? null,
      hideSaved: filters.hideSaved ?? null,
      hideWithoutImages: filters.hideWithoutImages ?? null,
      access: [
        filters.accessLevels ?? null,
        filters.accessLogistics ?? null,
        filters.accessCosts ?? null,
      ],
      creditCompanyId: filters.creditCompany?.id ?? null,
      creditRoles: filters.creditRoles ?? null,
      awardId: filters.awardId ?? null,
      awardOutcome: filters.awardOutcome ?? null,
      awardYearFrom: filters.awardYearFrom ?? null,
      awardYearTo: filters.awardYearTo ?? null,
      sizeCategories: filters.sizeCategories ?? null,
      minSizeSqm: filters.minSizeSqm ?? null,
      maxSizeSqm: filters.maxSizeSqm ?? null,
      minStoreys: filters.minStoreys ?? null,
      maxStoreys: filters.maxStoreys ?? null,
      centuries: filters.centuries ?? null,
      constructionStatuses: statusFilter.construction_statuses ?? null,
      excludeConstructionStatuses: statusFilter.exclude_construction_statuses ?? null,
      photographyGaps: filters.photographyGaps ?? null,
      gapPhotoCounts: filters.gapPhotoCounts ?? null,
    });
  }, [filters, statusFilter]);

  // AbortController ref — cancels in-flight RPC calls when the map pans /
  // filters change. Without this, fast panning queues up requests and freezes
  // the UI when they all resolve at once.
  const abortRef = useRef<AbortController | null>(null);

  // Skip the RPC when the bounds are the all-zero fallback passed by PlanoMap
  // before the map has loaded. A real viewport always has non-zero extent.
  const isDegenerateBounds =
    fetchBox.north === 0 &&
    fetchBox.south === 0 &&
    fetchBox.east === 0 &&
    fetchBox.west === 0;

  const { data: clusters, isLoading, isFetching, error } = useQuery({
    queryKey: ['map-clusters-v3', fetchBox, zoomLevel, filterKey, mode],
    enabled: !isDegenerateBounds,
    queryFn: async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const allAttributeIds = [
        ...(filters.attributes || []),
        ...(filters.materials || []),
        ...(filters.styles || []),
        ...(filters.contexts || []),
      ];
      const uniqueAttributeIds = [...new Set(allAttributeIds)];

      const filterCriteria = {
        category_id: filters.category,
        typology_ids: filters.typologies,
        attribute_ids: uniqueAttributeIds.length > 0 ? uniqueAttributeIds : undefined,
        architect_ids: filters.people?.map((p) => p.id),
        status: filters.status,
        min_rating: filters.minRating,
        rated_by: filters.contacts?.map((c) => c.name) || filters.ratedBy,
        filter_contacts: filters.filterContacts,
        collections: filters.collections?.map((c) => c.id),
        folders: filters.folderIds,
        hide_visited: filters.hideVisited,
        hide_saved: filters.hideSaved,
        hide_without_images: filters.hideWithoutImages,
        contact_min_rating: filters.contactMinRating,
        personal_min_rating: filters.personalMinRating,
        ranking_preference: mode === 'library' ? 'personal' : 'global',
        access_levels: filters.accessLevels && filters.accessLevels.length > 0 ? filters.accessLevels : undefined,
        access_logistics: filters.accessLogistics && filters.accessLogistics.length > 0 ? filters.accessLogistics : undefined,
        access_costs: filters.accessCosts && filters.accessCosts.length > 0 ? filters.accessCosts : undefined,
        construction_statuses: statusFilter.construction_statuses,
        exclude_construction_statuses: statusFilter.exclude_construction_statuses,
        credit_company_id: filters.creditCompany?.id ?? undefined,
        credit_roles:
          filters.creditRoles && filters.creditRoles.length > 0 ? filters.creditRoles : undefined,
        award_id: filters.awardId,
        award_outcome: filters.awardOutcome,
        award_year_from: filters.awardYearFrom,
        award_year_to: filters.awardYearTo,
        size_categories: filters.sizeCategories && filters.sizeCategories.length > 0 ? filters.sizeCategories : undefined,
        min_size_sqm: filters.minSizeSqm || undefined,
        max_size_sqm: filters.maxSizeSqm || undefined,
        min_storeys: filters.minStoreys || undefined,
        max_storeys: filters.maxStoreys || undefined,
        centuries:
          filters.centuries && filters.centuries.length > 0 ? filters.centuries : undefined,
        photography_gaps: filters.photographyGaps,
        gap_photo_counts: filters.gapPhotoCounts,
      };

      // Cast through unknown: get_map_clusters_v3 is not yet in generated types
      // (requires running `npm run gen-types` after the Phase 3 migration is applied).
      // Call as a method (not a detached function) so `this` remains the supabase client.
      const builder = (supabase as unknown as {
        rpc: (name: string, args: Record<string, unknown>) => unknown;
      }).rpc('get_map_clusters_v3', {
        min_lat: fetchBox.south,
        max_lat: fetchBox.north,
        min_lng: fetchBox.west,
        max_lng: fetchBox.east,
        zoom_level: zoomLevel,
        filter_criteria: filterCriteria,
      });

      // PostgrestBuilder supports .abortSignal(); guard for test mocks that
      // return a thenable directly without the builder API.
      const maybeBuilder = builder as unknown as {
        abortSignal?: (signal: AbortSignal) => unknown;
        then?: unknown;
      };
      const promise =
        typeof maybeBuilder.abortSignal === 'function'
          ? (maybeBuilder.abortSignal(controller.signal) as Promise<{ data: unknown; error: unknown }>)
          : (builder as unknown as Promise<{ data: unknown; error: unknown }>);

      const { data, error } = await promise;

      if (error) {
        throw error;
      }

      // Filter out hidden (ignored) items client-side as a safeguard
      const visibleData = (data as MapClusterRpcItem[]).filter(
        (item) => item.status !== 'ignored'
      );

      // Transform data to inject numeric tier_rank and preserve label
      const transformedData = visibleData.map((item) => {
        const rank = calculateTierRank(item, mode);

        return {
          ...item,
          tier_rank_label: item.tier_rank, // Preserve original string as label
          tier_rank: rank, // Inject numeric rank
        };
      });

      return transformedData as ClusterResponse[];
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  return { clusters, isLoading, isFetching, error };
}
