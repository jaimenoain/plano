import { useNavigate } from "react-router";
import { Star, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/features/profile/components/FollowButton";
import { supabase } from "@/integrations/supabase/client";
import { MutualFacepile } from "./MutualFacepile";

interface UserRowProps {
  user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
  showFollowButton?: boolean;
  isFollower?: boolean; // Is the user following me? (For "Follow Back" logic)
  isCloseFriend?: boolean;
  onToggleCloseFriend?: () => void;
  onHide?: () => void;
  mutualFollows?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  }[];
}

export function UserRow({
  user,
  showFollowButton = false,
  isFollower = false,
  isCloseFriend,
  onToggleCloseFriend,
  onHide,
  mutualFollows
}: UserRowProps) {
  const navigate = useNavigate();

  const avatarUrl = user.avatar_url
    ? (user.avatar_url.startsWith("http")
        ? user.avatar_url
        : supabase.storage.from("avatars").getPublicUrl(user.avatar_url).data.publicUrl)
    : undefined;

  const displayName = user.username || "Unknown User";

  return (
    <div
      className="flex min-w-0 items-center justify-between gap-3 p-4 border-b border-border-default hover:bg-brand-secondary transition-colors cursor-pointer relative group"
      onClick={() => navigate(`/profile/${user.username?.toLowerCase() || user.id}`)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar>
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{user.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden">
          <span className="block truncate font-medium text-sm" title={displayName}>
            {displayName}
          </span>
          {mutualFollows && mutualFollows.length > 0 ? (
            <MutualFacepile users={mutualFollows} />
          ) : null}
        </div>
      </div>

      <div
        className="flex shrink-0 items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {onHide && (
          <button
            type="button"
            onClick={onHide}
            className="-m-1 shrink-0 rounded-sm p-2 hover:bg-surface-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong text-text-secondary hover:text-text-primary"
            title="Hide suggestion"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}

        {onToggleCloseFriend && (
          <button
            onClick={onToggleCloseFriend}
            className="p-1 hover:bg-surface-muted rounded-sm transition-colors focus:outline-none"
            title={isCloseFriend ? "Remove from close friends" : "Add to close friends"}
          >
            <Star
              className={`h-5 w-5 ${
                isCloseFriend ? "fill-feedback-warning text-feedback-warning" : "text-text-secondary"
              }`}
            />
          </button>
        )}

        {showFollowButton && (
          <div className="shrink-0">
            <FollowButton
              userId={user.id}
              isFollower={isFollower}
              className="h-8 text-xs px-3"
            />
          </div>
        )}
      </div>
    </div>
  );
}
