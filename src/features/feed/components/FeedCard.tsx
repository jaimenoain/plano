import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBuildingLocalityUrl, getBuildingUrl } from "@/utils/url";
import { FeedReview } from "@/types/feed";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import { useTrackNoteView } from "@/features/feed/hooks/useTrackNoteView";
import { countWords } from "@/features/feed/utils/resolveCardType";
import { CardImage } from "@/features/feed/components/card-parts/CardImage";
import { CardFooter } from "@/features/feed/components/card-primitives/CardFooter";
import { PointsBadge } from "@/features/feed/components/card-primitives/PointsBadge";
import type { TileSize } from "@/features/feed/utils/assignTileSize";

const MOBILE_MAX_WIDTH_PX = 767;

const DOT = <span className="text-text-disabled mx-[6px]" aria-hidden>·</span>;

export interface FeedCardProps {
  entry: FeedReview;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  showCommunityImages?: boolean;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  tileSize?: TileSize;
}

export function FeedCard({
  entry,
  hideUser = false,
  hideBuildingInfo = false,
  showCommunityImages = true,
  onLike,
  onComment,
  onImageLike,
  tileSize,
}: FeedCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [essayExpanded, setEssayExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const trackViewRef = useTrackNoteView(entry.id, entry.user_id);

  const { data } = useReviewCardData(entry, { showCommunityImages });
  const contentWordCount = countWords(entry.content);

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

  const { username, isArchitectOfBuilding, mainTitle, mediaItems, avatarUrl } = data;
  const architect = entry.building.creditedEntities?.[0]?.name;
  const city = entry.building.city;
  const year = entry.building.year_completed;
  const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true });

  const hasMedia = mediaItems.length > 0;
  const extraCount = mediaItems.length - 1;
  const suppressReadMore = isNarrowViewport && contentWordCount > 0 && contentWordCount < 120;
  const viewsCount = entry.views_count ?? 0;
  const isAuthor = !!user && !!entry.user_id && user.id === entry.user_id;

  const buildingUrl = (b: typeof entry.building) =>
    b && b.locality_country_code && b.locality_city_slug
      ? getBuildingLocalityUrl(b.locality_country_code, b.locality_city_slug, b.id, b.slug, b.short_id)
      : getBuildingUrl(b!.id, b!.slug, b!.short_id);

  const handleCardClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    navigate(entry.building?.id ? buildingUrl(entry.building) : `/review/${entry.id}`);
  };

  const handleComment = () => {
    if (onComment) {
      onComment(entry.id);
    } else {
      navigate(entry.building?.id ? buildingUrl(entry.building) : `/review/${entry.id}`);
    }
  };

  // ── xl tile: full-height photo overlay ────────────────────────────────────
  if (tileSize === "xl") {
    if (!hasMedia) {
      console.warn(`[FeedCard] xl tile requested for card ${entry.id} with no media — downgrading to sm`);
      // Fall through to sm pull-quote below
    } else {
      return (
        <article
          ref={trackViewRef}
          data-testid={`feed-card-${entry.id}`}
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
  }

  // ── lg tile: wide 2-col photo overlay ─────────────────────────────────────
  if (tileSize === "lg" && hasMedia) {
    return (
      <article
        ref={trackViewRef}
        data-testid={`feed-card-${entry.id}`}
        onClick={handleCardClick}
        className="group/card relative h-full w-full cursor-pointer overflow-hidden"
      >
        <CardImage
          items={mediaItems}
          reviewId={entry.id}
          onImageLike={onImageLike}
          firstMediaOnly
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
          <h2 className="font-sans font-bold text-text-inverse leading-[0.95] tracking-[-0.03em] text-[clamp(1.1rem,2vw,1.75rem)] line-clamp-2">
            {mainTitle}
          </h2>
          <p className="mt-1.5 text-xs text-white/65">{username} · {timeAgo}</p>
        </div>
      </article>
    );
  }

  // ── md tile: single-col photo overlay ─────────────────────────────────────
  if (tileSize === "md" && hasMedia) {
    return (
      <article
        ref={trackViewRef}
        data-testid={`feed-card-${entry.id}`}
        onClick={handleCardClick}
        className="group/card relative h-full w-full cursor-pointer overflow-hidden"
      >
        <CardImage
          items={mediaItems}
          reviewId={entry.id}
          onImageLike={onImageLike}
          firstMediaOnly
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h2 className="font-sans font-bold text-text-inverse leading-[0.95] tracking-[-0.03em] text-[clamp(1rem,1.5vw,1.4rem)] line-clamp-1">
            {mainTitle}
          </h2>
          <p className="mt-1 text-[11px] text-white/60">{username}</p>
        </div>
      </article>
    );
  }

  // ── sm tile: pull-quote ────────────────────────────────────────────────────
  if (tileSize === "sm" || (tileSize === "xl" && !hasMedia) || (tileSize === "lg" && !hasMedia) || (tileSize === "md" && !hasMedia)) {
    return (
      <article
        ref={trackViewRef}
        data-testid={`feed-card-${entry.id}`}
        onClick={handleCardClick}
        className="group/card relative h-full w-full cursor-pointer flex flex-col justify-between p-5 bg-surface-card"
      >
        <div className="flex-1 overflow-hidden">
          <blockquote className="font-sans font-medium text-text-primary leading-[1.15] tracking-[-0.025em] text-[clamp(1.1rem,2vw,1.5rem)] line-clamp-4">
            {entry.content || mainTitle}
          </blockquote>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <p className="text-xs font-medium text-text-primary line-clamp-1">{mainTitle}</p>
          <p className="text-[11px] text-text-disabled">{username}</p>
        </div>
      </article>
    );
  }

  // ── V1 / no-tileSize: legacy stacked layout (used outside the mosaic) ──────
  const cardImageAspectRatio = "16/9";

  return (
    <article
      ref={trackViewRef}
      data-testid={`feed-card-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card relative w-full cursor-pointer min-w-0",
        tileSize && "h-full",
        isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-6",
      )}
    >
      {/* 1. Hero image */}
      {hasMedia && (
        <div className="relative mb-5">
          <CardImage
            items={mediaItems}
            aspectRatio={cardImageAspectRatio}
            reviewId={entry.id}
            onImageLike={onImageLike}
            firstMediaOnly
            className="transition-transform duration-500 group-hover/card:scale-[1.005]"
          />
          {extraCount > 0 && (
            <span className="absolute bottom-3 right-3 font-mono text-[10px] tracking-[0.1em] uppercase bg-black/55 text-white px-2 py-1 pointer-events-none">
              +{extraCount}
            </span>
          )}
        </div>
      )}

      {/* 2. Building name */}
      {!hideBuildingInfo && (
        <h2
          className={cn(
            "font-sans font-bold tracking-[-0.035em] text-text-primary leading-[0.95]",
            tileSize ? "line-clamp-2" : "line-clamp-2",
            hasMedia
              ? "text-[clamp(1.75rem,3.5vw,2.5rem)]"
              : "text-[clamp(2rem,4.5vw,3rem)]",
          )}
        >
          {mainTitle}
        </h2>
      )}

      {/* 3. Merged meta row: @username · city · architect · year · time ago · rating */}
      {(!hideBuildingInfo || !hideUser) && (
        <div className="mt-3 flex flex-wrap items-center gap-y-1 font-sans text-[13px] text-text-secondary leading-none">
          {!hideUser && (
            <>
              {avatarUrl && (
                <div className="mr-2 h-4 w-4 shrink-0 overflow-hidden rounded-full bg-surface-muted inline-block align-middle">
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <span
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${username}`); }}
                className="cursor-pointer hover:text-text-primary transition-colors"
              >
                {username}
              </span>
            </>
          )}
          {!hideBuildingInfo && city?.trim() && <>{!hideUser && DOT}<span>{city}</span></>}
          {!hideBuildingInfo && architect && <>{DOT}<span>{architect}</span></>}
          {!hideBuildingInfo && year != null && <>{DOT}<span>{year}</span></>}
          {!hideUser && <>{DOT}<span>{timeAgo}</span></>}
          {!hideUser && entry.rating != null && entry.rating > 0 && (
            <>{DOT}<PointsBadge points={entry.rating} /></>
          )}
          {!hideUser && isAuthor && viewsCount > 0 && (
            <>
              {DOT}
              <span
                className="inline-flex items-center gap-1"
                data-testid={`feed-card-views-${entry.id}`}
                aria-label={`${viewsCount} ${viewsCount === 1 ? "view" : "views"}`}
                title={`${viewsCount} ${viewsCount === 1 ? "view" : "views"}`}
              >
                <Eye className="h-3 w-3" strokeWidth={1.75} aria-hidden />
                <span className="font-mono">{viewsCount}</span>
              </span>
            </>
          )}
        </div>
      )}

      {/* 4. Review text */}
      {entry.content?.trim() && (
        <div className="mt-5 min-w-0">
          <p
            ref={bodyRef}
            className={cn(
              "text-[17px] leading-[1.75] text-text-primary max-w-[62ch] font-sans",
              !essayExpanded && (tileSize ? "line-clamp-2" : "line-clamp-4"),
            )}
          >
            {entry.content}
          </p>
          {showReadMore && !essayExpanded && !suppressReadMore && !tileSize && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEssayExpanded(true);
              }}
              className="group/readmore mt-4 font-sans text-[11px] font-medium tracking-[0.18em] uppercase text-text-primary transition-colors"
            >
              <span className="transition-colors group-hover/readmore:text-text-secondary">
                Read the full review
              </span>{" "}
              <span className="transition-colors inline-block group-hover/readmore:translate-x-0.5 group-hover/readmore:text-brand-accent">
                →
              </span>
            </button>
          )}
        </div>
      )}

      {/* 5. Actions */}
      <CardFooter
        className="mt-5"
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
