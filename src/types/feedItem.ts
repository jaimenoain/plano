import type { FeedReview, FeedCollection } from "./feed";
import type { CardAttributionKind } from "@/features/feed/components/card-parts/CardAttribution";

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

/**
 * Discriminated union of every shape the unified feed surface can render.
 *
 * Phase 0 declares `post` and `collection`. Phase 2 adds `prompt` (inline
 * follow nudge for sparse-graph users). Phase 5 adds `building_spotlight`.
 * Phase 6 adds `editorial`. New variants extend this union; consumers narrow
 * with the `kind` discriminator and TypeScript catches unhandled cases via
 * exhaustive `switch`.
 */
export type FeedItem =
  | FeedItemPost
  | FeedItemCollection
  | FeedItemPrompt
  | FeedItemBuildingSpotlight
  | FeedItemEditorial;
