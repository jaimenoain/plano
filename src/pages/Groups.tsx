import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Users, Clapperboard, Popcorn } from "lucide-react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const getPosterUrl = (path: string | null) => 
  path ? `https://image.tmdb.org/t/p/w400${path}` : "/placeholder.svg";

interface Group {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_public: boolean;
  member_count: number;
  recent_posters: string[];
  member_avatars: string[];
  next_session_date?: string;
  last_session_date?: string;
  cover_url?: string | null;
}

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupType, setGroupType] = useState<"club" | "casual">("club");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  // Legacy transformation logic for fallback
  const transformGroupData = (groupData: any): Group | null => {
    if (!groupData) return null;

    const members = groupData.group_members || [];
    const memberCount = members.length;
    
    const avatars = members
      .map((m: any) => m.profiles?.avatar_url)
      .filter(Boolean)
      .slice(0, 3);

    const sessions = (groupData.group_sessions || []).sort((a: any, b: any) => 
      new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
    );

    const now = new Date();
    const upcoming = sessions.filter((s: any) => new Date(s.session_date) >= now);
    const past = sessions.filter((s: any) => new Date(s.session_date) < now);

    const nextSession = upcoming.length > 0 ? upcoming[upcoming.length - 1] : undefined;
    const lastSession = past.length > 0 ? past[0] : undefined;

    const uniquePosters = Array.from(
      new Set(
        sessions.flatMap((s: any) => 
          (s.session_films || []).map((sf: any) => sf.films?.poster_path)
        )
      )
    ).filter(Boolean).slice(0, 4) as string[];

    return {
      id: groupData.id,
      slug: groupData.slug,
      name: groupData.name,
      description: groupData.description,
      is_public: groupData.is_public ?? false,
      member_count: memberCount,
      recent_posters: uniquePosters,
      member_avatars: avatars,
      next_session_date: nextSession?.session_date,
      last_session_date: lastSession?.session_date,
      cover_url: groupData.cover_url,
    };
  };

  const fetchGroupsLegacy = async () => {
     // Original logic...
     const selectQuery = `
        *,
        group_members (
          profiles ( avatar_url )
        ),
        group_sessions (
          session_date,
          session_films (
            films ( poster_path )
          )
        )
      `;

      // 1. Get IDs of groups I belong to
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user!.id)
        .eq('status', 'active');
      
      if (memberError) throw memberError;

      const myGroupIds = memberData.map(m => m.group_id);

      // 2. Fetch My Groups Details
      let myGroupsList: Group[] = [];
      if (myGroupIds.length > 0) {
        const { data: myGroupsData, error: myGroupsError } = await supabase
          .from('groups')
          .select(selectQuery)
          .in('id', myGroupIds)
          .order('session_date', { foreignTable: 'group_sessions', ascending: false });

        if (myGroupsError) throw myGroupsError;

        myGroupsList = (myGroupsData || [])
          .map(transformGroupData)
          .filter((g): g is Group => g !== null);
      }

      return { myGroupsList, myGroupIds };
  };

  const fetchPublicGroupsLegacy = async (myGroupIds: string[]) => {
      const selectQuery = `
        *,
        group_members (
          profiles ( avatar_url )
        ),
        group_sessions (
          session_date,
          session_films (
            films ( poster_path )
          )
        )
      `;
      let publicQuery = supabase
        .from('groups')
        .select(selectQuery)
        .eq('is_public', true)
        .order('session_date', { foreignTable: 'group_sessions', ascending: false })
        .limit(5, { foreignTable: 'group_sessions' });
      
      if (myGroupIds.length > 0) {
        publicQuery = publicQuery.not('id', 'in', `(${myGroupIds.join(',')})`);
      }
      
      const { data: publicData, error: publicGroupsError } = await publicQuery;
      if (publicGroupsError) throw publicGroupsError;

      return (publicData || [])
        .map(transformGroupData)
        .filter((g): g is Group => g !== null);
  };

  const sortGroups = (list: Group[]) => {
      return list.sort((a, b) => {
         const aHasUpcoming = !!a.next_session_date;
         const bHasUpcoming = !!b.next_session_date;

         if (aHasUpcoming && !bHasUpcoming) return -1;
         if (!aHasUpcoming && bHasUpcoming) return 1;

         if (aHasUpcoming && bHasUpcoming) {
           const dateA = new Date(a.next_session_date!).getTime();
           const dateB = new Date(b.next_session_date!).getTime();
           return dateA - dateB;
         } else {
           const dateA = a.last_session_date ? new Date(a.last_session_date).getTime() : 0;
           const dateB = b.last_session_date ? new Date(b.last_session_date).getTime() : 0;
           return dateB - dateA;
         }
      });
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      // Optimized: Use RPC to fetch group summaries in a single query
      try {
        // Explicitly passing all parameters to avoid ambiguous 400 errors from PostgREST
        // when defaults are involved or signatures mismatch slightly.
        const { data: myGroupsData, error: myRpcError } = await supabase
          .rpc('get_user_groups_summary', {
            p_user_id: user!.id,
            p_type: 'my',
            p_limit: 50
          });

        if (myRpcError) {
          console.error("My Groups RPC Error:", myRpcError);
          throw myRpcError;
        }

        const mapRpcGroup = (g: any): Group => ({
          id: g.id,
          slug: g.slug,
          name: g.name,
          description: g.description,
          is_public: g.is_public,
          member_count: Number(g.member_count),
          recent_posters: g.recent_posters || [],
          member_avatars: g.member_avatars || [],
          next_session_date: g.next_session_date,
          last_session_date: g.last_session_date,
          cover_url: g.cover_url,
        });

        const myGroupsList = sortGroups((myGroupsData || []).map(mapRpcGroup));
        setMyGroups(myGroupsList);

        const { data: publicData, error: publicRpcError } = await supabase
          .rpc('get_user_groups_summary', {
            p_user_id: user!.id,
            p_type: 'public',
            p_limit: 10
          });

        if (publicRpcError) {
          console.error("Public Groups RPC Error:", publicRpcError);
          throw publicRpcError;
        }

        const publicGroupsList = (publicData || []).map(mapRpcGroup);
        setPublicGroups(publicGroupsList);

      } catch (rpcError: any) {
        // Fallback to legacy method if RPC fails (e.g. migration not applied)
        console.warn("RPC fetch failed, falling back to legacy method. Details:", rpcError);

        const { myGroupsList, myGroupIds } = await fetchGroupsLegacy();
        setMyGroups(sortGroups(myGroupsList));

        const publicGroupsList = await fetchPublicGroupsLegacy(myGroupIds);
        setPublicGroups(publicGroupsList);
      }
      
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      toast({ 
        variant: "destructive", 
        title: "Error Loading Groups", 
        description: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return;
    setIsCreating(true);
    
    try {
      const activeTabs = groupType === "club"
        ? ["sessions", "feed", "members"]
        : ["watchlist", "feed", "members"];

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ 
          name: newGroupName.trim(), 
          created_by: user.id, 
          is_public: false,
          active_tabs: activeTabs
        })
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin',
          status: 'active'
        });

      if (memberError) throw memberError;

      toast({ title: "Success", description: "Group created!" });
      setIsCreateOpen(false);
      setNewGroupName("");
      navigate(`/groups/${group.slug}`);
      
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  // --- REDESIGNED GROUP CARD ---
  const GroupCard = ({ group }: { group: Group }) => (
    <Card 
      className="group cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-300 border-muted overflow-hidden flex flex-col h-full bg-card" 
      onClick={() => navigate(`/groups/${group.slug}`)}
    >
      {/* Visual Header / Poster Collage */}
      <div className="h-32 bg-muted/30 relative overflow-hidden border-b border-border/50">
        {group.cover_url ? (
          <div className="h-full w-full">
            <img
              src={supabase.storage.from('group_covers').getPublicUrl(group.cover_url).data.publicUrl}
              className="object-cover w-full h-full group-hover:scale-105 transition-all duration-500"
              alt={group.name}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        ) : group.recent_posters.length > 0 ? (
          <div className="grid grid-cols-4 h-full w-full opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500">
             {[...group.recent_posters, ...group.recent_posters].slice(0, 4).map((poster, i) => (
               <div key={i} className="h-full relative">
                 <img 
                   src={getPosterUrl(poster)} 
                   className="object-cover w-full h-full" 
                   alt=""
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
               </div>
             ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <div className="text-muted-foreground/20">
               <span className="text-4xl">🎬</span>
            </div>
          </div>
        )}
        
        {group.is_public && (
          <Badge variant="secondary" className="absolute top-2 right-2 backdrop-blur-md bg-black/40 text-white border-white/10">
            Public
          </Badge>
        )}
      </div>

      <CardContent className="flex-1 pt-4 pb-2">
        {group.next_session_date && (
          <p className="text-xs font-medium text-primary mb-1">
            Next session {format(new Date(group.next_session_date), "d MMM")}
          </p>
        )}
        <h3 className="font-bold text-lg leading-tight mb-1 group-hover:text-primary transition-colors">
          {group.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {group.description || "No description provided."}
        </p>
      </CardContent>

      <CardFooter className="pt-2 pb-4 flex justify-between items-center border-t border-border/50 mt-2 bg-muted/5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>{group.member_count} members</span>
        </div>
        <div className="flex -space-x-2">
          {group.member_avatars.map((avatar, i) => (
            <Avatar key={i} className="w-6 h-6 border-2 border-card ring-1 ring-border/10">
              <AvatarImage src={avatar} />
              <AvatarFallback className="text-[9px]">?</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <AppLayout title="Groups">
      <div className="px-4 py-6 max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
            <p className="text-muted-foreground mt-1">
              Create film clubs with scheduled sessions or casual groups to share movies with friends.
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) {
              setNewGroupName("");
              setGroupType("club");
            }
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4 mr-2" /> Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Sunday Night Classics"
                    onKeyDown={(e) => e.key === 'Enter' && newGroupName.trim() && handleCreateGroup()}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Group Type</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setGroupType("club")}
                      className={`cursor-pointer border rounded-lg p-3 hover:bg-accent/50 transition-all ${groupType === "club" ? "border-primary ring-1 ring-primary bg-accent/20" : "border-border"}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`p-1.5 rounded-md ${groupType === "club" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <Clapperboard className="w-4 h-4" />
                        </div>
                        <span className={`text-sm font-semibold ${groupType === "club" ? "text-primary" : ""}`}>Film Club</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">
                        Structured with scheduled sessions.
                      </p>
                    </div>

                    <div
                      onClick={() => setGroupType("casual")}
                      className={`cursor-pointer border rounded-lg p-3 hover:bg-accent/50 transition-all ${groupType === "casual" ? "border-primary ring-1 ring-primary bg-accent/20" : "border-border"}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`p-1.5 rounded-md ${groupType === "casual" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                           <Popcorn className="w-4 h-4" />
                        </div>
                        <span className={`text-sm font-semibold ${groupType === "casual" ? "text-primary" : ""}`}>Casual Group</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">
                        Friends sharing movies & watchlist.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreateGroup} 
                  disabled={!newGroupName.trim() || isCreating}
                >
                  {isCreating ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[1,2,3].map(i => (
               <div key={i} className="h-64 rounded-xl bg-muted/20 animate-pulse" />
             ))}
           </div>
        ) : (
          <Tabs defaultValue="my-groups" className="w-full">
            <TabsList className="w-full max-w-[400px] bg-muted/50 p-1 border border-border/50">
              <TabsTrigger value="my-groups" className="flex-1">My Groups</TabsTrigger>
              <TabsTrigger value="browse" className="flex-1">Browse Public</TabsTrigger>
            </TabsList>
            
            <TabsContent value="my-groups" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {myGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-xl bg-muted/5">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg">No groups yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm text-center">
                    You haven't joined any film clubs. Create one or browse public groups to get started.
                  </p>
                  <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
                    Create First Group
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myGroups.map(group => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="browse" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {publicGroups.length === 0 ? (
                <div className="text-center py-16 border border-dashed rounded-xl">
                  <p className="text-muted-foreground">No public groups found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publicGroups.map(group => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
