import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router";
import { FeedReview } from "@/types/feed";
import { getBuildingUrl } from "@/utils/url";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedCompactCardProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
}

export function FeedCompactCard({
  entry,
  onLike: _onLike,
  onComment: _onComment,
}: FeedCompactCardProps) {
  const navigate = useNavigate();

  if (!entry.building) return null;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (entry.building.id) {
      navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
    } else {
      navigate(`/review/${entry.id}`);
    }
  };

  const username = entry.user?.username || "Unknown User";
  const avatarUrl = entry.user?.avatar_url || undefined;
  const userInitial = username.charAt(0).toUpperCase();
  const mainTitle = entry.building.name;
  const actionText = entry.status === "pending" ? "saved" : "visited";

  return (
    <div
      onClick={handleCardClick}
      className="w-full cursor-pointer pb-6 border-b border-border-default"
    >
      {/* Category label */}
      <span className="text-2xs font-medium tracking-widest uppercase text-text-secondary">
        {actionText}
      </span>

      {/* Building name — editorial scale */}
      <h3 className="text-2xl font-semibold tracking-tight leading-tight text-text-primary mt-1">
        {mainTitle}
      </h3>

      {/* Rating */}
      {entry.rating && entry.rating > 0 && (
        <div className="flex items-center gap-0.5 mt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Circle
              key={i}
              className={cn(
                "w-3 h-3",
                i < entry.rating!
                  ? "fill-text-primary text-text-primary"
                  : "fill-transparent text-text-disabled"
              )}
            />
          ))}
        </div>
      )}

      {/* Review excerpt */}
      {entry.content && (
        <p className="text-sm leading-relaxed text-text-secondary mt-2 line-clamp-2">
          {entry.content}
        </p>
      )}

      {/* Attribution */}
      <div className="flex items-center gap-2 mt-3">
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-[8px]">{userInitial}</AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium text-text-primary">{username}</span>
        <span className="text-xs text-text-disabled">
          {formatDistanceToNow(new Date(entry.edited_at || entry.created_at)).replace("about ", "")} ago
        </span>
      </div>
    </div>
  );
}
