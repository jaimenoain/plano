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
  const uniqueBuildings = Array.from(new Map(entries.map(e => [e.building.id, e.building.name])).values());
  const uniqueCount = uniqueBuildings.length;
  const action = entries[0].status || 'saved';

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 py-1.5 px-2 w-full group cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
    >
      <Avatar className="h-6 w-6 border border-border/50">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="text-[10px]">{userInitial}</AvatarFallback>
      </Avatar>

      <div className="text-sm text-foreground/90 flex-1 truncate leading-none min-w-0">
        <span className="font-semibold">{username}</span>
        <span className="text-muted-foreground"> {action} </span>
        {uniqueCount > 2 ? (
          <>
            <span className="font-semibold">{uniqueBuildings[0]}</span>
            <span className="text-muted-foreground">, </span>
            <span className="font-semibold">{uniqueBuildings[1]}</span>
            <span className="text-muted-foreground"> and </span>
            <span className="font-semibold">{uniqueCount - 2} more</span>
          </>
        ) : uniqueCount === 2 ? (
          <>
            <span className="font-semibold">{uniqueBuildings[0]}</span>
            <span className="text-muted-foreground"> and </span>
            <span className="font-semibold">{uniqueBuildings[1]}</span>
          </>
        ) : (
          <span className="font-semibold">{uniqueBuildings[0]}</span>
        )}
        <span className="text-muted-foreground text-xs ml-2">
          • {formatDistanceToNow(new Date(timestamp)).replace("about ", "")} ago
        </span>
      </div>
    </div>
  );
}
