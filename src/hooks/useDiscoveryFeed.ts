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
}

export function useDiscoveryFeed(cityFilter: string | null) {
  const { user } = useAuth();
  const LIMIT = 10;

  return useInfiniteQuery({
    queryKey: ["discovery_feed", user?.id, cityFilter],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_discovery_feed", {
        p_user_id: user.id,
        p_limit: LIMIT,
        p_offset: pageParam,
        p_city_filter: cityFilter,
      });

      if (error) throw error;
      return data as DiscoveryFeedItem[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length * LIMIT : undefined;
    },
    enabled: !!user,
    initialPageParam: 0,
  });
}
