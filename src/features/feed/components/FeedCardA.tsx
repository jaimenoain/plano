import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { getBuildingLocalityUrl, getBuildingUrl } from "@/utils/url";
import { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import { countWords } from "@/features/feed/utils/resolveCardType";
import {
  BuildingHeadline,
  CardFooter,
  PointsBadge,
} from "@/features/feed/components/card-parts";

const MOBILE_MAX_WIDTH_PX = 767;
const PULL_QUOTE_WORD_THRESHOLD = 15;

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

export interface FeedCardAProps {
  entry: FeedReview;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  showCommunityImages?: boolean;
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
  showCommunityImages = true,
  onLike,
  onComment,
}: FeedCardAProps) {
  const navigate = useNavigate();
  const [essayExpanded, setEssayExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const contentWordCount = countWords(entry.content);

  const { data } = useReviewCardData(entry, { showCommunityImages });

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

  const { username, isArchitectOfBuilding, mainTitle } = data;
  const isPullQuote =
    entry.content?.trim() && contentWordCount > 0 && contentWordCount <= PULL_QUOTE_WORD_THRESHOLD;

  const handleCardClick = (e: React.MouseEvent) => {
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
      data-testid={`feed-card-a-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card relative w-full cursor-pointer min-w-0 max-w-full",
        isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-4",
      )}
    >
      <div className="flex flex-col gap-0">
        {!hideBuildingInfo && <FeedAboveLine entry={entry} />}

        {!hideBuildingInfo && !isPullQuote && <BuildingHeadline name={mainTitle} size="xl" />}

        {!hideUser && <FeedAuthorLine entry={entry} username={username} />}

        {isPullQuote ? (
          <blockquote className="mt-1 text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-[1.15] tracking-[-0.025em] text-text-primary max-w-[24ch]">
            <span className="text-text-disabled mr-[0.1em]" aria-hidden="true">&#x201C;</span>
            {entry.content}
            <span
              onClick={(e) => { e.stopPropagation(); handleCardClick(e as unknown as React.MouseEvent); }}
              className="ml-[0.3em] text-[0.45em] font-medium tracking-[-0.005em] text-text-disabled border-b border-border-default pb-px cursor-pointer hover:text-text-primary hover:border-text-primary transition-colors align-[0.2em] whitespace-nowrap inline"
            >
              {mainTitle}
            </span>
          </blockquote>
        ) : entry.content?.trim() ? (
          <div className="mt-8 min-w-0">
            <p
              ref={bodyRef}
              className={cn(
                "text-[17px] leading-[1.75] text-text-primary max-w-[62ch]",
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
                className="mt-3.5 font-sans text-[11px] tracking-[0.18em] uppercase text-text-primary transition-colors hover:text-text-secondary"
              >
                Read the full review →
              </button>
            )}
          </div>
        ) : null}

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
    </article>
  );
}
