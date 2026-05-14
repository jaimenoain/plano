import { supabase } from "@/integrations/supabase/client";
import type {
  FeedItemEditorial,
  EditorialBuildingData,
  EditorialAuthorData,
} from "@/types/feedItem";

// ── Raw shapes returned by the RPCs ──────────────────────────────────────────

interface RawBuildingData {
  id: string;
  name: string;
  main_image_url: string | null;
  community_preview_url: string | null;
  city: string | null;
  slug: string | null;
  short_id: number | null;
}

interface RawAuthorData {
  username: string;
  avatar_url: string | null;
}

interface RawPhotoOfTheDay {
  image_storage_path: string;
  review_id: string;
  building_id: string;
  building_data: RawBuildingData;
  author_data: RawAuthorData;
  score: number;
}

interface RawOnThisDay {
  building_id: string;
  building_data: RawBuildingData;
  years_ago: number;
  visit_date: string;
  visit_rating: number | null;
}

interface RawTrendingThisHour {
  review_id: string;
  building_id: string;
  building_data: RawBuildingData;
  author_data: RawAuthorData;
  image_storage_path: string | null;
  engagement_velocity: number;
  recent_likes: number;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapBuilding(raw: RawBuildingData): EditorialBuildingData {
  return {
    id: raw.id,
    name: raw.name,
    mainImageUrl: raw.main_image_url ?? null,
    communityPreviewUrl: raw.community_preview_url ?? null,
    city: raw.city ?? null,
    slug: raw.slug ?? null,
    shortId: raw.short_id ?? null,
  };
}

function mapAuthor(raw: RawAuthorData): EditorialAuthorData {
  return { username: raw.username, avatarUrl: raw.avatar_url ?? null };
}

// ── Individual RPC callers ────────────────────────────────────────────────────

async function fetchPhotoOfTheDay(): Promise<FeedItemEditorial | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_photo_of_the_day");
  if (error) throw error;
  const rows = (data ?? []) as RawPhotoOfTheDay[];
  const row = rows[0];
  if (!row) return null;

  return {
    kind: "editorial",
    subKind: "photo_of_the_day",
    id: `editorial:photo_of_the_day:${row.review_id}`,
    ring: "editorial",
    score: row.score ?? 0,
    attribution: { kind: "editorial", text: "Photo of the Day" },
    payload: {
      buildingId: row.building_id,
      building: mapBuilding(row.building_data),
      reviewId: row.review_id,
      author: mapAuthor(row.author_data),
      imageStoragePath: row.image_storage_path ?? null,
    },
  };
}

async function fetchOnThisDay(): Promise<FeedItemEditorial | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_on_this_day");
  if (error) throw error;
  const rows = (data ?? []) as RawOnThisDay[];
  const row = rows[0];
  if (!row) return null;

  return {
    kind: "editorial",
    subKind: "on_this_day",
    id: `editorial:on_this_day:${row.building_id}`,
    ring: "editorial",
    score: 7.0, // fixed high score — always surfaces above open-ring content
    attribution: {
      kind: "editorial",
      text: `${row.years_ago} year${row.years_ago === 1 ? "" : "s"} ago today`,
    },
    payload: {
      buildingId: row.building_id,
      building: mapBuilding(row.building_data),
      yearsAgo: row.years_ago,
      visitDate: row.visit_date,
      visitRating: row.visit_rating ?? null,
    },
  };
}

async function fetchTrendingThisHour(): Promise<FeedItemEditorial | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_trending_this_hour");
  if (error) throw error;
  const rows = (data ?? []) as RawTrendingThisHour[];
  const row = rows[0];
  if (!row) return null;

  return {
    kind: "editorial",
    subKind: "trending_this_hour",
    id: `editorial:trending:${row.review_id}`,
    ring: "editorial",
    score: row.engagement_velocity ?? 0,
    attribution: { kind: "editorial", text: "Trending now" },
    payload: {
      buildingId: row.building_id,
      building: mapBuilding(row.building_data),
      reviewId: row.review_id,
      author: mapAuthor(row.author_data),
      imageStoragePath: row.image_storage_path ?? null,
      engagementVelocity: row.engagement_velocity ?? 0,
      recentLikes: Number(row.recent_likes ?? 0),
    },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Calls all three editorial RPCs in parallel and returns whichever slots
 * return data. Individual slot failures are swallowed so one missing slot
 * never breaks the entire feed.
 *
 * Priority order in the returned array:
 *   1. photo_of_the_day
 *   2. on_this_day
 *   3. trending_this_hour
 */
export async function getEditorialSlots(): Promise<FeedItemEditorial[]> {
  const [potd, otd, trending] = await Promise.allSettled([
    fetchPhotoOfTheDay(),
    fetchOnThisDay(),
    fetchTrendingThisHour(),
  ]);

  const items: FeedItemEditorial[] = [];
  if (potd.status === "fulfilled" && potd.value) items.push(potd.value);
  if (otd.status === "fulfilled" && otd.value) items.push(otd.value);
  if (trending.status === "fulfilled" && trending.value) items.push(trending.value);
  return items;
}
