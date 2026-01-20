import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search as SearchIcon, 
  Users, 
  Copy,
  Loader2
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_following: boolean;
}

export default function Search() {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Redirect if not auth
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Search Logic
  useEffect(() => {
    const debounce = setTimeout(() => {
        if (query.trim().length >= 2) searchUsers();
        else setUsers([]);
    }, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  const searchUsers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio")
        .ilike("username", `%${query}%`)
        .neq("id", user.id)
        .limit(20);

      if (error) throw error;

      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingIds = new Set(follows?.map((f) => f.following_id) || []);
      const usersWithFollowStatus = (profiles || []).map((profile) => ({
        ...profile,
        is_following: followingIds.has(profile.id),
      }));
      setUsers(usersWithFollowStatus);
    } catch (error) {
      console.error("User search error:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!user) return;
    const updateState = (prev: UserProfile[]) => prev.map((u) => u.id === userId ? { ...u, is_following: !isFollowing } : u);
    setUsers(updateState);
    
    try {
      if (isFollowing) await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      else await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
    } catch (error) {
      // Revert on error
      setUsers(prev => prev.map((u) => u.id === userId ? { ...u, is_following: isFollowing } : u));
    }
  };

  return (
    <AppLayout title="Find" showLogo={false}>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Search Bar */}
        <div className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 text-lg bg-secondary/50 border-border focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Results Area */}
        <div className="space-y-6">
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : users.length > 0 ? (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {users.map(profile => (
                   <div key={profile.id} className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate(`/profile/${profile.username?.toLowerCase()}`)}>
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>{profile.username?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{profile.username}</p>
                        {profile.bio && <p className="text-sm text-muted-foreground truncate">{profile.bio}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant={profile.is_following ? "secondary" : "default"}
                        onClick={(e) => { e.stopPropagation(); handleFollow(profile.id, profile.is_following); }}
                      >
                        {profile.is_following ? "Following" : "Follow"}
                      </Button>
                   </div>
                 ))}
               </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-300">
                    <div className="bg-secondary/50 p-4 rounded-full mb-4">
                        <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                        {query.trim().length < 2 ? "Find Friends" : "No users found"}
                    </h3>
                    <p className="text-muted-foreground max-w-[250px] mb-6">
                        {query.trim().length < 2
                            ? "Search for your friends by name or username."
                            : "We couldn't find anyone with that name. Why not invite them to join?"}
                    </p>
                    {profile?.username && (
                        <Button
                            onClick={() => {
                                navigator.clipboard.writeText(`Join me on Cineforum! https://cineforum.eu/?invited_by=${profile.username}`)
                                    .then(() => {
                                        toast({
                                            title: "Link copied!",
                                            description: "Invite link copied to clipboard.",
                                        });
                                    })
                                    .catch(() => {
                                        toast({
                                            title: "Failed to copy",
                                            description: "Please try manually copying the link.",
                                            variant: "destructive",
                                        });
                                    });
                            }}
                            className="gap-2 min-w-[200px]"
                        >
                            <Copy className="h-4 w-4" />
                            Copy Invite Link
                        </Button>
                    )}
                </div>
            )}
        </div>
      </div>
    </AppLayout>
  );
}
