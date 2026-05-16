import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FeedReview } from "@/types/feed";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useReviewCardData } from "@/features/posts/hooks/useReviewCardData";
import { CardFooter, CardImage, PointsBadge } from "@/features/posts/components/card-parts";
import { CARD_B_HEIGHT } from "@/features/posts/utils/resolveCardType";
import { DetailByline } from "./DetailByline";

export interface DetailCardBProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  showFollow?: boolean;
}

/**
 * Building detail — review with media; fixed 320px height grid; no bookmark.
 */
export function DetailCardB({
  entry,
  onLike,
  onComment,
  onImageLike,
  showFollow = true,
}: DetailCardBProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [essayExpanded, setEssayExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  const { data } = useReviewCardData(entry);

  useEffect(() => {
    setEssayExpanded(false);
  }, [entry.id]);

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

  if (!data) return null;

  const {
    username,
    avatarUrl,
    isVerifiedArchitect,
    isArchitectOfBuilding,
    mediaItems,
  } = data;

  const timestamp = format(new Date(entry.edited_at || entry.created_at), "MMMM yyyy");

  const handleCardClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    navigate(`/review/${entry.id}`);
  };

  const handleComment = () => {
    if (onComment) onComment(entry.id);
    else navigate(`/review/${entry.id}`);
  };

  return (
    <article
      data-testid={`detail-card-b-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card w-full cursor-pointer min-w-0 max-w-full",
        isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-4",
      )}
    >
      <div className="grid min-h-0 w-full grid-cols-1 gap-0 md:grid-cols-2 md:h-80 md:items-stretch">
        <div className="min-h-0 min-w-0 overflow-hidden md:h-full md:order-1">
          <CardImage
            items={mediaItems}
            height={CARD_B_HEIGHT}
            reviewId={entry.id}
            onImageLike={onImageLike}
            className="h-full min-h-0 md:h-full"
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden py-6 pl-0 md:order-2 md:h-full md:pl-9 md:pr-4">
          <DetailByline
            username={username}
            avatarUrl={avatarUrl}
            isVerifiedArchitect={isVerifiedArchitect}
            isArchitectOfBuilding={isArchitectOfBuilding}
            timestamp={timestamp}
            followersCount={entry.user?.followers_count ?? null}
            userId={entry.user_id}
            showFollow={showFollow}
            viewerUserId={user?.id ?? null}
          />
          {entry.rating != null && entry.rating > 0 ? (
            <PointsBadge points={entry.rating} />
          ) : null}
          {entry.content?.trim() ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-hidden">
              <p
                ref={bodyRef}
                className={cn(
                  "text-base leading-relaxed text-text-primary",
                  !essayExpanded && "line-clamp-4",
                )}
              >
                {entry.content}
              </p>
              {showReadMore && !essayExpanded ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEssayExpanded(true);
                  }}
                  className="mt-1.5 shrink-0 font-sans text-2xs tracking-[0.15em] uppercase text-text-primary transition-colors hover:text-text-secondary"
                >
                  Read more →
                </button>
              ) : null}
            </div>
          ) : null}
          <CardFooter
            className="mt-auto shrink-0 pt-1"
            likesCount={entry.likes_count}
            commentsCount={entry.comments_count}
            isLiked={Boolean(entry.is_liked)}
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
