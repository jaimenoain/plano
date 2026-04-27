import { useNavigate } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { FeedReview } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";
import { CardFooter } from "@/features/feed/components/card-parts";

interface FeedClusterCardProps {
  entries: FeedReview[];
  user: {
    username: string | null;
    avatar_url: string | null;
  };
  location?: string;
  timestamp: string | Date;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
}

export function FeedClusterCard({
  entries,
  user,
  location,
  timestamp,
  onLike,
  onComment,
}: FeedClusterCardProps) {
  const navigate = useNavigate();

  const username = user.username || "Unknown";
  const visible = entries.slice(0, 3);
  const firstEntry = entries[0];
  const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });

  const city = location ?? firstEntry?.building?.city ?? "";
  const count = entries.length;

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (user.username) navigate(`/profile/${user.username}`);
  };

  const handleComment = () => {
    if (onComment && firstEntry) {
      onComment(firstEntry.id);
    } else if (user.username) {
      navigate(`/profile/${user.username}`);
    }
  };

  return (
    <div onClick={handleClick} className="w-full cursor-pointer">
      {/* feed-above: city · "N buildings" */}
      {(city || count > 0) && (
        <p className="text-[13px] tracking-[-0.005em] text-text-secondary leading-none mb-[10px] flex items-center gap-[10px]">
          {city && <span>{city}</span>}
          {city && <span className="text-text-disabled">·</span>}
          <span>{count} building{count !== 1 ? "s" : ""}</span>
        </p>
      )}

      {/* feed-title at editorial scale */}
      <h2 className="font-sans font-bold tracking-[-0.035em] leading-[0.95] text-[clamp(3rem,6vw,4.5rem)] text-text-primary">
        A day with{" "}
        <span className="text-text-disabled">{username}.</span>
      </h2>

      {/* AuthorBelow: username · timestamp, no rating */}
      <div className="flex flex-wrap items-center gap-[10px] text-sm text-text-secondary mt-[14px]">
        <span className="font-medium text-text-primary border-b border-border-default pb-px cursor-pointer hover:border-text-primary transition-colors">
          {username}
        </span>
        <span className="text-text-disabled">·</span>
        <span className="text-text-disabled">{timeAgo}</span>
      </div>

      {/* 3-column photo mosaic */}
      <div className="grid grid-cols-3 gap-[1.5px] bg-border-default mt-8">
        {visible.map((entry) => {
          const imgUrl =
            getBuildingImageUrl(entry.building.main_image_url) ??
            getBuildingImageUrl(entry.building.community_preview_url);
          return (
            <div
              key={entry.id}
              className="relative overflow-hidden aspect-square bg-surface-muted"
            >
              {imgUrl && (
                <img
                  src={imgUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/72 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-[15px] font-semibold text-white leading-tight truncate">
                  {entry.building.name}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/70 mt-0.5">
                  {entry.building.city}
                </p>
                {(entry.rating ?? 0) > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {Array.from({ length: entry.rating! }).map((_, i) => (
                      <i key={i} className="inline-block w-[7px] h-[7px] rounded-full bg-white not-italic" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FeedFooter */}
      {firstEntry && (
        <CardFooter
          className="pt-8"
          likesCount={firstEntry.likes_count}
          commentsCount={firstEntry.comments_count}
          isLiked={Boolean(firstEntry.is_liked)}
          buildingId={firstEntry.building?.id ?? null}
          onLike={() => {
            onLike?.(firstEntry.id);
            window.dispatchEvent(new CustomEvent("pwa-interaction"));
          }}
          onComment={handleComment}
        />
      )}
    </div>
  );
}
