import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { FeedReview } from "@/types/feed";

interface FeedClusterCardProps {
  entries: FeedReview[];
  user: {
    username: string | null;
    avatar_url: string | null;
  };
  location?: string;
  timestamp: string | Date;
}

export function FeedClusterCard({
  entries,
  user,
  location,
  timestamp
}: FeedClusterCardProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    // Avoid triggering if clicking an interactive element (though none exist here yet)
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    if (user.username) {
        navigate(`/profile/${user.username}`);
    }
  };

  const username = user.username || "Unknown User";
  const userInitial = username.charAt(0).toUpperCase();
  const avatarUrl = user.avatar_url || undefined;

  // We rely on the input entries for the count, but we could deduplicate building ids.
  const uniqueBuildingIds = new Set(entries.map(e => e.building.id));
  const uniqueCount = uniqueBuildingIds.size;

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 py-1.5 px-2 w-full group cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
    >
      <Avatar className="h-6 w-6 border border-border/50">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="text-[10px]">{userInitial}</AvatarFallback>
      </Avatar>

      <div className="text-sm text-foreground/90 flex-1 truncate leading-none">
        <span className="font-semibold">{username}</span>
        <span className="text-muted-foreground"> saved </span>
        <span className="font-semibold">{uniqueCount} buildings</span>
        {location && (
            <>
                <span className="text-muted-foreground"> in </span>
                <span className="font-semibold">{location}</span>
            </>
        )}
        <span className="text-muted-foreground text-xs ml-2">
          • {formatDistanceToNow(new Date(timestamp)).replace("about ", "")} ago
        </span>
      </div>
    </div>
  );
}
