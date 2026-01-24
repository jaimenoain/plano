import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserRow } from "./UserRow";
import { UserPlus } from "lucide-react";

interface SuggestionUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export function PeopleYouMayKnow() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // 1. Get IDs I follow
        const { data: followingData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingIds = new Set(followingData?.map(f => f.following_id) || []);
        followingIds.add(user.id); // Exclude myself

        // 2. Fetch profiles
        // We fetch a batch and filter client-side to find non-followed users.
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .limit(30);

        if (profiles) {
            const filtered = profiles
                .filter(p => !followingIds.has(p.id))
                .slice(0, 3);
            setSuggestions(filtered);
        }

      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user]);

  if (loading) {
    return (
        <div className="space-y-4">
             <div className="h-6 w-40 bg-muted animate-pulse rounded" />
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
                ))}
             </div>
        </div>
    )
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
         <UserPlus className="h-5 w-5 text-primary" />
         People You May Know
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suggestions.map(u => (
            <div key={u.id} className="bg-card border rounded-lg shadow-sm overflow-hidden">
                 <UserRow user={u} showFollowButton={true} />
            </div>
        ))}
      </div>
    </div>
  );
}
