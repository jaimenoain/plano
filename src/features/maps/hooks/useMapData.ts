import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bounds } from '@/utils/map';
import { MapFilters, MapMode } from '@/types/plano-map';

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
  is_custom_marker?: boolean;
  notes?: string | null;
  is_candidate?: boolean;
  address?: string | null;
  tier_rank_label?: string | null;
  tier_rank?: number;
  location_approximate?: boolean;
  max_tier?: number;
  color?: string | null;
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

function calculateTierRank(item: any): number {
  // Determine context: Library (User Rating/Status) vs Discover (Global Rank)
  const userRating = item.rating ?? 0;
  const status = item.status;
  // Check if item is in library (rated > 0, or explicitly saved/visited)
  const isLibraryItem = userRating > 0 || status === 'visited' || status === 'saved';

  if (isLibraryItem) {
    if (userRating >= 3) return 3;
    if (userRating === 2) return 2;
    // Rating 1, 0, or just saved -> Standard (Rank 1)
    return 1;
  }

  // Discover Context
  const label = item.tier_rank; // This comes from DB as string

  if (label === 'Top 1%') return 3;
  if (label === 'Top 5%' || label === 'Top 10%') return 2;

  // "Top 20%", "Standard", or anything else -> 1
  return 1;
}

export function useMapData({ bounds, zoom, filters, mode = 'discover' }: UseMapDataProps) {
  const fetchBox = useMemo(() => calculateFetchBox(bounds), [bounds]);

  const { data: clusters, isLoading, error } = useQuery({
    queryKey: ['map-clusters', fetchBox, filters, mode],
    queryFn: async () => {
      // Combine all attribute-related filters
      const allAttributeIds = [
        ...(filters.attributes || []),
        ...(filters.materials || []),
        ...(filters.styles || []),
        ...(filters.contexts || []),
      ];

      // Remove duplicates
      const uniqueAttributeIds = [...new Set(allAttributeIds)];

      // Construct filter_criteria based on MapFilters
      const filterCriteria = {
        query: filters.query,
        category_id: filters.category,
        typology_ids: filters.typologies,
        attribute_ids: uniqueAttributeIds.length > 0 ? uniqueAttributeIds : undefined,
        architect_ids: filters.architects?.map((a) => a.id),
        status: filters.status,
        min_rating: filters.minRating,
        // Include other potential fields if needed, relying on JSONB flexibility
        rated_by: filters.ratedBy,
        filter_contacts: filters.filterContacts,
        collections: filters.collections?.map((c) => c.id),
        hide_visited: filters.hideVisited,
        hide_saved: filters.hideSaved,
        hide_hidden: true,
        hide_without_images: filters.hideWithoutImages,
        contact_min_rating: filters.contactMinRating,
        personal_min_rating: filters.personalMinRating,
        ranking_preference: mode === 'library' ? 'personal' : 'global',
      };

      const { data, error } = await supabase.rpc('get_map_clusters_v2', {
        min_lat: fetchBox.south,
        max_lat: fetchBox.north,
        min_lng: fetchBox.west,
        max_lng: fetchBox.east,
        zoom_level: Math.round(zoom),
        filter_criteria: filterCriteria,
      });

      if (error) {
        console.error('Error fetching map clusters:', error);
        throw error;
      }

      // Filter out hidden (ignored) items client-side as a safeguard
      // The RPC should handle this with hide_hidden: true, but we double check
      const visibleData = (data as any[]).filter(item => item.status !== 'ignored');

      // Transform data to inject numeric tier_rank and preserve label
      const transformedData = visibleData.map(item => {
        const rank = calculateTierRank(item);

        return {
          ...item,
          tier_rank_label: item.tier_rank, // Preserve original string as label
          tier_rank: rank // Inject numeric rank
        };
      });

      return transformedData as ClusterResponse[];
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  return { clusters, isLoading, error };
}
