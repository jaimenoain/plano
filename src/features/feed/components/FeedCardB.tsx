import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
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
import { CARD_C_IMAGE_HEIGHT } from "@/features/feed/utils/resolveCardType";

const MD_MEDIA_QUERY = "(min-width: 768px)";

function FeedAboveLine({ entry }: { entry: FeedReview }) {
  const parts = [
    entry.building.city,
    entry.building.creditedEntities?.[0]?.name,
    entry.building.year_completed != null ? String(entry.building.year_completed) : null,
  ].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return (
    <p className="text-[13px] tracking-[-0.005em] text-text-secondary leading-none mb-[10px] flex items-center gap-[10px]">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-[10px]">
          {i > 0 && <span className="text-text-disabled">·</span>}
          <span>{p}</span>
        </span>
      ))}
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

/**
 * Feed — review with photo(s) / video (Type B). Fixed 320px row height on md+.
 */
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
      data-testid={`feed-card-b-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card relative w-full cursor-pointer min-w-0 max-w-full",
        isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-4",
      )}
    >
      <div
        className={cn(
          "grid w-full min-w-0 grid-cols-1 gap-0 md:grid-cols-2 md:gap-16 md:items-start",
        )}
      >
        {/* Photo column */}
        <div
          className={cn(
            "order-1 min-w-0",
            imageOnLeft ? "md:order-1" : "md:order-2",
          )}
        >
          <CardImage
            items={mediaItems}
            height={isMdUp ? undefined : CARD_C_IMAGE_HEIGHT}
            aspectRatio={isMdUp ? "4/5" : undefined}
            reviewId={entry.id}
            onImageLike={onImageLike}
            firstMediaOnly
          />
        </div>

        {/* Text column */}
        <div
          className={cn(
            "order-2 flex min-w-0 flex-col gap-0 py-6 md:py-0",
            imageOnLeft ? "md:order-2" : "md:order-1",
          )}
        >
          <div className="flex shrink-0 flex-col gap-0">
            {!hideBuildingInfo && <FeedAboveLine entry={entry} />}
            {!hideBuildingInfo && <BuildingHeadline name={mainTitle} size="lg" />}
            {!hideUser && <FeedAuthorLine entry={entry} username={username} />}
          </div>

          {entry.content?.trim() && (
            <div className="flex min-w-0 flex-col gap-1 mt-8">
              <p
                ref={bodyRef}
                className={cn(
                  "text-[17px] leading-[1.75] text-text-primary max-w-[62ch]",
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
                  className="group/readmore mt-3.5 shrink-0 font-sans text-[11px] tracking-[0.18em] uppercase text-text-primary transition-colors hover:text-text-secondary"
                >
                  Read the full review{" "}
                  <span className="transition-colors group-hover/readmore:text-brand-accent">→</span>
                </button>
              )}
            </div>
          )}

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
        </div>
      </div>
    </article>
  );
}
