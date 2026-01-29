import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Users, Building2, Coffee } from "lucide-react";
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
import { PeopleYouMayKnow } from "@/components/connect/PeopleYouMayKnow";
import { YourContacts } from "@/components/connect/YourContacts";

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
  const [groupType, setGroupType] = useState<"club" | "casual">("casual");
  const [isCreating, setIsCreating] = useState(false);
  const [hasBrowsedPublic, setHasBrowsedPublic] = useState(false);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

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
        : ["feed", "pipeline", "members"];

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
                   src={poster || "/placeholder.svg"}
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
               <Building2 className="w-12 h-12 text-muted-foreground/40" />
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
    <AppLayout title="Connect">
      <div className="px-4 py-6 max-w-6xl mx-auto space-y-10">
        
        {/* Groups Section */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Groups</h2>
              <p className="text-muted-foreground mt-1">
                Plan trips and create clubs to share your passion for architecture
              </p>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (open) {
                setNewGroupName("");
                setGroupType("casual");
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
                      placeholder="e.g. Brutalist Enthusiasts"
                      onKeyDown={(e) => e.key === 'Enter' && newGroupName.trim() && handleCreateGroup()}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Group Type</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setGroupType("casual")}
                        className={`cursor-pointer border rounded-lg p-3 hover:bg-accent/50 transition-all ${groupType === "casual" ? "border-primary ring-1 ring-primary bg-accent/20" : "border-border"}`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`p-1.5 rounded-md ${groupType === "casual" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                             <Coffee className="w-4 h-4" />
                          </div>
                          <span className={`text-sm font-semibold ${groupType === "casual" ? "text-primary" : ""}`}>Casual Group</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">
                          Plan a trip with friends.
                        </p>
                      </div>

                      <div
                        onClick={() => setGroupType("club")}
                        className={`cursor-pointer border rounded-lg p-3 hover:bg-accent/50 transition-all ${groupType === "club" ? "border-primary ring-1 ring-primary bg-accent/20" : "border-border"}`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`p-1.5 rounded-md ${groupType === "club" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <span className={`text-sm font-semibold ${groupType === "club" ? "text-primary" : ""}`}>Architecture Group</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">
                          Structured with scheduled sessions.
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
          ) : !hasBrowsedPublic && myGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-xl bg-muted/5 animate-in fade-in zoom-in-95 duration-500">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">No groups yet</h3>
              <p className="text-muted-foreground mb-4 max-w-sm text-center">
                You haven't joined any clubs. Create one or browse public groups to get started.
              </p>
              <div className="flex flex-col items-center gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
                  Create First Group
                </Button>
                <button
                  onClick={() => setHasBrowsedPublic(true)}
                  className="text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
                >
                  or browse public
                </button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue={hasBrowsedPublic && myGroups.length === 0 ? "browse" : "my-groups"} className="w-full">
              <TabsList className="w-full max-w-[400px] bg-muted/50 p-1 border border-border/50">
                <TabsTrigger value="my-groups" className="flex-1">My Groups</TabsTrigger>
                <TabsTrigger value="browse" className="flex-1">Browse Public</TabsTrigger>
              </TabsList>

              <TabsContent value="my-groups" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {myGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-xl bg-muted/5">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">No groups yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-sm text-center">
                      You haven't joined any clubs. Create one or browse public groups to get started.
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

        <div className="space-y-10 border-t pt-8">
            <PeopleYouMayKnow />
            <YourContacts />
        </div>
      </div>
    </AppLayout>
  );
}
