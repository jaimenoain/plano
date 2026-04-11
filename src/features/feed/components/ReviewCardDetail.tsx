import { Heart, MessageCircle, Circle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router";
import { FeedReview } from "@/types/feed";
import { getBuildingUrl } from "@/utils/url";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";

const RatingCircles = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <Circle
          key={i}
          className={`w-3 h-3 ${
            i < rating
              ? "fill-brand-primary text-text-primary"
              : "fill-transparent text-text-secondary/20"
          }`}
        />
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
 * Building / review detail layout: user header (optional), thumbnail + copy, like/comment actions.
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

  const { username, avatarUrl, userInitial, mainTitle, subTitle, posterUrl, mediaItems } = data;

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

  return (
    <article className="px-4 py-4 hairline">
      {!hideUser ? (
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-surface-muted text-text-primary text-sm">{userInitial}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{username}</p>
            <p className="text-xs text-text-secondary">
              {formatDistanceToNow(new Date(entry.edited_at || entry.created_at), { addSuffix: true }).replace(
                "about ",
                "",
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <p className="text-xs text-text-secondary">
            {formatDistanceToNow(new Date(entry.edited_at || entry.created_at), { addSuffix: true }).replace(
              "about ",
              "",
            )}
          </p>
        </div>
      )}
      <div className="flex gap-3">
        {!hideBuildingInfo &&
          (mediaItems.length > 0 && mediaItems[0].type === "video" ? (
            <div className="w-32 h-24 bg-black rounded-sm flex-shrink-0 video-container">
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
              className="w-32 h-24 object-cover rounded-sm flex-shrink-0"
            />
          ) : posterUrl ? (
            <img src={posterUrl} alt={entry.building.name} className="w-32 h-24 object-cover rounded-sm flex-shrink-0" />
          ) : (
            <div className="w-32 h-24 bg-surface-muted rounded-sm flex-shrink-0 flex items-center justify-center">
              <span className="text-xs text-text-secondary">No image</span>
            </div>
          ))}
        <div className="flex-1 min-w-0">
          {!hideBuildingInfo && (
            <div className="mb-2">
              <h3 className="text-base font-semibold text-text-primary truncate">{mainTitle}</h3>
              {subTitle && <p className="text-xs text-text-secondary truncate">{subTitle}</p>}
            </div>
          )}
          {entry.rating && entry.rating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <RatingCircles rating={entry.rating} />
            </div>
          )}
          {entry.content && <p className="text-sm text-text-secondary mb-2 break-words">{entry.content}</p>}
        </div>
      </div>
      <div className="flex items-center gap-6 mt-3 pt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike?.(entry.id);
            window.dispatchEvent(new CustomEvent("pwa-interaction"));
          }}
          className="flex items-center gap-1.5 text-text-secondary hover:text-brand-primary transition-colors"
        >
          <Heart className={`h-4 w-4 ${entry.is_liked ? "fill-brand-primary text-brand-primary" : ""}`} />
          <span className="text-xs">{entry.likes_count}</span>
        </button>
        <button
          onClick={handleCommentClick}
          className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs">{entry.comments_count}</span>
        </button>
      </div>
    </article>
  );
}
