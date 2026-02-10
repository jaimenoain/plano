import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bounds } from '@/utils/map';
import { MapFilters } from '@/types/plano-map';

export interface ClusterResponse {
  id: string | number;
  lat: number;
  lng: number;
  is_cluster: boolean;
  count: number;
  rating: number | null;
  status: string | null;
}

export interface UseMapDataProps {
  bounds: Bounds;
  zoom: number;
  filters: MapFilters;
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

export function useMapData({ bounds, zoom, filters }: UseMapDataProps) {
  const fetchBox = useMemo(() => calculateFetchBox(bounds), [bounds]);

  const { data: clusters, isLoading, error } = useQuery({
    queryKey: ['map-clusters', fetchBox, filters],
    queryFn: async () => {
      // Construct filter_criteria based on MapFilters
      const filterCriteria = {
        query: filters.query,
        category_id: filters.category,
        typology_ids: filters.typologies,
        attribute_ids: filters.attributes,
        architect_ids: filters.architects?.map((a) => a.id),
        status: filters.status,
        min_rating: filters.minRating,
        // Include other potential fields if needed, relying on JSONB flexibility
        rated_by: filters.ratedBy,
        filter_contacts: filters.filterContacts,
        collections: filters.collections?.map((c) => c.id),
        hide_visited: filters.hideVisited,
        hide_saved: filters.hideSaved,
        hide_hidden: filters.hideHidden,
        hide_without_images: filters.hideWithoutImages,
        contact_min_rating: filters.contactMinRating,
      };

      const { data, error } = await supabase.rpc('get_map_clusters_v2', {
        min_lat: fetchBox.south,
        max_lat: fetchBox.north,
        min_lng: fetchBox.west,
        max_lng: fetchBox.east,
        zoom: Math.round(zoom),
        filter_criteria: filterCriteria,
      });

      if (error) {
        console.error('Error fetching map clusters:', error);
        throw error;
      }

      return data as ClusterResponse[];
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  return { clusters, isLoading, error };
}
