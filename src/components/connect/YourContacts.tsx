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
}

export function YourContacts() {
  const { user } = useAuth();
  const [following, setFollowing] = useState<ContactUser[]>([]);
  const [followers, setFollowers] = useState<ContactUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch Following
        const { data: followingRefs } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingIds = followingRefs?.map(r => r.following_id) || [];

        if (followingIds.length > 0) {
             const { data: followingProfiles } = await supabase
                .from("profiles")
                .select("id, username, avatar_url")
                .in("id", followingIds);
             setFollowing(followingProfiles || []);
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
                           <UserRow key={u.id} user={u} showFollowButton={false} />
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
