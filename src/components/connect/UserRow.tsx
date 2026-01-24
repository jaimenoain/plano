import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/FollowButton";
import { supabase } from "@/integrations/supabase/client";

interface UserRowProps {
  user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
  showFollowButton?: boolean;
  isFollower?: boolean; // Is the user following me? (For "Follow Back" logic)
}

export function UserRow({ user, showFollowButton = false, isFollower = false }: UserRowProps) {
  const navigate = useNavigate();

  const avatarUrl = user.avatar_url
    ? (user.avatar_url.startsWith("http")
        ? user.avatar_url
        : supabase.storage.from("avatars").getPublicUrl(user.avatar_url).data.publicUrl)
    : undefined;

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border/50"
      onClick={() => navigate(`/profile/${user.username?.toLowerCase() || user.id}`)}
    >
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{user.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-medium text-sm">{user.username || "Unknown User"}</span>
        </div>
      </div>

      {showFollowButton && (
        <div onClick={(e) => e.stopPropagation()}>
          <FollowButton
            userId={user.id}
            isFollower={isFollower}
            className="h-8 text-xs px-3"
          />
        </div>
      )}
    </div>
  );
}
