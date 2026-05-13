import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { FeedItem } from "@/types/feedItem";
import type { RawCollectionFeedRow } from "@/types/feed";

interface RawCollectionFeedRowWithRing extends RawCollectionFeedRow {
  ring?: string;
}

interface GetCollectionsFeedAsItemsOptions {
  limit?: number;
  offset?: number;
}

/** Score collections by freshness of last update (72h half-life). */
function scoreCollection(updatedAt: string): number {
  const hoursOld = (Date.now() - new Date(updatedAt).getTime()) / 3_600_000;
  return Math.exp((-Math.LN2 * hoursOld) / 72);
}

export async function getCollectionsFeedAsItems({
  limit = 30,
  offset = 0,
}: GetCollectionsFeedAsItemsOptions = {}): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc("get_collections_feed", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;

  const rows = (data ?? []) as unknown as RawCollectionFeedRowWithRing[];
  return rows.map((row): FeedItem => {
    const ring = (row.ring ?? "direct") as FeedItem["ring"];
    const updatedAgo = formatDistanceToNow(new Date(row.updated_at), { addSuffix: true });
    return {
      kind: "collection",
      id: row.id,
      ring,
      score: scoreCollection(row.updated_at),
      attribution: {
        kind: ring,
        text: `Collection · updated ${updatedAgo}`,
      },
      payload: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        updatedAt: row.updated_at,
        ownerId: row.owner_id,
        primaryTag: row.primary_tag ?? null,
        owner: {
          id: row.owner_id,
          username: row.owner?.username ?? null,
          avatarUrl: row.owner?.avatar_url ?? null,
        },
        previewBuildings: (row.preview_buildings ?? []).map((pb) => ({
          buildingId: pb.building_id,
          name: pb.name,
          mainImageUrl: pb.main_image_url,
          communityPreviewUrl: pb.community_preview_url ?? null,
        })),
        buildingCount: row.building_count,
      },
    };
  });
}
