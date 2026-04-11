import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router";
import { FeedReview } from "@/types/feed";
import { getBuildingUrl } from "@/utils/url";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";

/**
 * Award points badge. Renders filled black dots only — no empty placeholders.
 * Shows nothing when points === 0. Points are an award, not a score.
 * Uses text-primary (monochromatic) per editorial content-page colour rules.
 */
const PointsBadge = ({ points }: { points: number }) => {
  if (!points || points <= 0) return null;
  return (
    <div
      className="flex items-center gap-1.5"
      title={`${points} ${points === 1 ? "point" : "points"}`}
    >
      {Array.from({ length: points }).map((_, i) => (
        <div key={i} className="w-3 h-3 rounded-full bg-text-primary" />
      ))}
    </div>
  );
};

export interface ReviewCardDetailProps {
  entry: FeedReview;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
  /** Passed through to {@link useReviewCardData} (subtitle / media); default matches feed detail usage. */
  variant?: "default" | "compact";
  showCommunityImages?: boolean;
}

/**
 * Building / review detail layout: byline, thumbnail + copy, text actions.
 * Fixed horizontal media + text row (no `imagePosition`).
 */
export function ReviewCardDetail({
  entry,
  hideUser = false,
  hideBuildingInfo = false,
  onLike,
  onComment,
  variant = "default",
  showCommunityImages = true,
}: ReviewCardDetailProps) {
  const navigate = useNavigate();
  const { data } = useReviewCardData(entry, { variant, showCommunityImages });

  if (!data) return null;

  const { username, isVerifiedArchitect, mainTitle, subTitle, posterUrl, mediaItems, city } = data;

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComment) {
      onComment(entry.id);
    } else {
      if (entry.building.id) {
        navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
      } else {
        navigate(`/review/${entry.id}`);
      }
    }
  };

  // ── Byline ──────────────────────────────────────────────────────────────────
  // Space Mono strip — no avatar.
  const timestamp = formatDistanceToNow(
    new Date(entry.edited_at || entry.created_at),
    { addSuffix: true },
  ).replace("about ", "");

  const Byline = !hideUser ? (
    <div className="flex items-center gap-2 min-w-0 mb-3">
      <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary font-medium truncate">
        {username}
      </span>
      {isVerifiedArchitect && (
        <span className="font-mono text-[9px] tracking-[0.1em] uppercase border border-text-primary text-text-primary px-1.5 py-0.5 font-bold shrink-0 leading-none">
          Architect
        </span>
      )}
      <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-text-secondary/40 ml-auto shrink-0">
        {timestamp}
      </span>
    </div>
  ) : (
    <div className="mb-3">
      <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-text-secondary/40">
        {timestamp}
      </span>
    </div>
  );

  // ── Thumbnail ───────────────────────────────────────────────────────────────
  // Sharp edges — no rounded corners.
  const Thumbnail = !hideBuildingInfo && (
    mediaItems.length > 0 && mediaItems[0].type === "video" ? (
      <div className="w-32 h-24 bg-black shrink-0 overflow-hidden video-container">
        <VideoPlayer
          src={mediaItems[0].url}
          poster={mediaItems[0].poster}
          className="w-full h-full"
          autoPlayOnVisible={false}
          muted={true}
          objectFit="cover"
        />
      </div>
    ) : mediaItems.length > 0 ? (
      <img
        src={mediaItems[0].url}
        alt={entry.building.name}
        className="w-32 h-24 object-cover shrink-0"
      />
    ) : posterUrl ? (
      <img
        src={posterUrl}
        alt={entry.building.name}
        className="w-32 h-24 object-cover shrink-0"
      />
    ) : (
      <div className="w-32 h-24 bg-surface-muted shrink-0" />
    )
  );

  return (
    <article className="px-4 py-4 hairline">
      {Byline}

      <div className="flex gap-3">
        {Thumbnail}

        <div className="flex-1 min-w-0">
          {/* Building headline — suppressed on building detail page */}
          {!hideBuildingInfo && (
            <div className="mb-2">
              <h3 className="text-base font-bold tracking-tight text-text-primary leading-tight">
                {mainTitle}
              </h3>
              {(subTitle || city) && (
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary mt-0.5">
                  {[subTitle, city].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          )}

          {/* Points */}
          {entry.rating != null && entry.rating > 0 && (
            <div className="mb-2">
              <PointsBadge points={entry.rating} />
            </div>
          )}

          {/* Review body */}
          {entry.content && (
            <p className="text-sm text-text-secondary leading-relaxed break-words mb-2">
              {entry.content}
            </p>
          )}
        </div>
      </div>

      {/* Footer — text actions, no icons */}
      <div className="flex items-center gap-3 mt-3 pt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike?.(entry.id);
            window.dispatchEvent(new CustomEvent("pwa-interaction"));
          }}
          className={`font-mono text-[10px] tracking-[0.12em] uppercase transition-colors ${
            entry.is_liked
              ? "text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {entry.likes_count} {entry.likes_count === 1 ? "note" : "notes"}
        </button>
        <span className="text-text-secondary/30 select-none text-xs">·</span>
        <button
          onClick={handleCommentClick}
          className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary hover:text-text-primary transition-colors"
        >
          {entry.comments_count} {entry.comments_count === 1 ? "comment" : "comments"}
        </button>
      </div>
    </article>
  );
}