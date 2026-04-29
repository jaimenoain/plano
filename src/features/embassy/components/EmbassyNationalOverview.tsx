import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  fetchChapterAmbassadorActivity,
  fetchChapterMembersWithContact,
  fetchChapterMetrics,
  fetchNationalChapterOverview,
} from "@/features/embassy/api/leadership";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

type EmbassyNationalOverviewProps = {
  nationalChapterId: string;
};

function num(v: number | bigint | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "bigint" ? Number(v) : v;
}

export function EmbassyNationalOverview({ nationalChapterId }: EmbassyNationalOverviewProps) {
  const [detailChapterId, setDetailChapterId] = useState<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["embassy-national-overview", nationalChapterId],
    queryFn: () => fetchNationalChapterOverview(nationalChapterId),
    enabled: Boolean(nationalChapterId),
    staleTime: 60_000,
  });

  const metricsQuery = useQuery({
    queryKey: ["embassy-national-local-metrics", detailChapterId, 30],
    queryFn: () => fetchChapterMetrics(detailChapterId!, 30),
    enabled: Boolean(detailChapterId),
    staleTime: 60_000,
  });

  const membersQuery = useQuery({
    queryKey: ["embassy-national-local-members", detailChapterId],
    queryFn: () => fetchChapterMembersWithContact(detailChapterId!),
    enabled: Boolean(detailChapterId),
    staleTime: 60_000,
  });

  const activityQuery = useQuery({
    queryKey: ["embassy-national-local-activity", detailChapterId, 30],
    queryFn: () => fetchChapterAmbassadorActivity(detailChapterId!, 30),
    enabled: Boolean(detailChapterId),
    staleTime: 60_000,
  });

  const detailName = useMemo(() => {
    if (!detailChapterId) return "";
    return overviewQuery.data?.find((r) => r.chapter_id === detailChapterId)?.chapter_name ?? "";
  }, [detailChapterId, overviewQuery.data]);

  if (overviewQuery.isLoading) {
    return (
      <div className="space-y-4" aria-hidden>
        <Skeleton className="h-7 w-64 max-w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2].map((k) => (
            <Skeleton key={k} className="h-36 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (overviewQuery.isError) {
    return (
      <p className="text-sm text-feedback-destructive">
        National overview could not be loaded. Try again shortly.
      </p>
    );
  }

  const rows = overviewQuery.data ?? [];

  if (rows.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">National overview</h2>
        <p className="text-sm text-text-secondary">
          There are no active local chapters under this national chapter yet. When chapters go live, they
          will appear here with health metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">National overview</h2>
        <p className="text-sm text-text-secondary max-w-2xl">
          Read-only snapshot of every active local chapter in your country. Open a chapter to see members
          and recent activity — you cannot change memberships from here.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row.chapter_id}>
            <Card className="border border-border-default rounded-sm p-4 space-y-3 h-full flex flex-col">
              <div className="space-y-1 min-w-0">
                <p className="font-medium text-text-primary truncate">{row.chapter_name}</p>
                <p className="text-sm text-text-secondary">
                  President:{" "}
                  <span className="text-text-primary">
                    {row.president_name?.trim() ? `@${row.president_name}` : "—"}
                  </span>
                </p>
                <p className="text-2xs text-text-disabled uppercase tracking-widest">
                  {num(row.member_count)} member{num(row.member_count) === 1 ? "" : "s"} · last 30 days:{" "}
                  {num(row.edits_last_30d)} edits · {num(row.photos_last_30d)} photos
                </p>
                {row.last_activity_at ? (
                  <p className="text-2xs text-text-disabled">
                    Last activity{" "}
                    {formatDistanceToNow(new Date(row.last_activity_at), { addSuffix: true })}
                  </p>
                ) : (
                  <p className="text-2xs text-text-disabled">No logged chapter activity yet</p>
                )}
              </div>
              <div className="pt-1 mt-auto">
                <Button type="button" size="sm" variant="outline" onClick={() => setDetailChapterId(row.chapter_id)}>
                  View details
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={detailChapterId != null} onOpenChange={(open) => !open && setDetailChapterId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailName || "Local chapter"}</DialogTitle>
          </DialogHeader>
          {detailChapterId ? (
            <div className="space-y-8">
              <section className="space-y-2" aria-labelledby="nat-metrics-heading">
                <h3 id="nat-metrics-heading" className="text-sm font-semibold text-text-primary">
                  Last 30 days
                </h3>
                {metricsQuery.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : metricsQuery.data ? (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-sm border border-border-default p-3">
                      <p className="text-2xs text-text-disabled uppercase tracking-widest">Edits</p>
                      <p className="text-lg font-semibold text-text-primary tabular-nums">
                        {num(metricsQuery.data.total_edits)}
                      </p>
                    </div>
                    <div className="rounded-sm border border-border-default p-3">
                      <p className="text-2xs text-text-disabled uppercase tracking-widest">Photos</p>
                      <p className="text-lg font-semibold text-text-primary tabular-nums">
                        {num(metricsQuery.data.total_photos_added)}
                      </p>
                    </div>
                    <div className="rounded-sm border border-border-default p-3">
                      <p className="text-2xs text-text-disabled uppercase tracking-widest">Visits</p>
                      <p className="text-lg font-semibold text-text-primary tabular-nums">
                        {num(metricsQuery.data.total_building_visits)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">No metrics returned.</p>
                )}
              </section>

              <section className="space-y-2" aria-labelledby="nat-members-heading">
                <h3 id="nat-members-heading" className="text-sm font-semibold text-text-primary">
                  Members
                </h3>
                {membersQuery.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <div className="rounded-sm border border-border-default overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(membersQuery.data ?? []).map((m) => (
                          <TableRow key={m.membership_id}>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarImage src={m.avatar_url || undefined} />
                                  <AvatarFallback>{m.username?.charAt(0).toUpperCase() ?? "?"}</AvatarFallback>
                                </Avatar>
                                <span className="truncate">@{m.username}</span>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{m.role}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal capitalize">
                                {m.status.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>

              <section className="space-y-2" aria-labelledby="nat-activity-heading">
                <h3 id="nat-activity-heading" className="text-sm font-semibold text-text-primary">
                  Activity (30 days)
                </h3>
                {activityQuery.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (activityQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-text-secondary">No per-member activity in this window.</p>
                ) : (
                  <div className="rounded-sm border border-border-default overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Edits</TableHead>
                          <TableHead>Photos</TableHead>
                          <TableHead>Last active</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(activityQuery.data ?? []).map((a) => (
                          <TableRow key={a.user_id}>
                            <TableCell className="truncate max-w-[140px]">@{a.username}</TableCell>
                            <TableCell className="tabular-nums">{num(a.edits_count)}</TableCell>
                            <TableCell className="tabular-nums">{num(a.photos_added)}</TableCell>
                            <TableCell className="text-text-secondary text-sm whitespace-nowrap">
                              {a.last_active_at
                                ? formatDistanceToNow(new Date(a.last_active_at), { addSuffix: true })
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>

              <p className="text-2xs text-text-disabled">
                Admins can edit chapters in{" "}
                <Link to="/admin/ambassadors" className="underline-offset-2 hover:underline text-text-primary">
                  Admin → Ambassadors
                </Link>
                .
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
