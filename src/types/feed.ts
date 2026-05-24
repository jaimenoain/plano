export interface ReviewImage {
  id: string;
  url: string;
  likes_count: number;
  is_liked: boolean;
}

export interface ReviewUser {
  username: string | null;
  avatar_url: string | null;
  is_verified_architect?: boolean;
  is_architect_of_building?: boolean;
  /**
   * Follower count for the review author at fetch time (`follows.following_id` = profile id).
   * Null when unknown or not loaded (e.g. legacy RPC payloads before migration).
   */
  followers_count: number | null;
}

export interface ReviewBuilding {
  id: string;
  short_id?: number | null;
  slug?: string | null;
  name: string;
  address?: string | null;
  main_image_url?: string | null;
  /** Mapped: community_preview_url — top community review image path; feed fallback when no hero/main. */
  community_preview_url?: string | null;
  /** From feed RPCs `building_data.credited_entities` or embedded `building_credits`. */
  creditedEntities?: { id: string; name: string }[] | null;
  year_completed?: number | null;
  city?: string | null;
  country?: string | null;
  locality_country_code?: string | null;
  locality_city_slug?: string | null;
}

export interface WatchWithUser {
  id: string;
  avatar_url: string | null;
  username: string | null;
}

export interface FeedReview {
  id: string;
  content: string | null;
  rating: number | null;
  tags?: string[] | null;
  created_at: string;
  edited_at?: string | null;
  status?: string; // Made optional for feed card usage, though usually present
  user_id?: string; // Optional on the type; Index and loaders still provide it when available
  user: ReviewUser;
  building: ReviewBuilding;
  likes_count: number;
  comments_count: number;
  /** Distinct authenticated viewers who have loaded this note in a feed (excludes the author). Optional so legacy/test fixtures don't have to set it; readers should default to 0. */
  views_count?: number;
  is_liked: boolean;
  images?: ReviewImage[];
  video_url?: string | null;
  watch_with_users?: WatchWithUser[];
  is_suggested?: boolean;
  suggestion_reason?: string;
}

/** JSON payload from `get_feed` / `get_suggested_posts` RPCs. */
export interface RawFeedUserData {
  username?: string | null;
  avatar_url?: string | null;
  is_verified_architect?: boolean;
  is_architect_of_building?: boolean;
  /** Integer count from feed RPCs when `followers_count` is included in `user_data`. */
  followers_count?: number | null;
}

export interface RawFeedBuildingData {
  id?: string;
  short_id?: number | null;
  slug?: string | null;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  main_image_url?: string | null;
  community_preview_url?: string | null;
  credited_entities?: unknown;
  year_completed?: number | null;
  locality_country_code?: string | null;
  locality_city_slug?: string | null;
}

/** Normalize `get_feed` / `get_suggested_posts` `building_data.credited_entities` JSON. */
export function creditedEntitiesFromRpcJson(
  raw: unknown,
): { id: string; name: string }[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return [];
  const out: { id: string; name: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = rec.id != null ? String(rec.id) : "";
    const name = rec.name != null ? String(rec.name) : "";
    if (name) out.push({ id, name });
  }
  return out;
}

export interface RawFeedReviewImageRow {
  id: string;
  storage_path: string;
  likes_count?: number | null;
  is_liked?: boolean;
}

export interface RawFeedRow {
  id: string;
  content: string | null;
  rating: number | null;
  tags?: string[] | null;
  created_at: string;
  edited_at?: string | null;
  status?: string | null;
  user_id?: string;
  building_id?: string;
  user_data?: RawFeedUserData | null;
  building_data?: RawFeedBuildingData | null;
  likes_count?: number | null;
  comments_count?: number | null;
  views_count?: number | null;
  is_liked: boolean;
  review_images?: RawFeedReviewImageRow[] | null;
  is_suggested?: boolean;
  suggestion_reason?: string | null;
  group_id?: string | null;
}

/** Preview row from `get_collections_feed` buildings subquery (snake_case). */
export interface CollectionPreviewBuilding {
  building_id: string;
  name: string;
  main_image_url: string | null;
  community_preview_url?: string | null;
}

/** Raw JSON row from `get_collections_feed` RPC (snake_case). */
export interface RawCollectionFeedRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updated_at: string;
  owner_id: string;
  primary_tag: string | null;
  owner: {
    username: string | null;
    avatar_url: string | null;
  };
  preview_buildings: CollectionPreviewBuilding[];
  building_count: number;
}

/** CamelCase DTO for collection feed cards and `useCollectionsFeed`. */
export interface FeedCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updatedAt: string;
  ownerId: string;
  primaryTag: string | null;
  owner: {
    id: string;
    username: string | null;
    avatarUrl: string | null;
  };
  previewBuildings: Array<{
    buildingId: string;
    name: string;
    mainImageUrl: string | null;
    communityPreviewUrl: string | null;
  }>;
  buildingCount: number;
  isLiked?: boolean;
  likesCount?: number;
}

/** Client-merged home-feed row: followed users RSVPed “going” (clustered by event). */
export interface FeedEventAttendance {
  id: string;
  /** Synthetic: `attendance-{eventId}` */
  rowType: "event_attendance";
  eventId: string;
  title: string;
  slug: string;
  startAt: string;
  endAt: string | null;
  address: string | null;
  coverImageUrl: string | null;
  claimStatus: string;
  /** Followed users going — merged during aggregation */
  actors: ReviewUser[];
  /** Earliest `created_at` among clustered actors */
  createdAt: string;
}

/** Union used by the home feed after merging RPC reviews with client-side slices. */
export type FeedHomeEntry = FeedReview | FeedEventAttendance;
