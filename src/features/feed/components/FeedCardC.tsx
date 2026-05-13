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
  CardMeta,
  CardAuthor,
} from "@/features/feed/components/card-parts";
import type { TileSize } from "@/features/feed/utils/assignTileSize";

export interface FeedCardCProps {
  entry: FeedReview;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  showCommunityImages?: boolean;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  tileSize?: TileSize;
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
  tileSize,
}: FeedCardCProps) {
  const navigate = useNavigate();

  const { data } = useReviewCardData(entry, { showCommunityImages });

  if (!data || !entry.building) return null;

  const { username, isArchitectOfBuilding, mainTitle, mediaItems } = data;
  const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true });

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

  // ── xl tile: edge-to-edge photo with overlay text ─────────────────────────
  if (tileSize === "xl") {
    return (
      <article
        data-testid={`feed-card-c-${entry.id}`}
        onClick={handleCardClick}
        className="group/card relative h-full w-full cursor-pointer overflow-hidden"
      >
        <CardImage
          items={mediaItems}
          aspectRatio="1/1"
          reviewId={entry.id}
          onImageLike={onImageLike}
          firstMediaOnly
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <h2 className="font-sans font-bold text-text-inverse leading-[0.95] tracking-[-0.035em] text-[clamp(1.5rem,3vw,2.5rem)] line-clamp-2">
            {mainTitle}
          </h2>
          <p className="mt-2 text-xs text-white/70">{username} · {timeAgo}</p>
        </div>
      </article>
    );
  }

  // ── other tile sizes and default layout ────────────────────────────────────
  const imageAspectRatio = tileSize === "md" ? "4/5" : "16/9";

  return (
    <article
      data-testid={`feed-card-c-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card relative w-full cursor-pointer min-w-0 max-w-full transition-opacity hover:opacity-95",
        tileSize && "h-full",
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
        aspectRatio={imageAspectRatio}
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
