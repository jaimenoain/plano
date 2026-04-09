/**
 * ColdStartFeed.tsx
 * Replaces: src/features/feed/components/ColdStartFeed.tsx
 *
 * Layout:
 * 1. Editorial "Discover" prompt — bare text + underlined text link, no card chrome.
 * 2. Two-column grid:
 *    Left  — PeopleYouMayKnow flat list
 *    Right — FeaturedBuildingCard from the first community discovery review
 * 3. SectionDivider → remaining community discovery feed
 */
import { Loader2 } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { FeedReview } from "@/types/feed";
import { FeedHeroCard } from "./FeedHeroCard";
import { PeopleYouMayKnow } from "./PeopleYouMayKnow";
import { SectionDivider } from "./SectionDivider";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";

// ─── Featured building card (right column) ───────────────────────────────────

function FeaturedBuildingCard({ review }: { review: FeedReview }) {
  const { building } = review;
  const [imgLoaded, setImgLoaded] = useState(false);

  const imageUrl = building.main_image_url
    ? getBuildingImageUrl(building.main_image_url)
    : building.community_preview_url ?? null;

  const architects = Array.isArray(building.architects)
    ? building.architects
        .map((a) => (typeof a === "string" ? a : a.name))
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <Link to={getBuildingUrl(building)} className="group block h-full">
      <div className="flex flex-col h-full">
        <div
          className="relative w-full overflow-hidden bg-surface-muted"
          style={{ aspectRatio: "4/5" }}
        >
          {!imgLoaded && (
            <div className="absolute inset-0 bg-surface-muted animate-pulse" />
          )}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={building.name}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.02] ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            <div className="absolute inset-0 bg-surface-muted" />
          )}
        </div>
        <div className="pt-3 flex flex-col gap-0.5">
          {building.city && (
            <p className="text-2xs font-medium tracking-widest uppercase text-text-secondary">
              {building.city}
              {building.country ? `, ${building.country}` : ""}
            </p>
          )}
          <h3 className="text-lg font-bold leading-tight text-text-primary group-hover:underline underline-offset-2">
            {building.name}
          </h3>
          {architects && (
            <p className="text-xs text-text-secondary">{architects}</p>
          )}
          {building.year_completed && (
            <p className="text-xs text-text-disabled">{building.year_completed}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ColdStartFeedProps {
  discoveryReviews: FeedReview[];
  onLike: (reviewId: string) => void;
  onImageLike: (reviewId: string, imageId: string) => void;
  isDiscoveryLoading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ColdStartFeed({
  discoveryReviews,
  onLike,
  onImageLike,
  isDiscoveryLoading,
}: ColdStartFeedProps) {
  const featuredReview = discoveryReviews[0] ?? null;
  const remainingReviews = featuredReview ? discoveryReviews.slice(1) : discoveryReviews;

  return (
    <div className="flex flex-col gap-10 w-full">

      {/* ── Section 1: Editorial "Discover" prompt ────────────────────────── */}
      <div className="border-t border-border-default pt-6">
        <p className="text-2xs font-medium tracking-widest uppercase text-text-secondary mb-4">
          Get started
        </p>
        <h2 className="text-2xl font-bold text-text-primary leading-tight mb-2">
          Discover architecture<br />with friends
        </h2>
        <p className="text-sm text-text-secondary mb-5 max-w-sm">
          Follow architects and enthusiasts to see their visits, ratings, and collections here.
        </p>
        <Link
          to="/connect"
          className="text-sm font-medium text-text-primary underline underline-offset-4 hover:text-text-secondary transition-colors"
        >
          Find people to follow →
        </Link>
      </div>

      {/* ── Section 2: People you may know + Featured building ───────────── */}
      <div className="grid grid-cols-2 gap-8 items-start">
        <PeopleYouMayKnow />
        {featuredReview && <FeaturedBuildingCard review={featuredReview} />}
      </div>

      {/* ── Section 3: Community discovery feed ──────────────────────────── */}
      <SectionDivider label="From the community" href="/explore" />

      {isDiscoveryLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {remainingReviews.map((review) => (
            <FeedHeroCard
              key={review.id}
              entry={review}
              onLike={onLike}
              onImageLike={onImageLike}
            />
          ))}
        </div>
      )}

    </div>
  );
}