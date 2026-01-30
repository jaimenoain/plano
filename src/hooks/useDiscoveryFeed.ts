import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DiscoveryFeedItem {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  slug: string | null;
  main_image_url: string | null;
  save_count: number;
  architects: { id: string; name: string }[] | null;
}

export interface DiscoveryFilters {
  city?: string | null;
  categoryId?: string | null;
  typologyIds?: string[];
  attributeIds?: string[];
  architectIds?: string[];
}

export function useDiscoveryFeed(filters: DiscoveryFilters) {
  const { user } = useAuth();
  const LIMIT = 10;

  // Destructure for dependency array stability
  const { city, categoryId, typologyIds, attributeIds, architectIds } = filters;

  return useInfiniteQuery({
    queryKey: ["discovery_feed", user?.id, city, categoryId, typologyIds, attributeIds, architectIds],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_discovery_feed", {
        p_user_id: user.id,
        p_limit: LIMIT,
        p_offset: pageParam,
        p_city_filter: city || null,
        p_category_id: categoryId || null,
        p_typology_ids: typologyIds && typologyIds.length > 0 ? typologyIds : null,
        p_attribute_ids: attributeIds && attributeIds.length > 0 ? attributeIds : null,
        p_architect_ids: architectIds && architectIds.length > 0 ? architectIds : null,
      });

      if (error) throw error;

      const buildings = data as DiscoveryFeedItem[];

      if (buildings.length > 0) {
        const buildingIds = buildings.map(b => b.id);

        const { data: architectsData } = await supabase
          .from('building_architects')
          .select('building_id, architects(id, name)')
          .in('building_id', buildingIds);

        if (architectsData) {
          const architectsMap: Record<string, { id: string; name: string }[]> = {};

          architectsData.forEach((item: any) => {
            if (item.architects) {
              if (!architectsMap[item.building_id]) {
                architectsMap[item.building_id] = [];
              }
              architectsMap[item.building_id].push(item.architects);
            }
          });

          buildings.forEach(building => {
            building.architects = architectsMap[building.id] || [];
          });
        }
      }

      return buildings;
    },
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer results than limit, there are no more pages
      if (lastPage.length < LIMIT) return undefined;
      return allPages.length * LIMIT;
    },
    enabled: !!user,
    initialPageParam: 0,
  });
}
