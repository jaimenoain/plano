import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface MutualUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface MutualFacepileProps {
  users: MutualUser[];
  className?: string;
}

export function MutualFacepile({ users, className }: MutualFacepileProps) {
  if (!users || users.length === 0) return null;

  const maxAvatars = 3;
  const displayUsers = users.slice(0, maxAvatars);

  // Text Logic
  const names = users.map(u => u.username || "Unknown").filter(Boolean);
  let text = "";

  if (users.length === 1) {
    text = `followed by ${names[0]}`;
  } else if (users.length === 2) {
    text = `${names[0]}, ${names[1]}`;
  } else {
    const othersCount = users.length - 2;
    text = `${names[0]}, ${names[1]} +${othersCount}`;
  }

  return (
    <div className={`flex items-center gap-2 mt-1 ${className || ""}`}>
      <div className="flex -space-x-2">
        {displayUsers.map((user) => {
             const avatarUrl = user.avatar_url
            ? (user.avatar_url.startsWith("http")
                ? user.avatar_url
                : supabase.storage.from("avatars").getPublicUrl(user.avatar_url).data.publicUrl)
            : undefined;

            return (
              <Avatar key={user.id} className="h-5 w-5 border-2 border-background">
                <AvatarImage src={avatarUrl || ""} alt={user.username || "User"} />
                <AvatarFallback className="text-[8px]">
                  {(user.username?.[0] || "?").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            );
        })}
      </div>
      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
        {text}
      </span>
    </div>
  );
}
