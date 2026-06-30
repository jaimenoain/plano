import { useNavigate } from "react-router";
import { Star, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/features/profile/components/FollowButton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
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
  /**
   * `stacked` — identity block uses full width; actions on a second row (narrow sidebars, e.g. feed PYMK rail).
   * `default` — single horizontal row with trailing actions.
   */
  layout?: "default" | "stacked";
}

export function UserRow({
  user,
  showFollowButton = false,
  isFollower = false,
  isCloseFriend,
  onToggleCloseFriend,
  onHide,
  mutualFollows,
  layout = "default",
}: UserRowProps) {
  const navigate = useNavigate();

  const avatarUrl = user.avatar_url
    ? (user.avatar_url.startsWith("http")
        ? user.avatar_url
        : supabase.storage.from("avatars").getPublicUrl(user.avatar_url).data.publicUrl)
    : undefined;

  const displayName = user.username || "Unknown User";

  const actions = (
    <div
      className={cn(
        "flex shrink-0 items-center",
        layout === "stacked" ? "gap-2" : "gap-3",
      )}
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
          type="button"
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
            className={layout === "stacked" ? "h-8 text-2xs px-2.5" : "h-8 text-xs px-3"}
          />
        </div>
      )}
    </div>
  );

  const identityBlock = (
    <div
      className={cn(
        "flex min-w-0 flex-1 gap-3",
        layout === "stacked" ? "items-start" : "items-center",
      )}
    >
      <Avatar className={cn(layout === "stacked" && "mt-0.5")}>
        <AvatarImage src={avatarUrl} />
        <AvatarFallback>{user.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <span
          className={cn(
            "block font-medium text-sm text-text-primary leading-snug",
            layout === "stacked" ? "break-words line-clamp-2" : "truncate",
          )}
          title={displayName}
        >
          {displayName}
        </span>
        {mutualFollows && mutualFollows.length > 0 ? (
          <MutualFacepile users={mutualFollows} />
        ) : null}
      </div>
    </div>
  );

  if (layout === "stacked") {
    return (
      <div
        className="group relative flex flex-col gap-3 border-b border-border-default p-4 transition-colors hover:bg-brand-secondary cursor-pointer"
        onClick={() => navigate(`/profile/${user.username?.toLowerCase() || user.id}`)}
      >
        {onHide && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onHide();
            }}
            className="absolute right-2 top-2 rounded-sm p-1 text-text-disabled opacity-0 transition-opacity hover:bg-surface-muted group-hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-border-strong"
            title="Hide suggestion"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}

        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0 border border-border-default">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback>{user.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 pr-5">
            <span
              className="block text-sm font-semibold text-text-primary line-clamp-2"
              title={displayName}
            >
              {displayName}
            </span>
            {mutualFollows && mutualFollows.length > 0 ? (
              <MutualFacepile users={mutualFollows} />
            ) : null}
          </div>
        </div>

        {showFollowButton && (
          <FollowButton
            userId={user.id}
            isFollower={isFollower}
            variant="primary"
            className="w-full h-9 text-2xs"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 items-center justify-between gap-3 p-4 border-b border-border-default hover:bg-brand-secondary transition-colors cursor-pointer relative group"
      onClick={() => navigate(`/profile/${user.username?.toLowerCase() || user.id}`)}
    >
      {identityBlock}
      {actions}
    </div>
  );
}
