import { type MouseEvent } from "react";
import { useNavigate } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { getBuildingLocalityUrl, getBuildingUrl } from "@/utils/url";
import { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import {
  BuildingHeadline,
  CardFooter,
  CardImage,
  PointsBadge,
} from "@/features/feed/components/card-parts";


function FeedAboveLine({ entry }: { entry: FeedReview }) {
  const parts = [
    entry.building.city,
    entry.building.creditedEntities?.[0]?.name,
    entry.building.year_completed != null ? String(entry.building.year_completed) : null,
  ].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return (
    <p className="text-[13px] tracking-[-0.005em] text-text-secondary leading-none">
      {parts.join(" · ")}
    </p>
  );
}

function FeedAuthorLine({ entry, username }: { entry: FeedReview; username: string }) {
  const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true });
  return (
    <div className="flex flex-wrap items-center gap-[10px] text-sm text-text-secondary mt-[14px]">
      <span className="font-medium text-text-primary border-b border-border-default pb-px cursor-pointer hover:border-text-primary transition-colors">{username}</span>
      <span className="text-text-disabled">·</span>
      <span className="text-text-disabled">{timeAgo}</span>
      {entry.rating != null && entry.rating > 0 && (
        <>
          <span className="text-text-disabled">·</span>
          <PointsBadge points={entry.rating} />
        </>
      )}
    </div>
  );
}

export interface FeedCardCProps {
  entry: FeedReview;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  showCommunityImages?: boolean;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
}

/**
 * Feed — photos only (Type C).
 */
export function FeedCardC({
  entry,
  hideUser = false,
  hideBuildingInfo = false,
  showCommunityImages = true,
  onLike,
  onComment,
  onImageLike,
}: FeedCardCProps) {
  const navigate = useNavigate();

  const { data } = useReviewCardData(entry, { showCommunityImages });

  if (!data || !entry.building) return null;

  const { username, isArchitectOfBuilding, mainTitle, mediaItems } = data;

  const handleCardClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (entry.building?.id) {
      const b = entry.building;
      navigate(
        b.locality_country_code && b.locality_city_slug
          ? getBuildingLocalityUrl(b.locality_country_code, b.locality_city_slug, b.id, b.slug, b.short_id)
          : getBuildingUrl(b.id, b.slug, b.short_id)
      );
    } else {
      navigate(`/review/${entry.id}`);
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment(entry.id);
    } else if (entry.building?.id) {
      const b = entry.building;
      navigate(
        b.locality_country_code && b.locality_city_slug
          ? getBuildingLocalityUrl(b.locality_country_code, b.locality_city_slug, b.id, b.slug, b.short_id)
          : getBuildingUrl(b.id, b.slug, b.short_id)
      );
    } else {
      navigate(`/review/${entry.id}`);
    }
  };

  return (
    <article
      data-testid={`feed-card-c-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card relative w-full cursor-pointer min-w-0 max-w-full",
        isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-4",
      )}
    >
      <div className="flex flex-col gap-0 mb-9">
        {!hideBuildingInfo && <FeedAboveLine entry={entry} />}
        {!hideBuildingInfo && <BuildingHeadline name={mainTitle} size="lg" />}
        {!hideUser && <FeedAuthorLine entry={entry} username={username} />}
      </div>

      <CardImage
        items={mediaItems}
        aspectRatio="16/9"
        reviewId={entry.id}
        onImageLike={onImageLike}
        firstMediaOnly
      />

      <CardFooter
        className="pt-8"
        likesCount={entry.likes_count}
        commentsCount={entry.comments_count}
        isLiked={Boolean(entry.is_liked)}
        buildingId={entry.building.id}
        onLike={() => {
          onLike?.(entry.id);
          window.dispatchEvent(new CustomEvent("pwa-interaction"));
        }}
        onComment={handleComment}
      />
    </article>
  );
}
