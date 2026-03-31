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
  location: _location,
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

  return (
    <div
      onClick={handleClick}
      className="w-full max-w-full min-w-0 cursor-pointer bg-surface-card border border-border-default rounded-sm shadow-none hover:border-border-strong transition-colors"
    >
      <div className="flex items-start gap-3 p-4">
        <Avatar className="h-6 w-6 border border-border-default/50 shrink-0 mt-0.5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-[10px]">{userInitial}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm text-text-primary font-semibold truncate">
                {username}
              </div>
              <div className="text-xs text-text-secondary">
                {formatDistanceToNow(new Date(timestamp)).replace("about ", "")} ago
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 text-sm text-text-secondary">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-1.5">
                <span className="mt-[2px] text-xs text-text-secondary">•</span>
                <span className="min-w-0">
                  <span className="text-text-secondary">
                    {entry.status === "pending" ? "pending" : "visited"}{" "}
                  </span>
                  <span className="font-semibold text-text-primary">
                    {entry.building.name}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
