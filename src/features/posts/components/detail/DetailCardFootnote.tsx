import { cn } from "@/lib/utils";
import type { FeedReview } from "@/types/feed";
import type { NavigateFunction } from "react-router";

export interface DetailCardFootnoteProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
  navigate: NavigateFunction;
  className?: string;
}

/**
 * Likes / comments strip for building-detail cards (Roadmap §4.4) — no bookmark.
 */
export function DetailCardFootnote({
  entry,
  onLike,
  onComment,
  navigate,
  className,
}: DetailCardFootnoteProps) {
  const likes = entry.likes_count;
  const comments = entry.comments_count;

  const handleLike = () => {
    onLike?.(entry.id);
    window.dispatchEvent(new CustomEvent("pwa-interaction"));
  };

  const handleComment = () => {
    if (onComment) onComment(entry.id);
    else navigate(`/review/${entry.id}`);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 font-mono text-[9px] tracking-[0.16em] uppercase text-text-secondary",
        className,
      )}
    >
      <button
        type="button"
        className="transition-colors hover:text-text-primary"
        onClick={(e) => {
          e.stopPropagation();
          handleLike();
        }}
      >
        {likes} {likes === 1 ? "like" : "likes"}
      </button>
      <span className="text-text-secondary/40 select-none" aria-hidden>
        ·
      </span>
      <button
        type="button"
        className="transition-colors hover:text-text-primary"
        onClick={(e) => {
          e.stopPropagation();
          handleComment();
        }}
      >
        {comments} {comments === 1 ? "comment" : "comments"}
      </button>
    </div>
  );
}
