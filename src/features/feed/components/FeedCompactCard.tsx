import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { FeedReview } from "@/types/feed";
import { getBuildingUrl } from "@/utils/url";
import { Circle } from "lucide-react";

interface FeedCompactCardProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
}

export function FeedCompactCard({
  entry,
  onLike: _onLike,
  onComment: _onComment
}: FeedCompactCardProps) {
  const navigate = useNavigate();

  if (!entry.building) return null;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

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

  // Passive Action -> saved
  const actionText = entry.status === 'pending' ? 'saved' : 'visited';

  return (
    <div
      onClick={handleCardClick}
      className="w-full max-w-full min-w-0 cursor-pointer bg-surface-card border border-border-default rounded-sm shadow-none hover:border-border-strong transition-colors"
    >
      <div className="flex items-start gap-3 p-4">
        <Avatar className="h-6 w-6 border border-border-default/50 shrink-0 mt-0.5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-[10px]">{userInitial}</AvatarFallback>
        </Avatar>

        <div className="text-sm text-text-primary flex-1 min-w-0 break-words leading-tight">
          <span className="font-semibold">{username}</span>
          <span className="text-text-secondary/80 font-normal"> {actionText} </span>
          <span className="font-semibold">{mainTitle}</span>

          {entry.rating && entry.rating > 0 && (
            <span className="inline-flex items-center gap-0.5 ml-2 align-middle">
              {Array.from({ length: 3 }).map((_, i) => (
                <Circle
                  key={i}
                  className={`w-2.5 h-2.5 ${
                    i < entry.rating!
                      ? "fill-brand-primary text-brand-primary"
                      : "fill-transparent text-text-secondary/30"
                  }`}
                />
              ))}
            </span>
          )}

          <span className="text-text-secondary text-xs ml-2">
            {!(entry.rating && entry.rating > 0) && "• "}
            {formatDistanceToNow(new Date(entry.edited_at || entry.created_at)).replace("about ", "")} ago
          </span>
        </div>
      </div>
    </div>
  );
}
