import { type MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import { CardFooter, CardImage } from "@/features/feed/components/card-parts";
import { CARD_C_IMAGE_HEIGHT } from "@/features/feed/utils/resolveCardType";

export interface DetailCardCProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
}

/**
 * Building detail — photos only; light inline attribution; likes/comments only (no bookmark).
 */
export function DetailCardC({
  entry,
  onLike,
  onComment,
  onImageLike,
}: DetailCardCProps) {
  const navigate = useNavigate();

  const { data } = useReviewCardData(entry);

  if (!data) return null;

  const { username, avatarUrl, mediaItems } = data;
  const verb = entry.status === "pending" ? "wants to visit" : "visited";
  const initial = username.trim().charAt(0).toUpperCase() || "?";

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
      data-testid={`detail-card-c-${entry.id}`}
      onClick={handleCardClick}
      className="group/card w-full min-w-0 max-w-full cursor-pointer"
    >
      <CardImage
        items={mediaItems}
        height={CARD_C_IMAGE_HEIGHT}
        reviewId={entry.id}
        onImageLike={onImageLike}
      />
      <div className="mt-3 flex min-w-0 items-center gap-2">
        <Avatar className="h-7 w-7 shrink-0 rounded-full border border-border-default bg-surface-muted">
          <AvatarImage src={avatarUrl || undefined} alt="" className="h-7 w-7" />
          <AvatarFallback className="text-2xs font-semibold text-text-secondary">{initial}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            to={`/profile/${username}`}
            className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary hover:opacity-80"
            onClick={(e) => e.stopPropagation()}
          >
            {username}
          </Link>
          <span className="shrink-0 font-sans text-2xs uppercase tracking-[0.1em] text-text-secondary">
            {verb}
          </span>
          <span className="shrink-0 font-sans text-2xs uppercase tracking-[0.1em] text-text-secondary">
            {timestamp}
          </span>
        </div>
      </div>
      <CardFooter
        className={cn("pt-3")}
        likesCount={entry.likes_count}
        commentsCount={entry.comments_count}
        isLiked={Boolean(entry.is_liked)}
        onLike={() => {
          onLike?.(entry.id);
          window.dispatchEvent(new CustomEvent("pwa-interaction"));
        }}
        onComment={handleComment}
      />
    </article>
  );
}
