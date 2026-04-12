import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { getBuildingUrl } from "@/utils/url";
import { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import { SuggestedContentBlock } from "@/features/feed/components/SuggestedContentBlock";
import {
  ActivityLead,
  BuildingHeadline,
  BuildingSubtitle,
  CardFooter,
  PointsBadge,
} from "@/features/feed/components/card-parts";

const MOBILE_MAX_WIDTH_PX = 767;

function countWords(text: string | null | undefined): number {
  const t = (text ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export interface FeedCardAProps {
  entry: FeedReview;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
}

/**
 * Feed — review without photo (Type A).
 */
export function FeedCardA({
  entry,
  hideUser = false,
  hideBuildingInfo = false,
  onLike,
  onComment,
}: FeedCardAProps) {
  const navigate = useNavigate();
  const [essayExpanded, setEssayExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const contentWordCount = countWords(entry.content);

  const { data } = useReviewCardData(entry);

  useEffect(() => {
    setEssayExpanded(false);
  }, [entry.id]);

  useLayoutEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`);
    const sync = () => setIsNarrowViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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

  const suppressReadMoreOnMobileShortCopy =
    isNarrowViewport && contentWordCount > 0 && contentWordCount < 120;

  const { username, isArchitectOfBuilding, mainTitle, subTitle, city } = data;
  const userActionVerb = entry.status === "pending" ? "wants to visit" : "visited";

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (entry.building?.id) {
      navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
    } else {
      navigate(`/review/${entry.id}`);
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment(entry.id);
    } else if (entry.building?.id) {
      navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
    } else {
      navigate(`/review/${entry.id}`);
    }
  };

  return (
    <SuggestedContentBlock isSuggested={entry.is_suggested} suggestionReason={entry.suggestion_reason}>
      <article
        data-testid={`feed-card-a-${entry.id}`}
        onClick={handleCardClick}
        className={cn(
          "group/card relative w-full cursor-pointer min-w-0 max-w-full",
          isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-4",
        )}
      >
        <div className="flex max-w-xl flex-col gap-3">
          <ActivityLead username={username} verb={userActionVerb} hideUser={hideUser} />

          {!hideBuildingInfo && <BuildingHeadline name={mainTitle} size="hero" />}

          {!hideBuildingInfo && (
            <BuildingSubtitle subTitle={subTitle ?? undefined} city={city} />
          )}

          {entry.rating != null && entry.rating > 0 && (
            <div>
              <PointsBadge points={entry.rating} />
            </div>
          )}

          {entry.content?.trim() && (
            <div className="min-w-0">
              <p
                ref={bodyRef}
                className={cn(
                  "text-base leading-relaxed text-text-secondary",
                  !essayExpanded && "line-clamp-3",
                )}
              >
                {entry.content}
              </p>
              {showReadMore && !essayExpanded && !suppressReadMoreOnMobileShortCopy && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEssayExpanded(true);
                  }}
                  className="mt-1.5 font-sans text-2xs tracking-[0.15em] uppercase text-text-primary transition-colors hover:text-text-secondary"
                >
                  Read more →
                </button>
              )}
            </div>
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
    </SuggestedContentBlock>
  );
}
