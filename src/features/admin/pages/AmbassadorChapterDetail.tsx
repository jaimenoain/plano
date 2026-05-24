import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, type MetaFunction } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  ArrowLeft,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Minus,
  Camera,
  PenLine,
  Building2,
  AlertTriangle,
  Crown,
  Users,
  ImageOff,
  FileWarning,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";
import {
  ambassadorAddMemberSchema,
  ambassadorChapterCreateSchema,
  ambassadorMembershipUpdateSchema,
  type AmbassadorChapterCreateInput,
} from "@/lib/validations/ambassador";
import {
  fetchChapterMetrics,
  fetchChapterActivity,
  fetchChapterRecentBuildings,
  fetchChapterBuildingsWithoutPhotos,
  fetchChapterBuildingsMissingMeta,
  fetchChapterNewBuildings,
  fetchChapterNewCredits,
  type ChapterActivityRow,
} from "@/features/admin/api/ambassadorCoverage";
import {
  AdminPageHeader,
  AdminSectionLabel,
  AdminFormLabel,
  AdminEmptyState,
  adminTableHeadClass,
  adminHairlineTabsListClass,
  adminHairlineTabTriggerClass,
} from "@/features/admin/components/admin-ui";
import { cn } from "@/lib/utils";

export const meta: MetaFunction = () => [
  { title: "Chapter detail | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

type ChapterRow = Database["public"]["Tables"]["ambassador_chapters"]["Row"];
type MembershipRow = Database["public"]["Tables"]["ambassador_memberships"]["Row"];

type MemberWithProfile = MembershipRow & {
  member_profile: { id: string; username: string | null; avatar_url: string | null } | null;
  inviter: { id: string; username: string | null } | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-text-disabled text-xs">—</span>;
  const delta = current - previous;
  if (delta === 0) return <span className="flex items-center gap-1 text-xs text-text-secondary"><Minus className="h-3 w-3" />0</span>;
  if (delta > 0) return <span className="flex items-center gap-1 text-xs text-feedback-success"><TrendingUp className="h-3 w-3" />+{delta}</span>;
  return <span className="flex items-center gap-1 text-xs text-feedback-destructive"><TrendingDown className="h-3 w-3" />{delta}</span>;
}

function MetricCard({
  label,
  icon: Icon,
  current,
  previous,
}: {
  label: string;
  icon: React.ElementType;
  current: number;
  previous: number;
}) {
  return (
    <Card className="border border-border-default rounded-sm p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">{label}</p>
        <Icon className="h-4 w-4 text-text-disabled" aria-hidden />
      </div>
      <p className="text-2xl font-semibold text-text-primary tabular-nums">{current}</p>
      <DeltaBadge current={current} previous={previous} />
    </Card>
  );
}

const EXCO_LABEL: Record<string, string> = {
  content: "Content",
  marketing: "Marketing",
  architect_relations: "Architect relations",
  data_quality: "Data quality",
  community: "Community",
};

const ROLE_ORDER = ["global_president", "global_leaders", "president", "global_team", "exco", "ambassador"] as const;

export default function AmbassadorChapterDetail() {
  const { chapterId } = useParams();
  const { user: currentUser } = useAuth();
  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingChapter, setSavingChapter] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userHits, setUserHits] = useState<{ id: string; username: string | null }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<"president" | "exco" | "ambassador" | "global_team" | "global_leaders" | "global_president">("ambassador");
  const [addExco, setAddExco] = useState<
    "content" | "marketing" | "architect_relations" | "data_quality" | "community"
  >("content");
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<MemberWithProfile | null>(null);
  const [chapterDraft, setChapterDraft] = useState<Partial<AmbassadorChapterCreateInput> | null>(null);

  const isValidId = chapterId ? UUID_RE.test(chapterId) : false;

  const load = useCallback(async () => {
    if (!chapterId || !isValidId) {
      setChapter(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: ch, error: cErr } = await supabase
        .from("ambassador_chapters")
        .select("*")
        .eq("id", chapterId)
        .maybeSingle();
      if (cErr) throw cErr;
      if (!ch) {
        setChapter(null);
        setMembers([]);
        return;
      }
      setChapter(ch);
      setChapterDraft({
        name: ch.name,
        type: ch.type as AmbassadorChapterCreateInput["type"],
        country_code: ch.country_code,
        locality_id: ch.locality_id,
        parent_chapter_id: ch.parent_chapter_id,
        max_ambassadors: ch.max_ambassadors,
        status: ch.status as AmbassadorChapterCreateInput["status"],
      });
      const { data: mems, error: mErr } = await supabase
        .from("ambassador_memberships")
        .select(
          `*, member_profile:profiles!ambassador_memberships_user_id_fkey(id, username, avatar_url), inviter:profiles!ambassador_memberships_invited_by_fkey(id, username)`,
        )
        .eq("chapter_id", chapterId)
        .order("joined_at", { ascending: false });
      if (mErr) throw mErr;
      setMembers((mems ?? []) as MemberWithProfile[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load chapter";
      toast.error(message);
      setChapter(null);
    } finally {
      setLoading(false);
    }
  }, [chapterId, isValidId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const q = userSearch.trim();
    if (q.length < 2) { setUserHits([]); return; }
    const t = window.setTimeout(() => {
      void (async () => {
        const safe = q.replace(/%/g, "").slice(0, 64);
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username")
          .ilike("username", `%${safe}%`)
          .limit(15);
        if (!error) setUserHits(data ?? []);
      })();
    }, 250);
    return () => window.clearTimeout(t);
  }, [userSearch]);

  const metricsQuery = useQuery({
    queryKey: ["chapter-metrics", chapterId],
    queryFn: () => fetchChapterMetrics(chapterId!),
    enabled: isValidId,
    staleTime: 60_000,
  });

  const activityQuery = useQuery({
    queryKey: ["chapter-activity", chapterId],
    queryFn: () => fetchChapterActivity(chapterId!),
    enabled: isValidId,
    staleTime: 60_000,
  });

  const recentBuildingsQuery = useQuery({
    queryKey: ["chapter-recent-buildings", chapterId],
    queryFn: () => fetchChapterRecentBuildings(chapterId!),
    enabled: isValidId,
    staleTime: 60_000,
  });

  const noPhotosQuery = useQuery({
    queryKey: ["chapter-no-photos", chapterId],
    queryFn: () => fetchChapterBuildingsWithoutPhotos(chapterId!),
    enabled: isValidId,
    staleTime: 60_000,
  });

  const missingMetaQuery = useQuery({
    queryKey: ["chapter-missing-meta", chapterId],
    queryFn: () => fetchChapterBuildingsMissingMeta(chapterId!),
    enabled: isValidId,
    staleTime: 60_000,
  });

  const newBuildingsQuery = useQuery({
    queryKey: ["chapter-new-buildings", chapterId],
    queryFn: () => fetchChapterNewBuildings({
      type: chapter!.type,
      locality_id: chapter!.locality_id,
      country_code: chapter!.country_code,
    }),
    enabled: isValidId && !!chapter,
    staleTime: 60_000,
  });

  const newCreditsQuery = useQuery({
    queryKey: ["chapter-new-credits", chapterId],
    queryFn: () => fetchChapterNewCredits(chapterId!),
    enabled: isValidId,
    staleTime: 60_000,
  });

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => ROLE_ORDER.indexOf(a.role as typeof ROLE_ORDER[number]) - ROLE_ORDER.indexOf(b.role as typeof ROLE_ORDER[number])),
    [members],
  );

  const president = useMemo(() => sortedMembers.find((m) => m.role === "president"), [sortedMembers]);
  const exco = useMemo(() => sortedMembers.filter((m) => m.role === "exco"), [sortedMembers]);

  const activityByUser = useMemo(() => {
    const map = new Map<string, ChapterActivityRow>();
    for (const row of activityQuery.data ?? []) map.set(row.user_id, row);
    return map;
  }, [activityQuery.data]);

  const saveChapter = async () => {
    if (!chapterId || !chapterDraft) return;
    const parsed = ambassadorChapterCreateSchema.safeParse({
      name: chapterDraft.name ?? "",
      type: chapterDraft.type ?? "national",
      country_code: chapterDraft.country_code ?? "",
      locality_id: chapterDraft.locality_id ?? null,
      parent_chapter_id: chapterDraft.parent_chapter_id ?? null,
      max_ambassadors: chapterDraft.max_ambassadors ?? 20,
      status: chapterDraft.status ?? "active",
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid chapter"); return; }
    setSavingChapter(true);
    try {
      const { error } = await supabase
        .from("ambassador_chapters")
        .update({
          name: parsed.data.name,
          type: parsed.data.type,
          country_code: parsed.data.country_code,
          locality_id: parsed.data.locality_id,
          parent_chapter_id: parsed.data.parent_chapter_id,
          max_ambassadors: parsed.data.max_ambassadors,
          status: parsed.data.status,
        })
        .eq("id", chapterId);
      if (error) throw error;
      toast.success("Chapter saved");
      await load();
    } catch {
      toast.error("Could not save chapter");
    } finally {
      setSavingChapter(false);
    }
  };

  const saveMemberRow = async (memberId: string) => {
    const m = members.find((x) => x.id === memberId);
    if (!m) return;
    const parsed = ambassadorMembershipUpdateSchema.safeParse({
      role: m.role,
      exco_responsibility: m.exco_responsibility,
      status: m.status,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid membership"); return; }
    const nextRole = parsed.data.role ?? m.role;
    try {
      const { error } = await supabase
        .from("ambassador_memberships")
        .update({
          role: nextRole,
          exco_responsibility: nextRole === "exco" ? parsed.data.exco_responsibility ?? m.exco_responsibility : null,
          status: parsed.data.status ?? m.status,
        })
        .eq("id", m.id);
      if (error) throw error;
      toast.success("Member updated");
      await load();
    } catch {
      toast.error("Could not update member");
    }
  };

  const addMember = async () => {
    if (!chapterId || !selectedUserId) { toast.error("Select a user"); return; }
    const parsed = ambassadorAddMemberSchema.safeParse({
      user_id: selectedUserId,
      role: addRole,
      exco_responsibility: addRole === "exco" ? addExco : null,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid"); return; }
    setAdding(true);
    try {
      const { error } = await supabase.from("ambassador_memberships").insert({
        chapter_id: chapterId,
        user_id: parsed.data.user_id,
        role: parsed.data.role,
        exco_responsibility: parsed.data.exco_responsibility,
        status: "active",
        invited_by: currentUser?.id ?? null,
      });
      if (error) {
        if (error.code === "23505") toast.error("That user already belongs to a chapter");
        else throw error;
        return;
      }
      toast.success("Member added");
      setAddOpen(false);
      setUserSearch("");
      setUserHits([]);
      setSelectedUserId(null);
      await load();
    } catch {
      toast.error("Could not add member");
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async () => {
    if (!removeTarget) return;
    try {
      const { error } = await supabase.from("ambassador_memberships").delete().eq("id", removeTarget.id);
      if (error) throw error;
      toast.success("Member removed");
      setRemoveTarget(null);
      await load();
    } catch {
      toast.error("Could not remove member");
    }
  };

  const patchMember = (id: string, patch: Partial<MemberWithProfile>) =>
    setMembers((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const typeLabel: Record<string, string> = useMemo(() => ({ local: "Local", national: "National" }), []);

  if (!chapterId || !isValidId) {
    return <AdminEmptyState title="Missing or invalid chapter id." />;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-text-disabled" />
      </div>
    );
  }

  if (!chapter || !chapterDraft) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link to="/admin/ambassadors"><ArrowLeft className="h-4 w-4 mr-2" />Back to chapters</Link>
        </Button>
        <AdminEmptyState title="Chapter not found." />
      </div>
    );
  }

  const metrics = metricsQuery.data;

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        eyebrow="Ambassadors"
        title={chapter.name}
        description={`${typeLabel[chapter.type] ?? chapter.type} · ${chapter.country_code}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/ambassadors" className="gap-2">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Chapters
              </Link>
            </Button>
            <Badge variant="secondary" className="capitalize">{chapter.type}</Badge>
            <Badge variant="secondary" className="capitalize">{chapter.status}</Badge>
          </div>
        }
      />

      {/* Metrics row */}
      {metricsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((k) => <div key={k} className="h-24 rounded-sm border border-border-default animate-pulse bg-surface-muted" />)}
        </div>
      ) : metrics ? (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard
            label="Photos added (30d)"
            icon={Camera}
            current={metrics.total_photos_added}
            previous={metrics.prev_total_photos_added}
          />
          <MetricCard
            label="Edits (30d)"
            icon={PenLine}
            current={metrics.total_edits}
            previous={metrics.prev_total_edits}
          />
          <MetricCard
            label="Building visits (30d)"
            icon={Building2}
            current={metrics.total_building_visits}
            previous={metrics.prev_total_building_visits}
          />
          <MetricCard
            label="New buildings (30d)"
            icon={Building2}
            current={newBuildingsQuery.data?.current ?? 0}
            previous={newBuildingsQuery.data?.previous ?? 0}
          />
          <MetricCard
            label="Credits added (30d)"
            icon={Star}
            current={newCreditsQuery.data?.current ?? 0}
            previous={newCreditsQuery.data?.previous ?? 0}
          />
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className={cn("mb-4", adminHairlineTabsListClass)}>
          <TabsTrigger value="overview" className={adminHairlineTabTriggerClass}>Overview</TabsTrigger>
          <TabsTrigger value="members" className={cn(adminHairlineTabTriggerClass, "inline-flex items-center gap-1.5")}>
            Members
            <span className="tabular-nums text-text-disabled">({members.length}/{chapter.max_ambassadors})</span>
          </TabsTrigger>
          <TabsTrigger value="quality" className={cn(adminHairlineTabTriggerClass, "inline-flex items-center gap-1.5")}>
            Data quality
            {(noPhotosQuery.data?.length ?? 0) + (missingMetaQuery.data?.length ?? 0) > 0 && (
              <AlertTriangle className="h-3.5 w-3.5 text-feedback-warning shrink-0" aria-hidden />
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className={adminHairlineTabTriggerClass}>Settings</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-8 pt-4">
          {/* Leadership */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-text-secondary shrink-0" aria-hidden />
              <AdminSectionLabel>Leadership</AdminSectionLabel>
            </div>
            {president || exco.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {president && (
                  <div className="flex items-center gap-3 rounded-sm border border-border-default bg-surface-card p-3">
                    <Avatar className="h-9 w-9 border border-border-default shrink-0">
                      <AvatarImage src={president.member_profile?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {(president.member_profile?.username ?? "P").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        @{president.member_profile?.username ?? president.user_id.slice(0, 8)}
                      </p>
                      <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">President</p>
                    </div>
                  </div>
                )}
                {exco.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-sm border border-border-default bg-surface-card p-3">
                    <Avatar className="h-9 w-9 border border-border-default shrink-0">
                      <AvatarImage src={m.member_profile?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {(m.member_profile?.username ?? "E").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        @{m.member_profile?.username ?? m.user_id.slice(0, 8)}
                      </p>
                      <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
                        ExCo · {m.exco_responsibility ? (EXCO_LABEL[m.exco_responsibility] ?? m.exco_responsibility) : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AdminEmptyState title="No leadership assigned yet." />
            )}
          </section>

          {/* Ambassador activity */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-text-secondary shrink-0" aria-hidden />
              <AdminSectionLabel>Ambassador activity (30 days)</AdminSectionLabel>
            </div>
            {activityQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-text-disabled" />
              </div>
            ) : (activityQuery.data ?? []).length === 0 ? (
              <AdminEmptyState title="No activity recorded yet." />
            ) : (
              <div className="rounded-lg border border-border-default overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={adminTableHeadClass}>Ambassador</TableHead>
                      <TableHead className={adminTableHeadClass}>Role</TableHead>
                      <TableHead className={cn(adminTableHeadClass, "text-right")}>Photos</TableHead>
                      <TableHead className={cn(adminTableHeadClass, "text-right")}>Edits</TableHead>
                      <TableHead className={adminTableHeadClass}>Last active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(activityQuery.data ?? []).map((row) => (
                      <TableRow key={row.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 border border-border-default shrink-0">
                              <AvatarImage src={row.avatar_url ?? undefined} />
                              <AvatarFallback>{(row.username ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-text-primary">@{row.username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-text-secondary text-sm">{row.role}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.photos_added}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.edits_count}</TableCell>
                        <TableCell className="text-sm text-text-secondary">
                          {row.last_active_at
                            ? new Date(row.last_active_at).toLocaleDateString()
                            : <span className="text-text-disabled">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* Recent buildings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-text-secondary shrink-0" aria-hidden />
              <AdminSectionLabel>Recently added buildings</AdminSectionLabel>
            </div>
            {recentBuildingsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-text-disabled" />
              </div>
            ) : (recentBuildingsQuery.data ?? []).length === 0 ? (
              <AdminEmptyState title="No buildings added recently." />
            ) : (
              <div className="rounded-lg border border-border-default overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={adminTableHeadClass}>Building</TableHead>
                      <TableHead className={adminTableHeadClass}>City</TableHead>
                      <TableHead className={adminTableHeadClass}>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(recentBuildingsQuery.data ?? []).map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium text-text-primary">
                          <a
                            href={`/buildings/${b.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {b.name}
                          </a>
                          <span className="ml-1.5 text-text-disabled text-xs">#{b.short_id}</span>
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">{b.city}{b.country ? `, ${b.country}` : ""}</TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </TabsContent>

        {/* ── MEMBERS ── */}
        <TabsContent value="members" className="pt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-text-secondary">
              {members.length} of {chapter.max_ambassadors} seats filled
            </p>
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add member
            </Button>
          </div>
          <div className="rounded-lg border border-border-default overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={adminTableHeadClass}>User</TableHead>
                  <TableHead className={adminTableHeadClass}>Role</TableHead>
                  <TableHead className={adminTableHeadClass}>ExCo area</TableHead>
                  <TableHead className={adminTableHeadClass}>Status</TableHead>
                  <TableHead className={cn(adminTableHeadClass, "text-right")}>Photos</TableHead>
                  <TableHead className={cn(adminTableHeadClass, "text-right")}>Edits</TableHead>
                  <TableHead className={adminTableHeadClass}>Joined</TableHead>
                  <TableHead className={cn(adminTableHeadClass, "w-[160px]")} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <AdminEmptyState title="No members yet." />
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedMembers.map((m) => {
                    const activity = activityByUser.get(m.user_id);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 border border-border-default shrink-0">
                              <AvatarImage src={m.member_profile?.avatar_url ?? undefined} />
                              <AvatarFallback>
                                {(m.member_profile?.username ?? "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-text-primary">
                              @{m.member_profile?.username ?? m.user_id.slice(0, 8)}
                            </span>
                            {m.status === "pending_review" && (
                              <Badge variant="outline" className="text-2xs font-normal">Location review</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={m.role}
                            onValueChange={(v) =>
                              patchMember(m.id, {
                                role: v as MembershipRow["role"],
                                exco_responsibility: v === "exco" ? m.exco_responsibility ?? "content" : null,
                              })
                            }
                          >
                            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ambassador">Ambassador</SelectItem>
                              <SelectItem value="exco">ExCo</SelectItem>
                              <SelectItem value="president">President</SelectItem>
                              <SelectItem value="global_team">Global Team</SelectItem>
                              <SelectItem value="global_leaders">Global Leaders</SelectItem>
                              <SelectItem value="global_president">Global President</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {m.role === "exco" ? (
                            <Select
                              value={m.exco_responsibility ?? "content"}
                              onValueChange={(v) =>
                                patchMember(m.id, {
                                  exco_responsibility: v as NonNullable<MembershipRow["exco_responsibility"]>,
                                })
                              }
                            >
                              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="content">Content</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="architect_relations">Architect relations</SelectItem>
                                <SelectItem value="data_quality">Data quality</SelectItem>
                                <SelectItem value="community">Community</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-text-disabled">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={m.status}
                            onValueChange={(v) => patchMember(m.id, { status: v as MembershipRow["status"] })}
                          >
                            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="pending_review">Pending review</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-text-secondary">
                          {activity?.photos_added ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-text-secondary">
                          {activity?.edits_count ?? "—"}
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {new Date(m.joined_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button type="button" size="sm" variant="secondary" onClick={() => void saveMemberRow(m.id)}>
                              Save
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => setRemoveTarget(m)}>
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── DATA QUALITY ── */}
        <TabsContent value="quality" className="pt-4 space-y-8">
          {/* Buildings without photos */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <ImageOff className="h-4 w-4 text-text-secondary shrink-0" aria-hidden />
              <AdminSectionLabel>Buildings without photos</AdminSectionLabel>
              {(noPhotosQuery.data?.length ?? 0) > 0 && (
                <Badge variant="destructive" className="text-2xs font-normal">
                  {noPhotosQuery.data!.length}
                </Badge>
              )}
            </div>
            {noPhotosQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-text-disabled" /></div>
            ) : (noPhotosQuery.data ?? []).length === 0 ? (
              <AdminEmptyState title="All buildings have at least one photo." />
            ) : (
              <div className="rounded-lg border border-border-default overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={adminTableHeadClass}>Building</TableHead>
                      <TableHead className={adminTableHeadClass}>City</TableHead>
                      <TableHead className={cn(adminTableHeadClass, "text-right")}>Popularity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(noPhotosQuery.data ?? []).map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium text-text-primary">
                          <a href={`/buildings/${b.slug}`} target="_blank" rel="noreferrer" className="hover:underline">
                            {b.name}
                          </a>
                          <span className="ml-1.5 text-text-disabled text-xs">#{b.short_id}</span>
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">{b.city}{b.country ? `, ${b.country}` : ""}</TableCell>
                        <TableCell className="text-right tabular-nums text-text-secondary text-sm">
                          {b.popularity_score.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* Buildings missing metadata */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <FileWarning className="h-4 w-4 text-text-secondary shrink-0" aria-hidden />
              <AdminSectionLabel>Buildings missing credits or styles</AdminSectionLabel>
              {(missingMetaQuery.data?.length ?? 0) > 0 && (
                <Badge variant="destructive" className="text-2xs font-normal">
                  {missingMetaQuery.data!.length}
                </Badge>
              )}
            </div>
            {missingMetaQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-text-disabled" /></div>
            ) : (missingMetaQuery.data ?? []).length === 0 ? (
              <AdminEmptyState title="All buildings have architect credits and styles." />
            ) : (
              <div className="rounded-lg border border-border-default overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={adminTableHeadClass}>Building</TableHead>
                      <TableHead className={adminTableHeadClass}>City</TableHead>
                      <TableHead className={adminTableHeadClass}>Architect credit</TableHead>
                      <TableHead className={adminTableHeadClass}>Styles</TableHead>
                      <TableHead className={cn(adminTableHeadClass, "text-right")}>Popularity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(missingMetaQuery.data ?? []).map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium text-text-primary">
                          <a href={`/buildings/${b.slug}`} target="_blank" rel="noreferrer" className="hover:underline">
                            {b.name}
                          </a>
                          <span className="ml-1.5 text-text-disabled text-xs">#{b.short_id}</span>
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">{b.city}{b.country ? `, ${b.country}` : ""}</TableCell>
                        <TableCell>
                          {b.has_architect_credit
                            ? <span className="text-feedback-success text-sm">✓</span>
                            : <span className="text-feedback-destructive text-sm">✗</span>}
                        </TableCell>
                        <TableCell>
                          {b.has_styles
                            ? <span className="text-feedback-success text-sm">✓</span>
                            : <span className="text-feedback-destructive text-sm">✗</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-text-secondary text-sm">
                          {b.popularity_score.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </TabsContent>

        {/* ── SETTINGS ── */}
        <TabsContent value="settings" className="pt-4">
          <div className="rounded-lg border border-border-default bg-surface-card p-6 space-y-4 max-w-lg">
            <AdminSectionLabel>Chapter settings</AdminSectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <AdminFormLabel htmlFor="edit-name">Name</AdminFormLabel>
                <Input
                  id="edit-name"
                  value={chapterDraft.name ?? ""}
                  onChange={(e) => setChapterDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <AdminFormLabel>Status</AdminFormLabel>
                <Select
                  value={chapterDraft.status ?? "active"}
                  onValueChange={(v) =>
                    setChapterDraft((d) => ({ ...d, status: v as AmbassadorChapterCreateInput["status"] }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forming">Forming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <AdminFormLabel>Type</AdminFormLabel>
                <Input readOnly value={typeLabel[chapter.type] ?? chapter.type} />
              </div>
              <div className="space-y-2">
                <AdminFormLabel htmlFor="edit-cc">Country code</AdminFormLabel>
                <Input
                  id="edit-cc"
                  value={chapterDraft.country_code ?? ""}
                  onChange={(e) =>
                    setChapterDraft((d) => ({ ...d, country_code: e.target.value.toUpperCase().slice(0, 2) }))
                  }
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <AdminFormLabel htmlFor="edit-max">Max ambassadors</AdminFormLabel>
                <Input
                  id="edit-max"
                  type="number"
                  min={1}
                  max={500}
                  value={chapterDraft.max_ambassadors ?? 20}
                  onChange={(e) =>
                    setChapterDraft((d) => ({
                      ...d,
                      max_ambassadors: Number.parseInt(e.target.value, 10) || 1,
                    }))
                  }
                />
              </div>
            </div>
            <Button type="button" disabled={savingChapter} onClick={() => void saveChapter()}>
              {savingChapter ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save chapter"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add member</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <AdminFormLabel htmlFor="user-q">Search by username</AdminFormLabel>
              <Input
                id="user-q"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="At least 2 characters"
              />
              {userHits.length > 0 && (
                <ul className="border border-border-default rounded-md divide-y divide-border-default max-h-36 overflow-y-auto">
                  {userHits.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedUserId === u.id ? "bg-surface-muted" : "hover:bg-surface-muted"
                        }`}
                        onClick={() => { setSelectedUserId(u.id); setUserSearch(u.username ?? ""); }}
                      >
                        @{u.username ?? u.id.slice(0, 8)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-2">
              <AdminFormLabel>Role</AdminFormLabel>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as typeof addRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambassador">Ambassador</SelectItem>
                  <SelectItem value="exco">ExCo</SelectItem>
                  <SelectItem value="president">President</SelectItem>
                  <SelectItem value="global_team">Global Team</SelectItem>
                  <SelectItem value="global_leaders">Global Leaders</SelectItem>
                  <SelectItem value="global_president">Global President</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addRole === "exco" && (
              <div className="space-y-2">
                <AdminFormLabel>ExCo responsibility</AdminFormLabel>
                <Select value={addExco} onValueChange={(v) => setAddExco(v as typeof addExco)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="architect_relations">Architect relations</SelectItem>
                    <SelectItem value="data_quality">Data quality</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="button" disabled={adding} onClick={() => void addMember()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove member confirm */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the user from this chapter. They can be re-added later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void removeMember()}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
