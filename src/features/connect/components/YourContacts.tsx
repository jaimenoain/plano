import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserRow } from "./UserRow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users } from "lucide-react";

interface ContactUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_close_friend?: boolean;
}

export function YourContacts() {
  const { user } = useAuth();
  const [following, setFollowing] = useState<ContactUser[]>([]);
  const [followers, setFollowers] = useState<ContactUser[]>([]);
  const [loading, setLoading] = useState(true);

  const sortContacts = (contacts: ContactUser[]) => {
    return [...contacts].sort((a, b) => {
      if (a.is_close_friend === b.is_close_friend) {
        return (a.username || "").localeCompare(b.username || "");
      }
      return a.is_close_friend ? -1 : 1;
    });
  };

  const toggleCloseFriend = async (targetId: string, currentStatus: boolean) => {
    if (!user) return;

    // Optimistic update
    setFollowing((prev) => {
      const updated = prev.map((u) =>
        u.id === targetId ? { ...u, is_close_friend: !currentStatus } : u
      );
      return sortContacts(updated);
    });

    try {
      const { error } = await supabase
        .from("follows")
        .update({ is_close_friend: !currentStatus } as any)
        .eq("follower_id", user.id)
        .eq("following_id", targetId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating close friend status:", error);
      // Revert on error
      setFollowing((prev) => {
        const updated = prev.map((u) =>
          u.id === targetId ? { ...u, is_close_friend: currentStatus } : u
        );
        return sortContacts(updated);
      });
    }
  };

  useEffect(() => {
    const fetchContacts = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch Following
        const { data: followingRefs } = await supabase
          .from("follows")
          .select("following_id, is_close_friend")
          .eq("follower_id", user.id);

        // Cast to any because is_close_friend is not yet in the types
        const refs = followingRefs as any[];
        const followingMap = new Map<string, boolean>();
        refs?.forEach((r) => {
          followingMap.set(r.following_id, r.is_close_friend);
        });

        const followingIds = refs?.map((r) => r.following_id) || [];

        if (followingIds.length > 0) {
          const { data: followingProfiles } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", followingIds);

          const mergedFollowing =
            followingProfiles?.map((p) => ({
              ...p,
              is_close_friend: followingMap.get(p.id) || false,
            })) || [];

          setFollowing(sortContacts(mergedFollowing));
        } else {
          setFollowing([]);
        }

        // Fetch Followers
        const { data: followerRefs } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", user.id);

        const followerIds = followerRefs?.map(r => r.follower_id) || [];

        if (followerIds.length > 0) {
             const { data: followerProfiles } = await supabase
                .from("profiles")
                .select("id, username, avatar_url")
                .in("id", followerIds);
             setFollowers(followerProfiles || []);
        } else {
            setFollowers([]);
        }

      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [user]);

  if (loading) {
     return <div className="h-40 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
         <Users className="h-5 w-5 text-primary" />
         Your Contacts
      </h2>

      <Tabs defaultValue="following" className="w-full">
        <TabsList className="w-full max-w-[400px]">
          <TabsTrigger value="following" className="flex-1">Following ({following.length})</TabsTrigger>
          <TabsTrigger value="followers" className="flex-1">Followers ({followers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="following" className="mt-4">
           <div className="bg-card border rounded-xl overflow-hidden">
               <ScrollArea className="h-[300px] sm:h-[400px]">
                   <div className="p-2 space-y-1">
                       {following.length > 0 ? following.map(u => (
                           <UserRow
                             key={u.id}
                             user={u}
                             showFollowButton={false}
                             isCloseFriend={u.is_close_friend}
                             onToggleCloseFriend={() => toggleCloseFriend(u.id, !!u.is_close_friend)}
                           />
                       )) : (
                           <div className="p-8 text-center text-muted-foreground">You are not following anyone yet.</div>
                       )}
                   </div>
               </ScrollArea>
           </div>
        </TabsContent>

        <TabsContent value="followers" className="mt-4">
            <div className="bg-card border rounded-xl overflow-hidden">
               <ScrollArea className="h-[300px] sm:h-[400px]">
                   <div className="p-2 space-y-1">
                       {followers.length > 0 ? followers.map(u => (
                           <UserRow
                               key={u.id}
                               user={u}
                               showFollowButton={true}
                               isFollower={true} // Since they are in followers list, isFollower is true.
                           />
                       )) : (
                           <div className="p-8 text-center text-muted-foreground">No followers yet.</div>
                       )}
                   </div>
               </ScrollArea>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
