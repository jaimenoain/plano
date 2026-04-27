import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { getBuildingLocalityUrl, getBuildingUrl } from "@/utils/url";
import { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import { countWords } from "@/features/feed/utils/resolveCardType";
import {
  BuildingHeadline,
  CardFooter,
  CardMeta,
  CardAuthor,
} from "@/features/feed/components/card-parts";

const MOBILE_MAX_WIDTH_PX = 767;
const PULL_QUOTE_WORD_THRESHOLD = 15;

export interface FeedCardAProps {
  entry: FeedReview;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  showCommunityImages?: boolean;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
}

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
      data-testid={`feed-card-a-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card relative w-full cursor-pointer min-w-0",
        isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-6",
      )}
    >
      {/* CardMeta always first */}
      {!hideBuildingInfo && (
        <CardMeta
          city={entry.building.city}
          architect={entry.building.creditedEntities?.[0]?.name}
          year={entry.building.year_completed}
          className="mb-[10px]"
        />
      )}

      {isPullQuote ? (
        /* Pull-quote layout: meta → blockquote → author → footer */
        <>
          <blockquote className="mt-6 text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-[1.15] tracking-[-0.025em] text-text-primary max-w-[24ch]">
            <span className="text-text-disabled mr-[0.05em]" aria-hidden>&#x201C;</span>
            {entry.content}
            <span
              onClick={(e) => { e.stopPropagation(); handleCardClick(e as unknown as React.MouseEvent); }}
              className="ml-[0.4em] text-[0.45em] font-medium tracking-[-0.01em] text-text-disabled border-b border-border-default pb-px cursor-pointer hover:text-text-primary hover:border-text-primary transition-colors align-[0.25em] whitespace-nowrap inline uppercase"
            >
              {mainTitle}
            </span>
          </blockquote>
          {!hideUser && (
            <CardAuthor
              username={username}
              avatarUrl={data.avatarUrl}
              timestamp={entry.created_at}
              rating={entry.rating}
              className="mt-5"
              onUsernameClick={() => navigate(`/profile/${username}`)}
            />
          )}
        </>
      ) : (
        /* Standard layout: meta → headline → author → body → footer */
        <>
          {!hideBuildingInfo && (
            <BuildingHeadline name={mainTitle} size="xl" className="mb-2" />
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
            <div className="mt-9 min-w-0">
              <p
                ref={bodyRef}
                className={cn(
                  "text-[17px] leading-[1.75] text-text-primary max-w-[62ch] font-sans",
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
                  className="group/readmore mt-5 font-sans text-[11px] font-medium tracking-[0.18em] uppercase text-text-primary transition-colors"
                >
                  <span className="transition-colors group-hover/readmore:text-text-secondary">
                    Read the full review
                  </span>
                  {" "}
                  <span className="transition-colors inline-block group-hover/readmore:translate-x-0.5 group-hover/readmore:text-brand-accent">
                    →
                  </span>
                </button>
              )}
            </div>
          )}
        </>
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
    </article>
  );
}
