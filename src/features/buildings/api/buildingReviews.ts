import { supabase } from "@/integrations/supabase/client";
import {
  COMMUNITY_PAGE_SIZE,
  buildCommunityFromRows,
  type DisplayImage,
  type FeedEntry,
  type RpcBuildingReviewRow,
} from "../hooks/buildingCommunityData";

/**
 * Fetch one page of community reviews from get_building_reviews (best-first) and
 * shape it. Returns null on error so callers can bail without throwing.
 */
export async function fetchCommunityPage(
  buildingId: string,
  offset: number,
  limit: number = COMMUNITY_PAGE_SIZE,
): Promise<{ images: DisplayImage[]; entries: FeedEntry[]; rowCount: number } | null> {
  const { data, error } = await supabase.rpc("get_building_reviews", {
    p_building_id: buildingId,
    p_limit: limit,
    p_offset: offset,
    p_sort: "top",
  });
  if (error || !data) return null;
  const rawEntries = data as unknown as RpcBuildingReviewRow[];
  const { images, entries } = buildCommunityFromRows(rawEntries);
  return { images, entries, rowCount: rawEntries.length };
}

/** Which of the given image ids the user has liked. Empty set if none/no user. */
export async function fetchLikedImageIds(
  userId: string,
  imageIds: string[],
): Promise<Set<string>> {
  if (imageIds.length === 0) return new Set();
  const { data } = await supabase
    .from("image_likes")
    .select("image_id")
    .eq("user_id", userId)
    .in("image_id", imageIds);
  return new Set<string>(
    (data as { image_id: string }[] | null | undefined)?.map((l) => l.image_id) || [],
  );
}
