import { Loader2 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { FeedReview } from "@/types/feed";
import { FeedHeroCard } from "./FeedHeroCard";
import { PeopleYouMayKnow } from "./PeopleYouMayKnow";
import { SectionDivider } from "./SectionDivider";

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
  return (
    <div className="flex flex-col gap-6 w-full">

      {/* ── Section 1: Follow prompt card ─────────────────────────────────── */}
      <div className="w-full bg-surface-card border border-border-default rounded-sm p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-semibold text-text-primary leading-tight">
            Discover architecture with friends
          </h2>
          <p className="text-sm text-text-secondary leading-normal">
            Follow designers and enthusiasts to see their visits, ratings, and
            collections here.
          </p>
        </div>
        <div>
          <Button
            asChild
            className="bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover rounded-sm font-medium text-sm"
          >
            <Link to="/connect">Find people to follow</Link>
          </Button>
        </div>
      </div>

      {/* ── Section 2: People you may know ────────────────────────────────── */}
      <PeopleYouMayKnow />

      {/* ── Section 3: Discovery content ──────────────────────────────────── */}
      <SectionDivider label="From the community" href="/explore" />

      {isDiscoveryLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {discoveryReviews.map((review) => (
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