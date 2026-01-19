import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface UserPickerProps {
  selectedIds: string[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  className?: string;
  modal?: boolean;
}

export function UserPicker({ selectedIds, onSelect, onRemove, className, modal }: UserPickerProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function fetchFollowing() {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch users I follow
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const ids = follows?.map(f => f.following_id) || [];

        if (ids.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", ids);

          setUsers((profiles as any[]) || []);
        }
      } catch (error) {
        console.error("Error fetching users", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFollowing();
  }, [user]);

  // Filter users based on query
  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(query.toLowerCase())
  );

  const selectedUsers = users.filter(u => selectedIds.includes(u.id));

  return (
    <div className={cn("space-y-3", className)}>
        {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
                {selectedUsers.map(u => (
                    <Badge key={u.id} variant="secondary" className="pl-1 pr-3 py-1.5 gap-2 rounded-full text-sm">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{u.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>{u.username}</span>
                        <X
                            className="h-4 w-4 cursor-pointer hover:text-destructive transition-colors"
                            onClick={() => onRemove(u.id)}
                        />
                    </Badge>
                ))}
            </div>
        )}

      <Popover open={open} onOpenChange={setOpen} modal={modal}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-secondary/20 border-input text-muted-foreground hover:text-foreground"
          >
            {selectedIds.length > 0 ? "Add more people..." : "Select friends..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
                placeholder="Search friends..."
                value={query}
                onValueChange={setQuery}
                autoFocus={false}
            />
            <CommandList>
                {loading ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
                ) : filteredUsers.length === 0 ? (
                    <CommandEmpty>No friends found.</CommandEmpty>
                ) : (
                    <CommandGroup>
                        {filteredUsers.map((u) => (
                        <CommandItem
                            key={u.id}
                            value={u.username}
                            onSelect={() => {
                                if (selectedIds.includes(u.id)) {
                                    onRemove(u.id);
                                } else {
                                    onSelect(u.id);
                                }
                                setOpen(false);
                            }}
                        >
                            <Check
                            className={cn(
                                "mr-2 h-4 w-4",
                                selectedIds.includes(u.id) ? "opacity-100" : "opacity-0"
                            )}
                            />
                            <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={u.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px]">{u.username.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{u.username}</span>
                            </div>
                        </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
