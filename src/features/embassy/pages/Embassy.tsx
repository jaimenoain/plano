import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, type MetaFunction } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { AmbassadorGuard } from "@/features/embassy/components/AmbassadorGuard";
import { EmbassyLeadership } from "@/features/embassy/components/EmbassyLeadership";
import { EmbassyNationalOverview } from "@/features/embassy/components/EmbassyNationalOverview";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchAmbassadorBuildingsMissingMetadata,
  fetchAmbassadorBuildingsWithoutPhotos,
  fetchAmbassadorMyAuditTimeline,
  fetchAmbassadorRecentBuildings,
  fetchAmbassadorUnclaimedFirms,
  type AmbassadorAuditRow,
} from "@/features/embassy/api/taskFeed";
import { getBuildingUrl } from "@/utils/url";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const meta: MetaFunction = () => [
  { title: "Embassy | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

type MembershipRow = Database["public"]["Tables"]["ambassador_memberships"]["Row"];
type ChapterRow = Database["public"]["Tables"]["ambassador_chapters"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["ambassador_applications"]["Row"];

type MembershipWithChapter = MembershipRow & { chapter: ChapterRow | null };

type PendingApplication = ApplicationRow & {
  applicant: { id: string; username: string | null; avatar_url: string | null } | null;
};

const ROLE_DISPLAY: Record<string, string> = {
  president: "President",
  exco: "ExCo",
  ambassador: "Ambassador",
  global_team: "Global Team",
  global_leaders: "Global Leaders",
  global_president: "Global President",
};

function roleLabel(role: string) {
  return ROLE_DISPLAY[role] ?? (role.charAt(0).toUpperCase() + role.slice(1));
}

function taskSectionSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-7 w-56 max-w-full" />
      <div className="space-y-2">
        {[0, 1, 2].map((k) => (
          <Skeleton key={k} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}

function auditTimelineDescription(row: AmbassadorAuditRow): string {
  if (row.table_name === "buildings" && row.operation === "UPDATE") {
    return "Building details updated";
  }
  if (row.table_name === "building_styles" && row.operation === "INSERT") {
    return "Style added";
  }
  if (row.table_name === "building_styles" && row.operation === "DELETE") {
    return "Style removed";
  }
  return `${row.table_name}: ${row.operation}`;
}

function buildingEditHref(
  id: string,
  slug: string | null | undefined,
  shortId: number | null | undefined,
): string {
  const base = getBuildingUrl(id, slug?.trim() || null, shortId ?? undefined);
  return `${base}/edit`;
}

function EmbassyTaskFeed({ chapterId, userId }: { chapterId: string; userId: string }) {
  const noPhotosQuery = useQuery({
    queryKey: ["embassy-task-feed", "no-photos", userId, chapterId],
    queryFn: () => fetchAmbassadorBuildingsWithoutPhotos(chapterId),
    enabled: Boolean(chapterId && userId),
    staleTime: 60_000,
  });

  const missingMetaQuery = useQuery({
    queryKey: ["embassy-task-feed", "missing-meta", userId, chapterId],
    queryFn: () => fetchAmbassadorBuildingsMissingMetadata(chapterId),
    enabled: Boolean(chapterId && userId),
    staleTime: 60_000,
  });

  const firmsQuery = useQuery({
    queryKey: ["embassy-task-feed", "unclaimed-firms", userId, chapterId],
    queryFn: () => fetchAmbassadorUnclaimedFirms(chapterId),
    enabled: Boolean(chapterId && userId),
    staleTime: 60_000,
  });

  const recentQuery = useQuery({
    queryKey: ["embassy-task-feed", "recent-buildings", userId, chapterId],
    queryFn: () => fetchAmbassadorRecentBuildings(chapterId),
    enabled: Boolean(chapterId && userId),
    staleTime: 60_000,
  });

  const auditQuery = useQuery({
    queryKey: ["embassy-task-feed", "my-audit", userId],
    queryFn: fetchAmbassadorMyAuditTimeline,
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  const feedHasError =
    noPhotosQuery.isError ||
    missingMetaQuery.isError ||
    firmsQuery.isError ||
    recentQuery.isError ||
    auditQuery.isError;

  return (
    <div className="space-y-12">
      {feedHasError ? (
        <p className="text-sm text-feedback-destructive">
          Part of the task list could not be loaded. Refresh the page or try again shortly.
        </p>
      ) : null}
      <section className="space-y-4" aria-labelledby="embassy-no-photos-heading">
        <h2 id="embassy-no-photos-heading" className="text-lg font-semibold text-text-primary">
          Buildings without photos
        </h2>
        {noPhotosQuery.isLoading ? (
          taskSectionSkeleton()
        ) : noPhotosQuery.data?.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No buildings without photos in your area — great work.
          </p>
        ) : (
          <ul className="space-y-3">
            {noPhotosQuery.data?.map((row) => (
              <li key={row.id}>
                <Card className="border border-border-default rounded-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-text-primary truncate">{row.name}</p>
                    <p className="text-sm text-text-secondary">
                      {[row.city, row.country].filter(Boolean).join(" · ") || "Location not set"}
                    </p>
                    <p className="text-2xs text-text-disabled uppercase tracking-widest">
                      Popularity {Math.round(row.popularity_score ?? 0)}
                    </p>
                  </div>
                  <Button type="button" size="sm" className="shrink-0 self-start sm:self-center" asChild>
                    <Link to={buildingEditHref(row.id, row.slug, row.short_id)}>Add photos</Link>
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="embassy-missing-meta-heading">
        <h2 id="embassy-missing-meta-heading" className="text-lg font-semibold text-text-primary">
          Incomplete building data
        </h2>
        {missingMetaQuery.isLoading ? (
          taskSectionSkeleton()
        ) : missingMetaQuery.data?.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No incomplete building records in your area right now.
          </p>
        ) : (
          <ul className="space-y-3">
            {missingMetaQuery.data?.map((row) => {
              const tags: string[] = [];
              if (row.year_completed == null) tags.push("Missing: year");
              if (!row.has_styles) tags.push("Missing: style");
              if (!row.has_architect_credit) tags.push("Missing: architect");
              return (
                <li key={row.id}>
                  <Card className="border border-border-default rounded-sm p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <p className="font-medium text-text-primary truncate">{row.name}</p>
                      <p className="text-sm text-text-secondary">
                        {[row.city, row.country].filter(Boolean).join(" · ") || "Location not set"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-2xs font-normal">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button type="button" size="sm" className="shrink-0 self-start" asChild>
                      <Link to={buildingEditHref(row.id, row.slug, row.short_id)}>Complete data</Link>
                    </Button>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="embassy-firms-heading">
        <h2 id="embassy-firms-heading" className="text-lg font-semibold text-text-primary">
          Unclaimed architecture firms
        </h2>
        {firmsQuery.isLoading ? (
          taskSectionSkeleton()
        ) : firmsQuery.data?.length === 0 ? (
          <p className="text-sm text-text-secondary">No unclaimed firms with credits in your area.</p>
        ) : (
          <ul className="space-y-3">
            {firmsQuery.data?.map((row) => (
              <li key={row.id}>
                <Card className="border border-border-default rounded-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-text-primary truncate">{row.name}</p>
                    <p className="text-sm text-text-secondary">
                      {[row.country].filter(Boolean).join(" · ") || "Country not set"}
                    </p>
                    <p className="text-2xs text-text-disabled uppercase tracking-widest">
                      {row.building_count} building{row.building_count === 1 ? "" : "s"} on Plano ·{" "}
                      {row.claim_status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="shrink-0 self-start sm:self-center" asChild>
                    <Link to={`/company/${row.slug}`}>View firm</Link>
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="embassy-recent-heading">
        <h2 id="embassy-recent-heading" className="text-lg font-semibold text-text-primary">
          Recently added buildings
        </h2>
        {recentQuery.isLoading ? (
          taskSectionSkeleton()
        ) : recentQuery.data?.length === 0 ? (
          <p className="text-sm text-text-secondary">No new buildings in your area in the last 30 days.</p>
        ) : (
          <ul className="space-y-3">
            {recentQuery.data?.map((row) => (
              <li key={row.id}>
                <Card className="border border-border-default rounded-sm p-4 space-y-1">
                  <p className="font-medium text-text-primary">{row.name}</p>
                  <p className="text-sm text-text-secondary">
                    {[row.city, row.country].filter(Boolean).join(" · ") || "Location not set"}
                  </p>
                  <p className="text-2xs text-text-disabled">
                    Added{" "}
                    {row.created_at
                      ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true })
                      : "recently"}
                  </p>
                  <p className="text-sm text-text-secondary pt-1">
                    Be the first to add photos or complete the data.
                  </p>
                  <Button type="button" size="sm" variant="outline" className="mt-2" asChild>
                    <Link to={buildingEditHref(row.id, row.slug, row.short_id)}>Edit building</Link>
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="embassy-contributions-heading">
        <h2 id="embassy-contributions-heading" className="text-lg font-semibold text-text-primary">
          Your contributions
        </h2>
        {auditQuery.isLoading ? (
          taskSectionSkeleton()
        ) : auditQuery.data?.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No logged edits yet. Changes to building details and styles appear here.
          </p>
        ) : (
          <ul className="space-y-3 border-l border-border-default pl-4">
            {auditQuery.data?.map((row) => (
              <li key={row.id} className="space-y-1">
                <p className="text-sm font-medium text-text-primary">{auditTimelineDescription(row)}</p>
                <p className="text-sm text-text-secondary">
                  {row.building_name ? (
                    <Link
                      to={getBuildingUrl(row.building_id, row.building_slug || null, row.building_short_id)}
                      className="underline-offset-2 hover:underline text-text-primary"
                    >
                      {row.building_name}
                    </Link>
                  ) : (
                    "Building"
                  )}
                </p>
                <p className="text-2xs text-text-disabled uppercase tracking-widest">
                  {row.created_at
                    ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true })
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type LeaderTab = "tasks" | "leadership" | "applications" | "national";

function EmbassyContent() {
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
        .select(
          `
          *,
          chapter:ambassador_chapters(*)
        `,
        )
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
    if (membership.status !== "active") return;
    const isLeader = ["president", "exco", "global_leaders", "global_team", "global_president"].includes(membership.role);
    if (!isLeader) return;
    setLoadingApps(true);
    try {
      const { data, error } = await supabase
        .from("ambassador_applications")
        .select(
          `
          *,
          applicant:profiles!ambassador_applications_user_id_fkey(id, username, avatar_url)
        `,
        )
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
  }, [membership?.chapter_id, membership?.role, membership?.status]);

  useEffect(() => {
    void loadMembership();
  }, [loadMembership]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const membershipActive = membership?.status === "active";

  const isLeader = useMemo(
    () =>
      membershipActive &&
      ["president", "exco", "global_leaders", "global_team", "global_president"].includes(membership?.role ?? ""),
    [membershipActive, membership?.role],
  );

  const isPresident = membershipActive && ["president", "global_leaders", "global_president"].includes(membership?.role ?? "");

  const isNationalPresident = useMemo(
    () =>
      membershipActive &&
      membership?.chapter?.type === "national" &&
      ["president", "global_leaders", "global_president"].includes(membership?.role ?? ""),
    [membershipActive, membership?.chapter?.type, membership?.role],
  );

  const leaderTab: LeaderTab = useMemo(() => {
    const raw = searchParams.get("tab");
    if (raw === "national" && isNationalPresident) {
      return "national";
    }
    if (raw === "leadership" || raw === "applications" || raw === "tasks") {
      return raw;
    }
    return "tasks";
  }, [searchParams, isNationalPresident]);

  const setLeaderTab = useCallback(
    (next: LeaderTab) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === "tasks") {
            p.delete("tab");
          } else {
            p.set("tab", next);
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

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
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "";
      if (msg.includes("chapter_full")) {
        toast.error("This chapter is at capacity for ambassadors");
      } else if (msg.includes("applicant_already_member")) {
        toast.error("Applicant already has an active membership");
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
      setRejectTarget(null);
    } catch {
      toast.error("Could not reject application");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-disabled" aria-hidden />
      </div>
    );
  }

  if (!membership?.chapter || !user) {
    return (
      <div className="space-y-4">
        <p className="text-text-secondary">
          We could not find an ambassador membership for your account. If you recently changed your
          location, your membership may need to be reactivated by chapter leadership.
        </p>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/become-ambassador">Become an ambassador</Link>
        </Button>
      </div>
    );
  }

  const chapterName = membership.chapter.name;
  const chapterId = membership.chapter_id;
  const membershipUnderReview = membership.status === "pending_review";

  const applicationsPanel = (
    <div className="space-y-6">
      {loadingApps ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-text-disabled" aria-hidden />
        </div>
      ) : applications.length === 0 ? (
        <p className="text-text-secondary">No pending applications for this chapter.</p>
      ) : (
        <ul className="space-y-6">
          {applications.map((app) => (
            <li
              key={app.id}
              className="border border-border-default rounded-sm p-4 sm:p-6 space-y-4"
            >
              <div className="flex flex-wrap items-start gap-4">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={app.applicant?.avatar_url || undefined} />
                  <AvatarFallback>
                    {app.applicant?.username?.charAt(0).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium text-text-primary">
                    @{app.applicant?.username ?? "unknown"}
                  </p>
                  <p className="text-2xs text-text-disabled uppercase tracking-widest">
                    Applied{" "}
                    {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                  </p>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap pt-2">
                    {app.motivation_text}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleApprove(app)}
                  disabled={actionId === app.id}
                >
                  {actionId === app.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    "Approve"
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openReject(app)}
                  disabled={actionId === app.id}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-10 pb-24">
        <div className="border-b border-border-default pb-10 space-y-4">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-primary leading-none">
            Embassy
          </h1>
          {membershipUnderReview ? (
            <p className="text-text-secondary max-w-2xl">
              Your membership is under review following a location change. The chapter leadership has
              been notified. You will be able to use chapter tasks again once they reactivate your
              membership.
            </p>
          ) : (
            <p className="text-text-secondary max-w-2xl">
              Welcome back. You are{" "}
              <span className="font-medium text-text-primary">{roleLabel(membership.role)}</span> for{" "}
              <span className="font-medium text-text-primary">{chapterName}</span>.
            </p>
          )}
        </div>

        {membershipUnderReview ? (
          <p className="text-sm text-text-secondary border border-border-default rounded-sm p-4 bg-surface-muted/30">
            Need to fix a mistake? Update your city or country in{" "}
            <Link
              to="/settings"
              className="font-medium text-text-primary underline underline-offset-2"
            >
              Settings
            </Link>{" "}
            and contact your chapter president or ExCo if you still need help.
          </p>
        ) : null}

        {membershipUnderReview ? null : isLeader ? (
          <Tabs value={leaderTab} onValueChange={(v) => setLeaderTab(v as LeaderTab)} className="w-full">
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="tasks">Chapter tasks</TabsTrigger>
              <TabsTrigger value="leadership">Leadership</TabsTrigger>
              {isNationalPresident ? (
                <TabsTrigger value="national">National overview</TabsTrigger>
              ) : null}
              <TabsTrigger value="applications" className="gap-2">
                Applications
                {applications.length > 0 ? (
                  <Badge variant="secondary" className="rounded-full px-2 py-0 text-2xs font-normal tabular-nums">
                    {applications.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="space-y-4">
              <EmbassyTaskFeed chapterId={chapterId} userId={user.id} />
            </TabsContent>
            <TabsContent value="leadership" className="space-y-4">
              <EmbassyLeadership
                chapterId={chapterId}
                currentUserId={user.id}
                isPresident={Boolean(isPresident)}
              />
            </TabsContent>
            {isNationalPresident ? (
              <TabsContent value="national" className="space-y-4">
                <EmbassyNationalOverview nationalChapterId={chapterId} />
              </TabsContent>
            ) : null}
            <TabsContent value="applications">{applicationsPanel}</TabsContent>
          </Tabs>
        ) : (
          <EmbassyTaskFeed chapterId={chapterId} userId={user.id} />
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Optional note to the applicant</Label>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              className="resize-y min-h-[96px]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleRejectConfirm()}
              disabled={!rejectTarget || actionId === rejectTarget.id}
            >
              {rejectTarget && actionId === rejectTarget.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                "Confirm reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Embassy() {
  return (
    <div className="w-full">
      <AppLayout title="Embassy" showLogo={false}>
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <AmbassadorGuard>
            <EmbassyContent />
          </AmbassadorGuard>
        </div>
      </AppLayout>
    </div>
  );
}
