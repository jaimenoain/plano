import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CardFooterProps {
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  onLike: () => void;
  onComment: () => void;
  onSave: () => void;
  isSaving?: boolean;
  className?: string;
}

/**
 * Likes / comments (uppercase mono-style) + bookmark; bookmark fades in on desktop card hover.
 */
export function CardFooter({
  likesCount,
  commentsCount,
  isLiked,
  isSaved,
  onLike,
  onComment,
  onSave,
  isSaving = false,
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
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        disabled={isSaving}
        aria-label={isSaved ? "Saved to your list" : "Save building to your list"}
        title={isSaved ? "Saved to your list" : "Save to your list"}
        className={cn(
          "ml-auto shrink-0 rounded-sm p-1 text-text-secondary transition-colors hover:text-text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1",
          "opacity-100 md:opacity-0 md:transition-opacity md:group-hover/card:opacity-100 md:focus-visible:opacity-100",
          isSaving && "pointer-events-none opacity-50",
        )}
      >
        <Bookmark
          className={cn("h-4 w-4", isSaved && "fill-text-primary text-text-primary")}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
    </div>
  );
}
