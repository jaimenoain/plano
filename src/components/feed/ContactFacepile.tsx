import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContactInteraction } from "@/features/search/components/types";
import { useMemo } from "react";

interface ContactFacepileProps {
  interactions: ContactInteraction[];
  className?: string;
}

export function ContactFacepile({ interactions, className }: ContactFacepileProps) {
  const uniqueUsers = useMemo(() => {
    const seen = new Set<string>();
    const users: ContactInteraction['user'][] = [];

    interactions.forEach(interaction => {
      if (!seen.has(interaction.user.id)) {
        seen.add(interaction.user.id);
        users.push(interaction.user);
      }
    });
    return users;
  }, [interactions]);

  if (uniqueUsers.length === 0) return null;

  const maxAvatars = 3;
  const displayUsers = uniqueUsers.slice(0, maxAvatars);

  // Text Logic
  const names = uniqueUsers.map(u => u.first_name || u.username || "Unknown").filter(Boolean);
  let text = "";

  if (uniqueUsers.length === 1) {
    text = `${names[0]}`;
  } else if (uniqueUsers.length === 2) {
    text = `${names[0]}, ${names[1]}`;
  } else {
    const othersCount = uniqueUsers.length - 2;
    text = `${names[0]}, ${names[1]} +${othersCount}`;
  }

  return (
    <div className={`flex items-center gap-2 mb-2 min-w-0 ${className || ""}`}>
      <div className="flex -space-x-2 shrink-0">
        {displayUsers.map((user) => (
          <Avatar key={user.id} className="h-6 w-6 border-2 border-black">
            <AvatarImage src={user.avatar_url || ""} alt={user.username || "User"} />
            <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">
              {(user.first_name?.[0] || user.username?.[0] || "?").toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span className="text-xs text-white/90 font-medium drop-shadow-md truncate">
        {text}
      </span>
    </div>
  );
}
