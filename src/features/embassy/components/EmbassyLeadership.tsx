import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchChapterAmbassadorActivity,
  fetchChapterMembersWithContact,
  fetchChapterMetrics,
  presidentInviteMember,
  presidentUpdateMembership,
} from "@/features/embassy/api/leadership";
import {
  ambassadorMembershipRoleSchema,
  excoResponsibilitySchema,
} from "@/lib/validations/ambassador";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { embassyTableHeadClass } from "@/features/embassy/components/embassy-ui";

const inviteSchema = z
  .object({
    user_id: z.string().uuid(),
    role: z.enum(["ambassador", "exco"]),
    exco_responsibility: excoResponsibilitySchema.nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.role === "exco" && !val.exco_responsibility) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pick an ExCo responsibility",
        path: ["exco_responsibility"],
      });
    }
    if (val.role !== "exco" && val.exco_responsibility) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only ExCo needs a responsibility",
        path: ["exco_responsibility"],
      });
    }
  });

const EXCO_LABELS: Record<string, string> = {
  content: "Content",
  marketing: "Marketing",
  architect_relations: "Architect relations",
  data_quality: "Data quality",
  community: "Community",
};

function trendIcon(cur: number, prev: number) {
  if (cur > prev) return <TrendingUp className="h-4 w-4 text-feedback-success" aria-hidden />;
  if (cur < prev) return <TrendingDown className="h-4 w-4 text-feedback-destructive" aria-hidden />;
  return <Minus className="h-4 w-4 text-text-disabled" aria-hidden />;
}

function num(v: number | bigint | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "bigint" ? Number(v) : v;
}

type UserHit = { id: string; username: string | null };

type EmbassyLeadershipProps = {
  chapterId: string;
  currentUserId: string;
  isPresident: boolean;
};

export function EmbassyLeadership({ chapterId, currentUserId, isPresident }: EmbassyLeadershipProps) {
  const queryClient = useQueryClient();
  const [metricsDays, setMetricsDays] = useState<7 | 30>(30);
  const activityDays = 30;

  const metricsQuery = useQuery({
    queryKey: ["embassy-leadership", "metrics", chapterId, metricsDays],
    queryFn: () => fetchChapterMetrics(chapterId, metricsDays),
    enabled: Boolean(chapterId),
    staleTime: 60_000,
  });

  const activityQuery = useQuery({
    queryKey: ["embassy-leadership", "activity", chapterId, activityDays],
    queryFn: () => fetchChapterAmbassadorActivity(chapterId, activityDays),
    enabled: Boolean(chapterId),
    staleTime: 60_000,
  });

  const membersQuery = useQuery({
    queryKey: ["embassy-leadership", "members", chapterId],
    queryFn: () => fetchChapterMembersWithContact(chapterId),
    enabled: Boolean(chapterId),
    staleTime: 30_000,
  });

  const invalidateLeadership = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["embassy-leadership", "members", chapterId] });
    void queryClient.invalidateQueries({ queryKey: ["embassy-leadership", "activity", chapterId] });
    void queryClient.invalidateQueries({ queryKey: ["embassy-leadership", "metrics", chapterId] });
  }, [chapterId, queryClient]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userHits, setUserHits] = useState<UserHit[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<"ambassador" | "exco">("ambassador");
  const [inviteExco, setInviteExco] = useState<string>("");

  const searchUsers = async () => {
    const safe = userQuery.trim().replace(/%/g, "").slice(0, 40);
    if (safe.length < 2) {
      toast.error("Type at least 2 characters to search");
      return;
    }
    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .ilike("username", `%${safe}%`)
        .limit(12);
      if (error) throw error;
      setUserHits((data ?? []) as UserHit[]);
    } catch {
      toast.error("User search failed");
      setUserHits([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const inviteMutation = useMutation({
    mutationFn: presidentInviteMember,
    onSuccess: () => {
      toast.success("Member invited");
      setInviteOpen(false);
      setUserQuery("");
      setUserHits([]);
      setSelectedUserId(null);
      invalidateLeadership();
    },
    onError: (e: Error) => {
      const m = e.message ?? "";
      if (m.includes("chapter_full")) toast.error("Chapter is at capacity for ambassadors");
      else if (m.includes("user_already_has_membership")) toast.error("That user already has a chapter");
      else if (m.includes("forbidden")) toast.error("Only the chapter president can invite");
      else toast.error("Could not send invite");
    },
  });

  const submitInvite = () => {
    if (!selectedUserId) {
      toast.error("Select a user from the search results");
      return;
    }
    const parsed = inviteSchema.safeParse({
      user_id: selectedUserId,
      role: inviteRole,
      exco_responsibility: inviteRole === "exco" ? inviteExco : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid invite");
      return;
    }
    inviteMutation.mutate({
      chapterId,
      userId: parsed.data.user_id,
      role: parsed.data.role,
      excoResponsibility: parsed.data.exco_responsibility,
    });
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editMembershipId, setEditMembershipId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("ambassador");
  const [editExco, setEditExco] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("active");

  const openEdit = (row: {
    membership_id: string;
    role: string;
    exco_responsibility: string | null;
    status: string;
  }) => {
    setEditMembershipId(row.membership_id);
    setEditRole(row.role);
    setEditExco(row.exco_responsibility ?? "");
    setEditStatus(row.status);
    setEditOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: presidentUpdateMembership,
    onSuccess: () => {
      toast.success("Membership updated");
      setEditOpen(false);
      setEditMembershipId(null);
      invalidateLeadership();
    },
    onError: (e: Error) => {
      const m = e.message ?? "";
      if (m.includes("cannot_change_own_role")) toast.error("You cannot change your own role here");
      else if (m.includes("exco_requires_responsibility")) toast.error("ExCo members need a responsibility");
      else if (m.includes("forbidden")) toast.error("Only the chapter president can update members");
      else toast.error("Could not update membership");
    },
  });

  const submitEdit = () => {
    if (!editMembershipId) return;
    const roleParsed = ambassadorMembershipRoleSchema.safeParse(editRole);
    if (!roleParsed.success) {
      toast.error("Invalid role");
      return;
    }
    const excoParsed =
      editRole === "exco"
        ? excoResponsibilitySchema.safeParse(editExco)
        : { success: true as const, data: null as string | null };
    if (!excoParsed.success) {
      toast.error("Pick a valid ExCo responsibility");
      return;
    }
    updateMutation.mutate({
      membershipId: editMembershipId,
      role: roleParsed.data,
      excoResponsibility: editRole === "exco" ? excoParsed.data : null,
      status: editStatus,
    });
  };

  const metrics = metricsQuery.data;
  const staleThresholdMs = 30 * 24 * 60 * 60 * 1000;

  const activityRows = useMemo(() => activityQuery.data ?? [], [activityQuery.data]);

  return (
    <div className="space-y-14">
      <section className="space-y-4" aria-labelledby="embassy-metrics-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="embassy-metrics-heading" className="text-lg font-semibold text-text-primary">
            Chapter metrics
          </h2>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={metricsDays === 7 ? "default" : "outline"}
              onClick={() => setMetricsDays(7)}
            >
              Last 7 days
            </Button>
            <Button
              type="button"
              size="sm"
              variant={metricsDays === 30 ? "default" : "outline"}
              onClick={() => setMetricsDays(30)}
            >
              Last 30 days
            </Button>
          </div>
        </div>
        {metricsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-sm" />
            ))}
          </div>
        ) : metricsQuery.isError ? (
          <p className="text-sm text-feedback-destructive">Could not load chapter metrics.</p>
        ) : !metrics ? (
          <p className="text-sm text-text-secondary">No metrics data available yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border border-border-default rounded-sm p-4 space-y-2">
              <p className="text-2xs font-medium uppercase tracking-widest text-text-disabled">
                Edits
              </p>
              <p className="text-2xl font-semibold text-text-primary">{num(metrics.total_edits)}</p>
              <div className="flex items-center gap-2 text-2xs text-text-secondary">
                {trendIcon(num(metrics.total_edits), num(metrics.prev_total_edits))}
                <span>vs prior {metricsDays}d</span>
              </div>
            </Card>
            <Card className="border border-border-default rounded-sm p-4 space-y-2">
              <p className="text-2xs font-medium uppercase tracking-widest text-text-disabled">
                Photos added
              </p>
              <p className="text-2xl font-semibold text-text-primary">
                {num(metrics.total_photos_added)}
              </p>
              <div className="flex items-center gap-2 text-2xs text-text-secondary">
                {trendIcon(num(metrics.total_photos_added), num(metrics.prev_total_photos_added))}
                <span>vs prior {metricsDays}d</span>
              </div>
            </Card>
            <Card className="border border-border-default rounded-sm p-4 space-y-2">
              <p className="text-2xs font-medium uppercase tracking-widest text-text-disabled">
                Building visits logged
              </p>
              <p className="text-2xl font-semibold text-text-primary">
                {num(metrics.total_building_visits)}
              </p>
              <div className="flex items-center gap-2 text-2xs text-text-secondary">
                {trendIcon(
                  num(metrics.total_building_visits),
                  num(metrics.prev_total_building_visits),
                )}
                <span>vs prior {metricsDays}d</span>
              </div>
            </Card>
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="embassy-activity-heading">
        <h2 id="embassy-activity-heading" className="text-lg font-semibold text-text-primary">
          Ambassador activity
        </h2>
        <p className="text-sm text-text-secondary">
          All ambassador activity in your chapter area (last {activityDays} days).
        </p>
        {activityQuery.isLoading ? (
          <Skeleton className="h-48 w-full rounded-sm" />
        ) : activityQuery.isError ? (
          <p className="text-sm text-feedback-destructive">Could not load activity.</p>
        ) : (
          <div className="border border-border-default rounded-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={embassyTableHeadClass}>Member</TableHead>
                  <TableHead className={embassyTableHeadClass}>Role</TableHead>
                  <TableHead className={cn(embassyTableHeadClass, "text-right")}>Edits</TableHead>
                  <TableHead className={cn(embassyTableHeadClass, "text-right")}>Photos</TableHead>
                  <TableHead className={cn(embassyTableHeadClass, "text-right")}>Visits</TableHead>
                  <TableHead className={cn(embassyTableHeadClass, "text-right")}>Moderation</TableHead>
                  <TableHead className={cn(embassyTableHeadClass, "text-right")}>Outreach</TableHead>
                  <TableHead className={cn(embassyTableHeadClass, "text-right")}>Points</TableHead>
                  <TableHead className={embassyTableHeadClass}>Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityRows.map((row) => {
                  const last = row.last_active_at ? new Date(row.last_active_at).getTime() : 0;
                  const quiet =
                    last > 0 && Date.now() - last > staleThresholdMs && row.user_id !== currentUserId;
                  return (
                    <TableRow key={row.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={row.avatar_url || undefined} />
                            <AvatarFallback className="text-2xs">
                              {(row.username ?? "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate font-medium text-text-primary">
                            @{row.username || "unknown"}
                          </span>
                          {quiet ? (
                            <Badge variant="outline" className="text-2xs font-normal shrink-0">
                              Quiet
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-text-secondary">{row.role}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(row.edits_count)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(row.photos_added)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(row.visits_count)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(row.moderation_count)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(row.outreach_count)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{num(row.total_score)}</TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {row.last_active_at
                          ? formatDistanceToNow(new Date(row.last_active_at), { addSuffix: true })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="embassy-members-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="embassy-members-heading" className="text-lg font-semibold text-text-primary">
            Members
          </h2>
          {isPresident ? (
            <Button type="button" size="sm" onClick={() => setInviteOpen(true)}>
              Invite user
            </Button>
          ) : null}
        </div>
        {membersQuery.isLoading ? (
          <Skeleton className="h-40 w-full rounded-sm" />
        ) : membersQuery.isError ? (
          <p className="text-sm text-feedback-destructive">Could not load members.</p>
        ) : (
          <div className="border border-border-default rounded-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={embassyTableHeadClass}>Member</TableHead>
                  <TableHead className={embassyTableHeadClass}>Email</TableHead>
                  <TableHead className={embassyTableHeadClass}>Role</TableHead>
                  <TableHead className={embassyTableHeadClass}>ExCo area</TableHead>
                  <TableHead className={embassyTableHeadClass}>Status</TableHead>
                  <TableHead className={embassyTableHeadClass}>Joined</TableHead>
                  {isPresident ? (
                    <TableHead className={cn(embassyTableHeadClass, "text-right")}>Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(membersQuery.data ?? []).map((m) => (
                  <TableRow key={m.membership_id}>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={m.avatar_url || undefined} />
                          <AvatarFallback className="text-2xs">
                            {(m.username ?? "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">@{m.username || "unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary max-w-[200px] truncate">
                      {m.email?.trim() ? m.email : "—"}
                    </TableCell>
                    <TableCell className="capitalize">{m.role}</TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {m.role === "exco" && m.exco_responsibility
                        ? EXCO_LABELS[m.exco_responsibility] ?? m.exco_responsibility
                        : "—"}
                    </TableCell>
                    <TableCell className="capitalize">{m.status.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {m.joined_at
                        ? formatDistanceToNow(new Date(m.joined_at), { addSuffix: true })
                        : "—"}
                    </TableCell>
                    {isPresident ? (
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openEdit({
                              membership_id: m.membership_id,
                              role: m.role,
                              exco_responsibility: m.exco_responsibility,
                              status: m.status,
                            })
                          }
                        >
                          Manage
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-q">Search by username</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-q"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Username"
                  autoComplete="off"
                />
                <Button type="button" variant="secondary" onClick={() => void searchUsers()} disabled={searchingUsers}>
                  {searchingUsers ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Search"}
                </Button>
              </div>
            </div>
            {userHits.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto border border-border-default rounded-sm divide-y divide-border-default">
                {userHits.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-raised ${
                        selectedUserId === u.id ? "bg-surface-raised" : ""
                      }`}
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      @{u.username ?? u.id.slice(0, 8)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as "ambassador" | "exco")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambassador">Ambassador</SelectItem>
                  <SelectItem value="exco">ExCo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteRole === "exco" ? (
              <div className="space-y-2">
                <Label>ExCo responsibility</Label>
                <Select value={inviteExco} onValueChange={setInviteExco}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "content",
                        "marketing",
                        "architect_relations",
                        "data_quality",
                        "community",
                      ] as const
                    ).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {EXCO_LABELS[opt] ?? opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitInvite} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                "Send invite"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambassador">Ambassador</SelectItem>
                  <SelectItem value="exco">ExCo</SelectItem>
                  <SelectItem value="president">President</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editRole === "exco" ? (
              <div className="space-y-2">
                <Label>ExCo responsibility</Label>
                <Select value={editExco} onValueChange={setEditExco}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "content",
                        "marketing",
                        "architect_relations",
                        "data_quality",
                        "community",
                      ] as const
                    ).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {EXCO_LABELS[opt] ?? opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending_review">Pending review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
