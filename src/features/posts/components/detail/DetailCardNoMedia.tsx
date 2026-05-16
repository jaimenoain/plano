import { type MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { DetailCardVariant } from "@/types/cards";
import type { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import { PointsBadge } from "@/features/feed/components/card-parts";
import { DetailCardFootnote } from "@/features/feed/components/detail/DetailCardFootnote";
import { DetailCardTextTreatmentBlock } from "@/features/feed/components/detail/DetailCardTextTreatmentBlock";

export interface DetailCardNoMediaProps {
  entry: FeedReview;
  variant: DetailCardVariant;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
}

/**
 * Building detail — text-only review (no photos/video): §4.3-scale byline + §4.4 copy + footnote.
 */
export function DetailCardNoMedia({
  entry,
  variant,
  onLike,
  onComment,
}: DetailCardNoMediaProps) {
  const navigate = useNavigate();
  const { data } = useReviewCardData(entry);

  if (!data) return null;

  const { username, avatarUrl, isVerifiedArchitect, isArchitectOfBuilding } = data;

  const initial = username.trim().charAt(0).toUpperCase() || "?";
  const reviewDate = new Date(entry.edited_at || entry.created_at);
  const monthYear = format(reviewDate, "MMMM yyyy");

  const handleCardClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    navigate(`/review/${entry.id}`);
  };

  return (
    <article
      data-testid={`detail-card-no-media-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card w-full min-w-0 max-w-full cursor-pointer",
        isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-4",
      )}
    >
      <div className="max-w-[600px] px-0 py-6 md:py-0">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="h-[60px] w-[60px] shrink-0 rounded-full border border-border-default bg-surface-muted">
            <AvatarImage src={avatarUrl || undefined} alt="" className="h-[60px] w-[60px]" />
            <AvatarFallback className="text-sm font-semibold text-text-secondary">{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link
              to={`/profile/${username}`}
              className="block truncate text-[26px] font-black leading-none tracking-tight text-text-primary transition-colors hover:opacity-80 md:overflow-visible md:whitespace-normal"
              onClick={(e) => e.stopPropagation()}
            >
              {username}
            </Link>
            {isArchitectOfBuilding ? (
              <span className="mt-1.5 block w-fit bg-text-primary px-2 py-0.5 font-sans text-2xs font-bold uppercase tracking-[0.1em] text-text-inverse">
                Designed this
              </span>
            ) : isVerifiedArchitect ? (
              <span className="mt-1.5 block w-fit border border-text-primary px-2 py-0.5 font-sans text-2xs font-bold uppercase tracking-[0.1em] text-text-primary">
                Architect
              </span>
            ) : null}
            <p className="mt-2 font-mono text-[9px] text-text-secondary">{monthYear}</p>
          </div>
        </div>
        <div className="my-[14px] border-t border-border-default" aria-hidden />
        <div className="flex flex-col gap-4">
          {entry.rating != null && entry.rating > 0 ? (
            <div className="shrink-0">
              <PointsBadge points={entry.rating} />
            </div>
          ) : null}
          <DetailCardTextTreatmentBlock
            entry={entry}
            textTreatment={variant.textTreatment}
            narrowColumn={false}
            navigate={navigate}
          />
          <DetailCardFootnote
            entry={entry}
            onLike={onLike}
            onComment={onComment}
            navigate={navigate}
          />
        </div>
      </div>
    </article>
  );
}
