import type { FeedReview, FeedCollection } from "./feed";
import type { CardAttributionKind } from "@/features/posts/components/card-parts/CardAttribution";

/**
 * Concentric-ring assignment for a feed candidate.
 *
 * - `direct`   — viewer's first-degree graph (followed user, saved building, attended event).
 * - `extended` — second-degree: liked/saved by a ring-1 user (Phase 4 onward).
 * - `open`     — globally trending or discovery content (Phase 2 onward as ring assignment).
 * - `editorial`— clock-driven slots: Photo of the Day, On This Day, etc. (Phase 6).
 */
export type FeedItemRing = CardAttributionKind;

/** One-line "why am I seeing this" payload attached to every `FeedItem`. */
export interface FeedItemAttribution {
  kind: CardAttributionKind;
  text: string;
}

interface FeedItemBase {
  /** Stable id; for posts this is the `building_posts` UUID, for collections the collection id. */
  id: string;
  ring: FeedItemRing;
  /** Ranker score. `0` until Phase 1's `get_feed_ranked` populates it. */
  score: number;
  attribution: FeedItemAttribution;
}

/** Wraps a `FeedReview` (the existing `building_posts`-derived DTO). */
export interface FeedItemPost extends FeedItemBase {
  kind: "post";
  payload: FeedReview;
}

/** Wraps a curated `FeedCollection`. */
export interface FeedItemCollection extends FeedItemBase {
  kind: "collection";
  payload: FeedCollection;
}

/** Inline follow prompt injected into the feed for sparse-graph users. */
export interface FeedItemPrompt extends FeedItemBase {
  kind: "prompt";
  payload: { maxSuggestions: number };
}

/** Ring-1 contributor on a building spotlight card. */
export interface SpotlightContributor {
  id: string;
  username: string;
  avatarUrl: string | null;
}

/**
 * Building spotlight card — surfaces a building with notable recent activity.
 *
 * Phase 5 introduces this variant. Ring is 'direct' when ≥1 contributor is in
 * the viewer's follow graph; 'open' otherwise.
 */
export interface FeedItemBuildingSpotlight extends FeedItemBase {
  kind: "building_spotlight";
  payload: {
    buildingId: string;
    buildingName: string;
    buildingCity: string | null;
    mainImageUrl: string | null;
    communityPreviewUrl: string | null;
    slug: string | null;
    shortId: number | null;
    window: "24h" | "7d" | "30d";
    postsCount: number;
    photosCount: number;
    ring1Contributors: SpotlightContributor[];
    lastActivityAt: string;
  };
}

/** Shared building shape returned by all editorial RPCs. */
export interface EditorialBuildingData {
  id: string;
  name: string;
  mainImageUrl: string | null;
  communityPreviewUrl: string | null;
  city: string | null;
  slug: string | null;
  shortId: number | null;
}

export interface EditorialAuthorData {
  username: string;
  avatarUrl: string | null;
}

/**
 * Editorial slot — one of three rotation-tier content types that guarantee
 * the top of the feed changes between visits even with no new posts.
 *
 * Phase 6 introduces this variant. Always rendered at the xl anchor position.
 *
 * subKind discriminates the payload shape:
 *   photo_of_the_day   — most-liked public review image from last 7 days
 *   on_this_day        — viewer's anniversary building visit (1y / 5y / 10y)
 *   trending_this_hour — highest-velocity post in viewer's locality
 */
export interface FeedItemEditorial extends FeedItemBase {
  kind: "editorial";
  subKind: "photo_of_the_day" | "on_this_day" | "trending_this_hour";
  payload: {
    buildingId: string;
    building: EditorialBuildingData;
    // photo_of_the_day & trending_this_hour
    reviewId?: string;
    author?: EditorialAuthorData;
    imageStoragePath?: string | null;
    // on_this_day
    yearsAgo?: number;
    visitDate?: string;
    visitRating?: number | null;
    // trending_this_hour
    engagementVelocity?: number;
    recentLikes?: number;
  };
}

/** One post summarised inside a moment cluster card. */
export interface ClusterPost {
  id: string;
  content?: string | null;
  createdAt?: string;
  buildingId: string;
  buildingName: string;
  buildingCity?: string | null;
  imageStoragePath?: string | null;
}

/** One actor (ring-1 user) who contributed to a moment cluster. */
export interface ClusterActor {
  id: string;
  username: string;
  avatarUrl: string | null;
}

/** Context for a building cluster card. */
export interface ClusterBuilding {
  kind: "building";
  buildingId: string;
  buildingName: string;
  city: string | null;
  mainImageUrl: string | null;
  communityPreviewUrl: string | null;
  slug: string | null;
  shortId: number | null;
}

/** Context for a locality cluster card ("Your contacts are in Lisbon"). */
export interface ClusterLocality {
  kind: "locality";
  localityId: string;
  city: string | null;
  buildingName?: string;
  mainImageUrl?: string | null;
}

/**
 * Moment cluster card — collapses multiple related ring-1 posts into a single
 * feed unit.
 *
 * Phase 7 introduces this variant.
 *
 * clusterKind discriminates the grouping logic:
 *   multi_user_locality         — ≥2 follows posted in the same city (7 days)
 *   multi_photo_single_building — 1 follow posted ≥3 photos of 1 building (7 days)
 *   multi_user_single_building  — ≥2 follows posted about 1 building (30 days)
 */
export interface FeedItemMomentCluster extends FeedItemBase {
  kind: "moment_cluster";
  clusterKind:
    | "multi_user_locality"
    | "multi_photo_single_building"
    | "multi_user_single_building";
  leadPost: ClusterPost;
  supportingPosts: ClusterPost[];
  actors: ClusterActor[];
  buildingOrLocality: ClusterBuilding | ClusterLocality;
}

/**
 * Discriminated union of every shape the unified feed surface can render.
 *
 * Phase 0 declares `post` and `collection`. Phase 2 adds `prompt` (inline
 * follow nudge for sparse-graph users). Phase 5 adds `building_spotlight`.
 * Phase 6 adds `editorial`. Phase 7 adds `moment_cluster`. New variants extend
 * this union; consumers narrow with the `kind` discriminator and TypeScript
 * catches unhandled cases via exhaustive `switch`.
 */
export type FeedItem =
  | FeedItemPost
  | FeedItemCollection
  | FeedItemPrompt
  | FeedItemBuildingSpotlight
  | FeedItemEditorial
  | FeedItemMomentCluster;
