import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Loader2 } from "lucide-react";

interface UserSearchProps {
  onSelect: (userId: string, username: string) => void;
  excludeIds?: string[];
}

export function UserSearch({ onSelect, excludeIds = [] }: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${query}%`)
        .not("id", "in", `(${excludeIds.join(",") || "00000000-0000-0000-0000-000000000000"})`)
        .limit(5);

      if (!error && data) {
        setResults(data);
      }
      setLoading(false);
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [query, excludeIds]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Type a username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
        {loading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
          {results.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors"
              onClick={() => {
                onSelect(u.id, u.username);
                setQuery("");
                setResults([]);
              }}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={u.avatar_url} />
                <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{u.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
