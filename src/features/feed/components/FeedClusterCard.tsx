import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router";
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
  location: _location,
  timestamp: _timestamp,
}: FeedClusterCardProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (user.username) {
      navigate(`/profile/${user.username}`);
    }
  };

  const username = user.username || "Unknown User";
  const userInitial = username.charAt(0).toUpperCase();
  const avatarUrl = user.avatar_url || undefined;
  const visible = entries.slice(0, 3);
  const overflow = entries.length - 3;

  return (
    <div
      onClick={handleClick}
      className="w-full cursor-pointer pb-6 border-b border-border-default"
    >
      {/* Category label */}
      <span className="text-2xs font-medium tracking-widest uppercase text-text-secondary">
        Activity
      </span>

      {/* User attribution */}
      <div className="flex items-center gap-2.5 mt-2">
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-[10px]">{userInitial}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-text-primary">{username}</span>
      </div>

      {/* Activity list */}
      <div className="mt-3 space-y-2">
        {visible.map((entry) => (
          <div key={entry.id} className="flex items-baseline gap-2">
            <span className="text-xs text-text-disabled">
              {entry.status === "pending" ? "saved" : "visited"}
            </span>
            <span className="text-lg font-semibold text-text-primary leading-tight">
              {entry.building.name}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <span className="text-xs text-text-secondary">
            and {overflow} more
          </span>
        )}
      </div>
    </div>
  );
}
