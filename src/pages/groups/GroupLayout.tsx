import { Outlet, Link, useLocation, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Users, Calendar, Activity, BarChart3, Lock, Send, UserPlus, Repeat, ListChecks, Filter, MapPin, Link as LinkIcon, Video, Globe, Tv } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { parseHomeBase } from "@/lib/utils";
import { JoinGroupDialog } from "@/components/groups/JoinGroupDialog";
import { ManageTabsDialog } from "@/components/groups/ManageTabsDialog";
import { Plus } from "lucide-react";
import { MetaHead } from "@/components/common/MetaHead";

export default function GroupLayout() {
  const { slug } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isManageTabsOpen, setIsManageTabsOpen] = useState(false);

  const { data: group, isLoading } = useQuery({
    queryKey: ["group-basic", slug],
    queryFn: async () => {
      // Try fetching by slug first
      let query = supabase
        .from("groups")
        // FETCH MEMBER ID HERE: Added 'id' to the nested select list
        // ALSO: fetch active cycles count to determine if we show the tab
        // AND: fetch private info for home_base
        .select(`
          *,
          members:group_members(id, role, status, note, user:profiles(id, username, avatar_url)),
          cycles:group_cycles(count),
          polls:polls(count),
          private:group_private_info(home_base)
        `);

      // Basic check if it looks like a UUID (length 36, typical chars)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || "");

      if (isUuid) {
        query = query.eq("id", slug);
      } else {
        query = query.eq("slug", slug);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const myMemberRecord = useMemo(() => {
    if (!group || !user) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return group.members?.find((m: any) => m.user.id === user.id);
  }, [group, user]);

  const membershipStatus = useMemo(() => {
    if (!myMemberRecord) return 'none';
    if (myMemberRecord.status === 'pending') return 'pending';
    if (myMemberRecord.role === 'admin') return 'admin';
    return 'member';
  }, [myMemberRecord]);

  const isAdmin = membershipStatus === 'admin';
  const isMember = isAdmin || membershipStatus === 'member';
  const canView = group?.is_public || isMember;

  // Extract home base
  const homeBase = useMemo(() => {
      if (!group?.private) return null;
      const raw = Array.isArray(group.private) ? group.private[0]?.home_base : group.private.home_base;
      if (!raw) return null;
      const parsed = parseHomeBase(raw);
      if (!parsed.value) return null;
      return parsed;
  }, [group]);

  // Filter out pending members for the count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberCount = group?.members?.filter((m: any) => m.status !== 'pending').length || 0;


  // Helper to check if a tab is active
  const isActive = (path: string) => {
    if (path === "") {
      // Check if we are on the exact group root page
      return location.pathname.endsWith(`/groups/${slug}`) || location.pathname === `/groups/${slug}/`;
    }
    return location.pathname.includes(path);
  };

  const activeTabs = useMemo(() => {
    if (!group) return ["sessions", "feed", "members"];
    // Default tabs if active_tabs is null/empty
    return group.active_tabs || ["sessions", "feed", "members"];
  }, [group]);

  const navItems = useMemo(() => {
    const items = [];

    // Core items
    items.push({ path: "", label: "Field Trips", icon: Calendar });

    if (activeTabs.includes("cycles")) items.push({ path: "cycles", label: "Cycles", icon: Repeat });

    items.push({ path: "feed", label: "Feed", icon: Activity });

    if (activeTabs.includes("polls")) items.push({ path: "polls", label: "Polls", icon: ListChecks });
    if (activeTabs.includes("watchlist")) items.push({ path: "watchlist", label: "Watchlist", icon: Tv });
    if (activeTabs.includes("pipeline")) items.push({ path: "pipeline", label: "Pipeline", icon: Filter });

    items.push({ path: "members", label: "Members", icon: Users });

    if (activeTabs.includes("stats")) items.push({ path: "stats", label: "Stats", icon: BarChart3 });

    return items;
  }, [activeTabs]);

  if (isLoading) return (
    <AppLayout>
      <div className="space-y-6 animate-pulse p-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-12 w-full max-w-md" />
      </div>
    </AppLayout>
  );

  if (!group) return <AppLayout><div className="p-12 text-center text-muted-foreground">Group not found</div></AppLayout>;

  // RESTRICTED VIEW
  if (!canView) {
    return (
      <AppLayout>
        <div className="relative bg-gradient-to-b from-muted/30 to-background pt-10 pb-20 px-4 border-b border-border/40 overflow-hidden min-h-[60vh] flex flex-col items-center justify-center">
            {group.cover_url && (
            <div className="absolute inset-0">
               <img
                 src={supabase.storage.from("group_covers").getPublicUrl(group.cover_url).data.publicUrl}
                 alt=""
                 className="w-full h-full object-cover opacity-20 blur-sm"
               />
               <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background" />
            </div>
          )}

          <div className="relative z-10 text-center space-y-6 max-w-lg mx-auto">
             <div className="flex justify-center">
                <div className="bg-background/80 backdrop-blur-sm p-4 rounded-full border border-border shadow-sm">
                   <Lock className="h-8 w-8 text-primary" />
                </div>
             </div>

             <div className="space-y-2">
                 <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
                 <Badge variant="outline" className="text-xs">Private Group</Badge>
             </div>

             {membershipStatus === 'pending' ? (
                <div className="bg-muted/50 border border-border rounded-xl p-6 space-y-3">
                   <div className="flex justify-center text-yellow-500">
                     <Activity className="h-6 w-6 animate-pulse" />
                   </div>
                   <h3 className="font-semibold text-lg">Request Pending</h3>
                   <p className="text-muted-foreground">
                     You have requested to join this group. The admins will review your request shortly.
                   </p>
                </div>
             ) : (
                <div className="space-y-6">
                   <p className="text-lg text-muted-foreground">
                     This group is private and visible only to members. Join the group to see sessions, feed, and members.
                   </p>

                   <JoinGroupDialog
                      group={group}
                      open={isRequestDialogOpen}
                      onOpenChange={setIsRequestDialogOpen}
                      trigger={
                         <Button size="lg" className="w-full sm:w-auto">
                           <UserPlus className="mr-2 h-4 w-4" /> Request to Join
                         </Button>
                      }
                   />
                </div>
             )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // NORMAL VIEW
  return (
    <AppLayout>
      <MetaHead
        title={group.name}
        description={group.description || "Join this group on Cineforum."}
        image={group.cover_url ? supabase.storage.from("group_covers").getPublicUrl(group.cover_url).data.publicUrl : undefined}
      />

      {/* Hero Header */}
      <div className="relative bg-gradient-to-b from-muted/30 to-background pt-10 pb-2 px-4 border-b border-border/40 overflow-hidden">
        {group.cover_url && (
          <>
            <div className="absolute inset-0">
               <img
                 src={supabase.storage.from("group_covers").getPublicUrl(group.cover_url).data.publicUrl}
                 alt=""
                 className="w-full h-full object-cover opacity-20 blur-sm"
               />
               <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background" />
            </div>
          </>
        )}
        <div className="max-w-5xl mx-auto relative">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                 <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{group.name}</h1>
                 {!group.is_public && <Badge variant="outline" className="text-xs">Private</Badge>}
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                {group.description || "A community for architecture lovers."}
              </p>
 {group.links && (group.links as any[]).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                   {(group.links as any[]).map((link: any, i: number) => {
                     let Icon = Globe;
                     if (link.type === 'zoom' || link.type === 'meetup' || link.type === 'discord') Icon = Video;
                     if (link.type === 'whatsapp') Icon = Send;
                     if (link.type === 'webpage') Icon = LinkIcon;

                     return (
                       <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs bg-muted/50 hover:bg-muted px-2.5 py-1 rounded-full border transition-colors"
                       >
                         <Icon className="w-3 h-3" />
                         {link.label || link.type}
                       </a>
                     )
                   })}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-sm text-muted-foreground">
                {isMember && homeBase && (
                  <>
                    {homeBase.type === 'physical' ? (
                      <div className="flex items-center gap-1.5 text-foreground/80">
                        <MapPin className="w-4 h-4" />
                        <span>{homeBase.value}</span>
                      </div>
                    ) : homeBase.type === 'virtual' ? (
                      <div className="flex items-center gap-1.5 text-foreground/80">
                         <Video className="w-4 h-4" />
                         {homeBase.value ? (
                           <a href={homeBase.value} target="_blank" rel="noopener noreferrer" className="hover:underline">
                             Virtual
                           </a>
                         ) : (
                           <span>Virtual</span>
                         )}
                      </div>
                    ) : (
                      // Hybrid
                      <div className="flex items-center gap-1.5 text-foreground/80">
                          <MapPin className="w-4 h-4" />
                          <span>Hybrid</span>
                          {homeBase.physical && <span>- {homeBase.physical}</span>}
                      </div>
                    )}
                    <span className="hidden sm:inline">•</span>
                  </>
                )} <Link to={`/groups/${slug}/members`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Users className="w-4 h-4" />
                  <span className="font-medium text-foreground">{memberCount}</span> members
                </Link>
                <span className="hidden sm:inline">•</span>
                <div>
                   Admins: <span className="font-medium text-foreground">
                    {(() => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const admins = group.members?.filter((m: any) => m.role === 'admin' && m.status !== 'pending') || [];
                      // If no explicit admins found (legacy), fallback to creator
                      if (admins.length === 0) {
                         // eslint-disable-next-line @typescript-eslint/no-explicit-any
                         const creator = group.members?.find((m: any) => m.user.id === group.created_by);
                         return creator ? <Link to={`/profile/${creator.user.username}`} className="hover:underline">{creator.user.username}</Link> : 'Unknown';
                      }

                      return (
                        <>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {admins.slice(0, 3).map((admin: any, i: number) => (
                            <span key={admin.user.id}>
                              {i > 0 && ", "}
                              <Link to={`/profile/${admin.user.username}`} className="hover:underline">
                                {admin.user.username}
                              </Link>
                            </span>
                          ))}
                          {admins.length > 3 && ` + ${admins.length - 3} others`}
                        </>
                      );
                    })()}
                   </span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <Button variant="outline" size="icon" className="shrink-0" asChild>
                <Link to={`/groups/${slug}/settings`}>
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>

          {/* Navigation Bar */}
          <div className="relative">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-4">
              {navItems.map((item) => {
                const active = isActive(item.path);
                const LinkIcon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={`/groups/${slug}/${item.path}`}
                    className={`
                      flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap
                      ${active
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
                      }
                    `}
                  >
                    <LinkIcon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}

              {isAdmin && (
                <button
                  onClick={() => setIsManageTabsOpen(true)}
                  className="flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border/50 transition-all"
                  aria-label="Add tab"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}

              {/* Spacer to allow scrolling past the last item slightly */}
              <div className="w-4 shrink-0" />
            </div>
            {/* Fade effect to indicate overflow */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          </div>

          <ManageTabsDialog
            group={group}
            open={isManageTabsOpen}
            onOpenChange={setIsManageTabsOpen}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-5xl mx-auto px-4 py-8 pb-20">
        <Outlet context={{ group, isAdmin, isMember }} />
      </div>
    </AppLayout>
  );
}
