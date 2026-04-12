import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { FeedReview } from "@/types/feed";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import { CardFooter, PointsBadge } from "@/features/feed/components/card-parts";
import { DetailByline } from "./DetailByline";

export interface DetailCardAProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
  showFollow?: boolean;
}

/**
 * Building detail — text-only review; reviewer-forward byline; no bookmark.
 */
export function DetailCardA({
  entry,
  onLike,
  onComment,
  showFollow = true,
}: DetailCardAProps) {
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
  } = data;

  const timestamp = formatDistanceToNow(new Date(entry.edited_at || entry.created_at), {
    addSuffix: true,
  }).replace("about ", "");

  const handleCardClick = (e: React.MouseEvent) => {
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
      data-testid={`detail-card-a-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card w-full cursor-pointer min-w-0 max-w-full",
        isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-4",
      )}
    >
      <div className="flex max-w-xl flex-col gap-4">
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
          <div className="min-w-0">
            <p
              ref={bodyRef}
              className={cn(
                "text-base leading-relaxed text-text-primary",
                !essayExpanded && "line-clamp-5",
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
                className="mt-1.5 font-sans text-2xs tracking-[0.15em] uppercase text-text-primary transition-colors hover:text-text-secondary"
              >
                Read more →
              </button>
            ) : null}
          </div>
        ) : null}

        <CardFooter
          className="pt-1"
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
    </article>
  );
}
