import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, redirect } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { EmbassyLeadership } from "@/features/embassy/components/EmbassyLeadership";
import { EmbassyNationalOverview } from "@/features/embassy/components/EmbassyNationalOverview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type MembershipRow = Database["public"]["Tables"]["ambassador_memberships"]["Row"];
type ChapterRow = Database["public"]["Tables"]["ambassador_chapters"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["ambassador_applications"]["Row"];

type MembershipWithChapter = MembershipRow & { chapter: ChapterRow | null };

type PendingApplication = ApplicationRow & {
  applicant: { id: string; username: string | null; avatar_url: string | null } | null;
};

export async function loader() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/auth?redirectTo=/embassy/leadership");

  const { data: membership } = await supabase
    .from("ambassador_memberships")
    .select("role, status")
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "exco" && membership.role !== "president")) {
    return redirect("/embassy");
  }

  return null;
}

export default function LeadershipPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [membership, setMembership] = useState<MembershipWithChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<PendingApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PendingApplication | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const loadMembership = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ambassador_memberships")
        .select(`*, chapter:ambassador_chapters(*)`)
        .eq("user_id", user.id)
        .in("status", ["active", "pending_review"])
        .maybeSingle();
      if (error) throw error;
      setMembership((data ?? null) as MembershipWithChapter | null);
    } catch {
      toast.error("Could not load your ambassador profile");
      setMembership(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadApplications = useCallback(async () => {
    if (!membership?.chapter_id) return;
    const isLeader = membership.role === "president" || membership.role === "exco";
    if (!isLeader) return;
    
    setLoadingApps(true);
    try {
      const { data, error } = await supabase
        .from("ambassador_applications")
        .select(`*, applicant:profiles!ambassador_applications_user_id_fkey(id, username, avatar_url)`)
        .eq("chapter_id", membership.chapter_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setApplications((data ?? []) as PendingApplication[]);
    } catch {
      toast.error("Could not load applications");
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  }, [membership?.chapter_id, membership?.role]);

  useEffect(() => {
    void loadMembership();
  }, [loadMembership]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const isPresident = membership?.role === "president";
  const isNationalPresident = membership?.chapter?.type === "national" && isPresident;

  const activeTab = searchParams.get("tab") || "health";

  const handleApprove = async (app: PendingApplication) => {
    setActionId(app.id);
    try {
      const { error } = await supabase.rpc("review_ambassador_application", {
        p_application_id: app.id,
        p_approve: true,
        p_reviewer_note: null,
      });
      if (error) throw error;
      toast.success("Application approved");
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
    } catch (e: any) {
      if (e.message?.includes("chapter_full")) {
        toast.error("This chapter is at capacity");
      } else {
        toast.error("Could not approve application");
      }
    } finally {
      setActionId(null);
    }
  };

  const openReject = (app: PendingApplication) => {
    setRejectTarget(app);
    setRejectNote("");
    setRejectOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActionId(rejectTarget.id);
    try {
      const { error } = await supabase.rpc("review_ambassador_application", {
        p_application_id: rejectTarget.id,
        p_approve: false,
        p_reviewer_note: rejectNote.trim() || null,
      });
      if (error) throw error;
      toast.success("Application rejected");
      setApplications((prev) => prev.filter((a) => a.id !== rejectTarget.id));
      setRejectOpen(false);
    } catch {
      toast.error("Could not reject application");
    } finally {
      setActionId(null);
    }
  };

  if (loading || !membership?.chapter || !user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Leadership</h1>
        <p className="text-muted-foreground">
          Chapter health dashboard and member management for {membership.chapter.name}.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="w-full">
        <TabsList className="mb-6 h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="health" className="data-[state=active]:bg-muted">Chapter Health</TabsTrigger>
          <TabsTrigger value="applications" className="gap-2 data-[state=active]:bg-muted">
            Applications
            {applications.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {applications.length}
              </Badge>
            )}
          </TabsTrigger>
          {isNationalPresident && (
            <TabsTrigger value="national" className="data-[state=active]:bg-muted">National Overview</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="health" className="mt-0">
          <EmbassyLeadership
            chapterId={membership.chapter_id}
            currentUserId={user.id}
            isPresident={isPresident}
          />
        </TabsContent>

        <TabsContent value="applications" className="mt-0">
          <div className="space-y-6">
            {loadingApps ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                No pending applications.
              </div>
            ) : (
              <div className="grid gap-4">
                {applications.map((app) => (
                  <div key={app.id} className="rounded-xl border bg-card p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={app.applicant?.avatar_url || undefined} />
                        <AvatarFallback>{app.applicant?.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">@{app.applicant?.username || "unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                          {app.motivation_text}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void handleApprove(app)} disabled={!!actionId}>
                        {actionId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openReject(app)} disabled={!!actionId}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {isNationalPresident && (
          <TabsContent value="national" className="mt-0">
            <EmbassyNationalOverview nationalChapterId={membership.chapter_id} />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Reason for rejection (optional)</Label>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Provide context for the applicant..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void handleRejectConfirm()} disabled={!!actionId}>
              {actionId === rejectTarget?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
