import { type MouseEvent } from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { getBuildingLocalityUrl, getBuildingUrl } from "@/utils/url";
import { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/posts/hooks/useReviewCardData";
import { useTrackNoteView } from "@/features/posts/hooks/useTrackNoteView";
import {
  BuildingHeadline,
  CardFooter,
  CardImage,
  CardMeta,
  CardAuthor,
} from "@/features/posts/components/card-parts";

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
  const trackViewRef = useTrackNoteView(entry.id, entry.user_id);

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
      ref={trackViewRef}
      data-testid={`feed-card-c-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card relative w-full cursor-pointer min-w-0 max-w-full transition-opacity hover:opacity-95",
        isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-6",
      )}
    >
      <div className="flex flex-col gap-0 mb-10">
        {!hideBuildingInfo && (
          <CardMeta
            city={entry.building.city}
            architect={entry.building.creditedEntities?.[0]?.name}
            year={entry.building.year_completed}
            className="mb-4"
          />
        )}
        {!hideBuildingInfo && (
          <BuildingHeadline name={mainTitle} size="lg" className="mb-2" />
        )}
        {!hideUser && (
          <CardAuthor
            username={username}
            avatarUrl={data.avatarUrl}
            timestamp={entry.created_at}
            rating={entry.rating}
            className="mt-3"
            onUsernameClick={() => navigate(`/profile/${username}`)}
          />
        )}
      </div>

      <CardImage
        items={mediaItems}
        aspectRatio="16/9"
        reviewId={entry.id}
        onImageLike={onImageLike}
        firstMediaOnly
        className="transition-transform duration-700 group-hover/card:scale-[1.01]"
      />

      <CardFooter
        className="pt-10"
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
