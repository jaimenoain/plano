import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router";
import { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardTypeA } from "@/features/feed/components/CardTypeA";
import { CardTypeB } from "@/features/feed/components/CardTypeB";
import { CardTypeC } from "@/features/feed/components/CardTypeC";
import { ActivityStreamGroup } from "@/features/feed/components/ActivityStream";
import { resolveCardType } from "@/features/feed/utils/resolveCardType";

export interface ReviewCardDetailProps {
  entry: FeedReview;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  /** Passed through to {@link useReviewCardData} (byline avatar only); card bodies use the same flag. */
  variant?: "default" | "compact";
  showCommunityImages?: boolean;
}

/**
 * Detail / playground layout: columnist byline + resolved feed card (building line optional).
 */
export function ReviewCardDetail({
  entry,
  hideUser = false,
  hideBuildingInfo = false,
  onLike,
  onComment,
  onImageLike,
  variant = "default",
  showCommunityImages = true,
}: ReviewCardDetailProps) {
  const { data } = useReviewCardData(entry, { variant, showCommunityImages });

  if (!data) return null;

  const { username, avatarUrl, isVerifiedArchitect } = data;

  const timestamp = formatDistanceToNow(new Date(entry.edited_at || entry.created_at), {
    addSuffix: true,
  }).replace("about ", "");

  const Byline = !hideUser ? (
    <div className="flex gap-3 items-start min-w-0 mb-3">
      <Avatar className="h-12 w-12 shrink-0 rounded-full border border-border-default bg-surface-muted">
        <AvatarImage src={avatarUrl || undefined} alt="" />
        <AvatarFallback className="text-sm font-semibold text-text-secondary">
          {username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <Link
            to={`/profile/${username}`}
            className="text-base md:text-lg font-semibold tracking-tight text-text-primary transition-colors hover:opacity-80"
          >
            {username}
          </Link>
          {isVerifiedArchitect ? (
            <span className="mt-1 block font-sans text-[9px] tracking-[0.1em] uppercase border border-text-primary text-text-primary px-1.5 py-0.5 font-bold leading-none w-fit">
              Architect
            </span>
          ) : null}
        </div>
        <span className="font-sans text-[10px] tracking-[0.1em] uppercase text-text-secondary/40 shrink-0">
          {timestamp}
        </span>
      </div>
    </div>
  ) : (
    <div className="mb-3">
      <span className="font-sans text-[10px] tracking-[0.1em] uppercase text-text-secondary/40">
        {timestamp}
      </span>
    </div>
  );

  const streamHideUser = !hideUser;
  const t = resolveCardType(entry);

  const cardBody =
    t === "activity" ? (
      <ActivityStreamGroup entries={[entry]} />
    ) : t === "A" ? (
      <CardTypeA
        entry={entry}
        hideUser={streamHideUser}
        hideBuildingInfo={hideBuildingInfo}
        showCommunityImages={showCommunityImages}
        onLike={onLike}
        onComment={onComment}
      />
    ) : t === "B" ? (
      <CardTypeB
        entry={entry}
        index={0}
        hideUser={streamHideUser}
        hideBuildingInfo={hideBuildingInfo}
        showCommunityImages={showCommunityImages}
        imagePosition="left"
        onLike={onLike}
        onComment={onComment}
        onImageLike={onImageLike}
      />
    ) : (
      <CardTypeC
        entry={entry}
        hideUser={streamHideUser}
        hideBuildingInfo={hideBuildingInfo}
        showCommunityImages={showCommunityImages}
        onLike={onLike}
        onComment={onComment}
        onImageLike={onImageLike}
      />
    );

  return (
    <div className="px-4 py-4 hairline">
      {Byline}
      {cardBody}
    </div>
  );
}
