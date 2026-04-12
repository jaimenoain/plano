import { cn } from "@/lib/utils";
import { CardBookmark, type CardBookmarkHoverGroup } from "./CardBookmark";

export interface CardFooterProps {
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
  /** When set, renders bookmark with Supabase save. Omit to hide bookmark (e.g. building detail cards). */
  buildingId?: string | null;
  bookmarkHoverGroup?: CardBookmarkHoverGroup;
  className?: string;
}

/**
 * Likes / comments (uppercase) + optional bookmark; bookmark fades in on desktop group hover.
 */
export function CardFooter({
  likesCount,
  commentsCount,
  isLiked,
  onLike,
  onComment,
  buildingId,
  bookmarkHoverGroup = "card",
  className,
}: CardFooterProps) {
  return (
    <div className={cn("flex w-full max-w-full min-w-0 items-center gap-3 flex-wrap", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onLike();
        }}
        className={cn(
          "font-sans text-2xs tracking-[0.12em] uppercase transition-colors",
          isLiked ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
        )}
      >
        {likesCount} {likesCount === 1 ? "like" : "likes"}
      </button>
      <span className="text-text-secondary/30 select-none text-xs" aria-hidden>
        ·
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onComment();
        }}
        className="font-sans text-2xs tracking-[0.12em] uppercase text-text-secondary hover:text-text-primary transition-colors"
      >
        {commentsCount} {commentsCount === 1 ? "comment" : "comments"}
      </button>
      {buildingId ? (
        <CardBookmark buildingId={buildingId} hoverGroup={bookmarkHoverGroup} />
      ) : null}
    </div>
  );
}
