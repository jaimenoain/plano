import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { FeedCollection, RawCollectionFeedRow } from "@/types/feed";

const PAGE_SIZE = 5;

interface UseCollectionsFeedOptions {
  enabled?: boolean;
}

function mapCollectionRow(row: RawCollectionFeedRow): FeedCollection {
  const previews = row.preview_buildings ?? [];
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    updatedAt: row.updated_at,
    ownerId: row.owner_id,
    primaryTag: row.primary_tag,
    owner: {
      id: row.owner_id,
      username: row.owner?.username ?? null,
      avatarUrl: row.owner?.avatar_url ?? null,
    },
    previewBuildings: previews.map((pb) => ({
      buildingId: pb.building_id,
      name: pb.name,
      mainImageUrl: pb.main_image_url,
    })),
    buildingCount: row.building_count,
  };
}

export function useCollectionsFeed(options: UseCollectionsFeedOptions = {}) {
  const { user } = useAuth();
  const { enabled = true } = options;

  const queryKey = ["collections_feed", user?.id];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_collections_feed", {
        p_limit: PAGE_SIZE,
        p_offset: pageParam,
      });

      if (error) throw error;

      const rows = (data ?? []) as unknown as RawCollectionFeedRow[];
      return rows.map(mapCollectionRow);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    enabled: !!user && enabled,
  });

  return query;
}
