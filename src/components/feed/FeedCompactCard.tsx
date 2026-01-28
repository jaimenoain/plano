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
  onLike, // kept for prop compatibility, though unused in view
  onComment // kept for prop compatibility
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
      className="flex items-center gap-3 py-1.5 px-2 w-full group cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
    >
      <Avatar className="h-6 w-6 border border-border/50">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="text-[10px]">{userInitial}</AvatarFallback>
      </Avatar>

      <div className="text-sm text-foreground/90 flex-1 truncate leading-none">
        <span className="font-semibold">{username}</span>
        <span className="text-muted-foreground"> {actionText} </span>
        <span className="font-semibold">{mainTitle}</span>

        {entry.rating && entry.rating > 0 && (
          <span className="inline-flex items-center gap-0.5 ml-2 align-middle">
            {Array.from({ length: 5 }).map((_, i) => (
              <Circle
                key={i}
                className={`w-2.5 h-2.5 ${i < entry.rating! ? "fill-[#595959] text-[#595959]" : "fill-transparent text-muted-foreground/30"}`}
              />
            ))}
          </span>
        )}

        <span className="text-muted-foreground text-xs ml-2">
          {!(entry.rating && entry.rating > 0) && "• "}{formatDistanceToNow(new Date(entry.edited_at || entry.created_at)).replace("about ", "")} ago
        </span>
      </div>
    </div>
  );
}
