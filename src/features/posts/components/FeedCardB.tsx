import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
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
import { CARD_C_IMAGE_HEIGHT } from "@/features/posts/utils/resolveCardType";

const MD_MEDIA_QUERY = "(min-width: 768px)";

export interface FeedCardBProps {
  entry: FeedReview;
  index?: number;
  imagePosition?: "left" | "right";
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  showCommunityImages?: boolean;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
}

export function FeedCardB({
  entry,
  index = 0,
  imagePosition,
  hideUser = false,
  hideBuildingInfo = false,
  showCommunityImages = true,
  onLike,
  onComment,
  onImageLike,
}: FeedCardBProps) {
  const navigate = useNavigate();
  const [essayExpanded, setEssayExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const [isMdUp, setIsMdUp] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const trackViewRef = useTrackNoteView(entry.id, entry.user_id);

  const { data } = useReviewCardData(entry, { showCommunityImages });

  useLayoutEffect(() => {
    const mq = window.matchMedia(MD_MEDIA_QUERY);
    const sync = () => setIsMdUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setEssayExpanded(false);
  }, [entry.id]);

  const imageOnLeft =
    imagePosition === "right" ? false : imagePosition === "left" ? true : index % 2 === 0;

  const recheckOverflow = useCallback(() => {
    const el = bodyRef.current;
    if (!el || essayExpanded || !entry.content?.trim()) {
      setShowReadMore(false);
      return;
    }
    setShowReadMore(el.scrollHeight > el.clientHeight + 1);
  }, [entry.content, essayExpanded]);

  useLayoutEffect(() => {
    recheckOverflow();
  }, [recheckOverflow, entry.id]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || essayExpanded) return;
    const ro = new ResizeObserver(() => recheckOverflow());
    ro.observe(el);
    return () => ro.disconnect();
  }, [essayExpanded, recheckOverflow]);

  if (!data || !entry.building) return null;

  const { username, isArchitectOfBuilding, mainTitle, mediaItems } = data;
  const imageAspectRatio = "16/9";

  const handleCardClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (entry.building?.id) {
      const b = entry.building;
      navigate(
        b.locality_country_code && b.locality_city_slug
          ? getBuildingLocalityUrl(b.locality_country_code, b.locality_city_slug, b.id, b.slug, b.short_id)
          : getBuildingUrl(b.id, b.slug, b.short_id),
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
          : getBuildingUrl(b.id, b.slug, b.short_id),
      );
    } else {
      navigate(`/review/${entry.id}`);
    }
  };

  return (
    <article
      ref={trackViewRef}
      data-testid={`feed-card-b-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card relative w-full cursor-pointer min-w-0",
        isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-6",
      )}
    >
      <div className="grid w-full min-w-0 grid-cols-1 gap-0 md:grid-cols-2 md:gap-16 md:items-start">
        {/* Photo column */}
        <div className={cn("order-2 min-w-0", imageOnLeft ? "md:order-1" : "md:order-2")}>
          <CardImage
            items={mediaItems}
            height={isMdUp ? undefined : CARD_C_IMAGE_HEIGHT}
            aspectRatio={isMdUp ? imageAspectRatio : undefined}
            reviewId={entry.id}
            onImageLike={onImageLike}
            firstMediaOnly
            className="transition-transform duration-500 group-hover/card:scale-[1.01]"
          />
        </div>

        {/* Text column */}
        <div
          className={cn(
            "order-1 flex min-w-0 flex-col gap-0 pb-8 md:pb-0",
            imageOnLeft ? "md:order-2" : "md:order-1",
          )}
        >
          {!hideBuildingInfo && (
            <CardMeta
              city={entry.building.city}
              architect={entry.building.creditedEntities?.[0]?.name}
              year={entry.building.year_completed}
              className="mb-[10px]"
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
              className="mt-[14px]"
              onUsernameClick={() => navigate(`/profile/${username}`)}
            />
          )}

          {entry.content?.trim() && (
            <div className="flex min-w-0 flex-col gap-1 mt-9">
              <p
                ref={bodyRef}
                className={cn(
                  "text-[17px] leading-[1.75] text-text-primary max-w-[62ch] font-sans",
                  !essayExpanded && "line-clamp-4",
                )}
              >
                {entry.content}
              </p>
              {showReadMore && !essayExpanded && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEssayExpanded(true);
                  }}
                  className="group/readmore mt-5 shrink-0 font-sans text-[11px] font-medium tracking-[0.18em] uppercase text-text-primary"
                >
                  <span className="transition-colors group-hover/readmore:text-text-secondary">
                    Read the full review
                  </span>
                  {" "}
                  <span className="inline-block group-hover/readmore:translate-x-0.5 transition-transform">
                    →
                  </span>
                </button>
              )}
            </div>
          )}

          <CardFooter
            className="pt-9"
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
      </div>
    </article>
  );
}
