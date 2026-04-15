import { type MouseEvent } from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { getBuildingUrl } from "@/utils/url";
import { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import {
  ActivityLead,
  BuildingHeadline,
  BuildingSubtitle,
  CardFooter,
  CardImage,
} from "@/features/feed/components/card-parts";
import { CARD_C_IMAGE_HEIGHT } from "@/features/feed/utils/resolveCardType";

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

  const { username, isArchitectOfBuilding, mainTitle, subTitle, city, mediaItems } = data;
  const userActionVerb = entry.status === "pending" ? "wants to visit" : "visited";

  const handleCardClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (entry.building?.id) {
      // TODO: enrich DTO with locality fields
      navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
    } else {
      navigate(`/review/${entry.id}`);
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment(entry.id);
    } else if (entry.building?.id) {
      // TODO: enrich DTO with locality fields
      navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
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
        <CardImage
          items={mediaItems}
          height={CARD_C_IMAGE_HEIGHT}
          reviewId={entry.id}
          onImageLike={onImageLike}
          firstMediaOnly
        />
        <div className="mt-4 flex max-w-xl flex-col gap-3">
          <ActivityLead username={username} verb={userActionVerb} hideUser={hideUser} />
          {!hideBuildingInfo && <BuildingHeadline name={mainTitle} size="md" />}
          {!hideBuildingInfo && (
            <BuildingSubtitle subTitle={subTitle ?? undefined} city={city} />
          )}
          <CardFooter
            className="pt-1"
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
        </div>
    </article>
  );
}
