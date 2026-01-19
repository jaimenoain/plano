import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_following: boolean;
  mutuals_count?: number;
}

export const FriendSelectFilter = ({
  users,
  selectedIds,
  onSelect,
  mode,
  setMode
}: {
  users: UserProfile[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  mode: "any" | "all";
  setMode: (m: "any" | "all") => void;
}) => {
  return (
        <Command className="border rounded-md">
          <CommandInput placeholder="Search friend..." autoFocus={false} />
          <CommandList className="max-h-[200px] overflow-y-auto">
            <CommandEmpty>No friends found.</CommandEmpty>
            <div className="flex items-center p-2 gap-2 border-b">
               <span className="text-xs text-muted-foreground">Match:</span>
               <div className="flex bg-secondary rounded-md p-0.5">
                  <button
                    onClick={(e) => { e.preventDefault(); setMode("any"); }}
                    className={cn("px-2 py-0.5 text-xs rounded-sm transition-colors", mode==="any" ? "bg-background shadow-sm" : "text-muted-foreground")}
                  >
                    Any
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setMode("all"); }}
                    className={cn("px-2 py-0.5 text-xs rounded-sm transition-colors", mode==="all" ? "bg-background shadow-sm" : "text-muted-foreground")}
                  >
                    All
                  </button>
               </div>
            </div>
            <CommandGroup>
              {users.map((friend) => {
                const isSelected = selectedIds.includes(friend.username || "");
                return (
                  <CommandItem
                    key={friend.id}
                    onSelect={() => onSelect(friend.username || "")}
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                    )}>
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{friend.username?.slice(0,1)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{friend.username}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
  );
};
