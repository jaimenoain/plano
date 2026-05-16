import { formatDistanceToNow } from "date-fns";
import { PointsBadge } from "@/features/posts/components/card-primitives";
import { cn } from "@/lib/utils";

export interface CardAuthorProps {
  username: string;
  avatarUrl?: string | null;
  timestamp: string | Date;
  rating?: number | null;
  className?: string;
  onUsernameClick?: () => void;
}

/**
 * AuthorBelow — attribution line beneath the feed title.
 * Username · timestamp · award dots.
 *
 * Carries `data-attribution-kind="direct"` so this is the ring-1 instance of
 * the `<CardAttribution>` contract — the username + rating chrome around it
 * is decoration, not a separate label.
 */
export function CardAuthor({
  username,
  avatarUrl,
  timestamp,
  rating,
  className,
  onUsernameClick,
}: CardAuthorProps) {
  const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });

  return (
    <div
      data-attribution-kind="direct"
      className={cn("flex flex-wrap items-center gap-[10px]", className)}
    >
      {avatarUrl && (
        <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full bg-surface-muted">
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <span
        onClick={(e) => {
          if (onUsernameClick) {
            e.stopPropagation();
            onUsernameClick();
          }
        }}
        className={cn(
          "text-[14px] font-medium text-text-primary border-b border-border-default pb-px leading-none transition-colors",
          onUsernameClick && "cursor-pointer hover:border-text-primary",
        )}
      >
        {username}
      </span>
      <span className="text-text-disabled text-[14px] leading-none" aria-hidden>·</span>
      <span className="text-[14px] text-text-disabled leading-none">{timeAgo}</span>
      {rating != null && rating > 0 && (
        <>
          <span className="text-text-disabled text-[14px] leading-none" aria-hidden>·</span>
          <PointsBadge points={rating} />
        </>
      )}
    </div>
  );
}
