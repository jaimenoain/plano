import { useState, useMemo } from "react";
import { type MetaFunction, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ExternalLink, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchPresidentDirectory } from "@/features/admin/api/programme";
import type { PresidentDirectoryRow, ExcoMember } from "@/features/admin/types/programme";

export const meta: MetaFunction = () => [
  { title: "Chapter Presidents | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function relativeDate(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function isInactive(row: PresidentDirectoryRow): boolean {
  if (!row.lastActiveAt) return true;
  const days = (Date.now() - new Date(row.lastActiveAt).getTime()) / 86_400_000;
  return days > 30;
}

const STATUS_LABELS: Record<string, string> = {
  active:   "Active",
  forming:  "Forming",
  inactive: "Inactive",
};

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-feedback-success text-feedback-success-foreground",
  forming:  "bg-feedback-warning text-feedback-warning-foreground",
  inactive: "bg-surface-muted text-text-secondary",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`text-xs font-medium ${STATUS_COLORS[status] ?? "bg-surface-muted text-text-secondary"}`}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function ExcoMemberRow({ member }: { member: ExcoMember }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="h-7 w-7">
        <AvatarImage src={member.avatarUrl ?? undefined} alt={member.username} />
        <AvatarFallback className="text-xs bg-surface-muted text-text-secondary">
          {member.username.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">@{member.username}</p>
        {member.excoResponsibility && (
          <p className="text-xs text-text-secondary truncate capitalize">
            {member.excoResponsibility.replace(/_/g, " ")}
          </p>
        )}
      </div>
    </div>
  );
}

function PresidentPanel({
  row,
  onClose,
}: {
  row: PresidentDirectoryRow;
  onClose: () => void;
}) {
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="sr-only">President detail</SheetTitle>
        </SheetHeader>

        {/* President card */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-14 w-14">
            <AvatarImage src={row.presidentAvatarUrl ?? undefined} alt={row.presidentUsername} />
            <AvatarFallback className="text-lg bg-surface-muted text-text-secondary">
              {row.presidentUsername.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold text-text-primary">@{row.presidentUsername}</p>
            <p className="text-sm text-text-secondary">President · since {formatDate(row.memberSince)}</p>
          </div>
        </div>

        {/* Chapter summary */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-primary flex items-center justify-between">
              {row.chapterName}
              <span className="uppercase text-xs text-text-secondary font-normal tracking-wide">
                {row.countryCode}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <StatusBadge status={row.chapterStatus} />
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-xs text-text-secondary">Members</p>
                <p className="text-xl font-bold text-text-primary">{row.memberCount}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Edits (30d)</p>
                <p className="text-xl font-bold text-text-primary">{row.edits30d}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Open applications</p>
                <p className="text-xl font-bold text-text-primary">{row.openApplications}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Last active</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">{relativeDate(row.lastActiveAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ExCo members */}
        {row.excoMembers.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ExCo Members</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-border-default">
              {row.excoMembers.map((m) => (
                <ExcoMemberRow key={m.userId} member={m} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button asChild variant="default" className="w-full justify-start gap-2">
            <Link to={`/admin/ambassadors/${row.chapterId}`}>
              <ExternalLink className="h-4 w-4" />
              Manage chapter
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled
            title="Available in Phase 4 — Broadcasts"
          >
            <Mail className="h-4 w-4" />
            Send message
            <span className="ml-auto text-xs text-text-secondary">Phase 4</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

type ActivityFilter = "all" | "active" | "inactive";

function useFilteredRows(
  rows: PresidentDirectoryRow[],
  search: string,
  country: string,
  status: string,
  activity: ActivityFilter,
) {
  return useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      if (q && !r.presidentUsername.toLowerCase().includes(q) && !r.chapterName.toLowerCase().includes(q)) {
        return false;
      }
      if (country !== "all" && r.countryCode !== country) return false;
      if (status !== "all" && r.chapterStatus !== status) return false;
      if (activity === "active" && isInactive(r)) return false;
      if (activity === "inactive" && !isInactive(r)) return false;
      return true;
    });
  }, [rows, search, country, status, activity]);
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-9 w-56" />
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-xs" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgrammePresidents() {
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["admin", "president-directory"],
    queryFn: fetchPresidentDirectory,
    staleTime: 5 * 60 * 1000,
  });

  const [search, setSearch]   = useState("");
  const [country, setCountry] = useState("all");
  const [status, setStatus]   = useState("all");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const [selected, setSelected] = useState<PresidentDirectoryRow | null>(null);

  const countries = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach((r) => seen.add(r.countryCode));
    return Array.from(seen).sort();
  }, [rows]);

  const filtered = useFilteredRows(rows, search, country, status, activity);

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-surface-default flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-feedback-destructive text-center max-w-lg">
          {error instanceof Error ? error.message : "Failed to load president directory."}
        </p>
        <p className="text-sm text-text-secondary text-center max-w-md">
          Apply migration <code className="font-mono text-xs">20271122000000_president_directory_rpc.sql</code> in
          the Supabase SQL Editor, then reload.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <h1 className="text-4xl font-bold tracking-tight text-text-primary">Chapter Presidents</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
          <Input
            placeholder="Search by president or chapter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map((cc) => (
              <SelectItem key={cc} value={cc}>{cc.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="forming">Forming</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={activity} onValueChange={(v) => setActivity(v as ActivityFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All activity</SelectItem>
            <SelectItem value="active">Active (&lt;30 days)</SelectItem>
            <SelectItem value="inactive">Inactive (&gt;30 days)</SelectItem>
          </SelectContent>
        </Select>

        {filtered.length !== rows.length && (
          <span className="text-sm text-text-secondary">
            {filtered.length} of {rows.length}
          </span>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-secondary text-sm">
              {rows.length === 0 ? "No chapter presidents found." : "No results match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary tracking-wide uppercase">President</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary tracking-wide uppercase">Chapter</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary tracking-wide uppercase">Country</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary tracking-wide uppercase">Status</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-text-secondary tracking-wide uppercase">Members</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-text-secondary tracking-wide uppercase">Last Active</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-text-secondary tracking-wide uppercase">Edits (30d)</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-text-secondary tracking-wide uppercase">Open Apps</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.presidentUserId}
                      className="border-b border-border-default last:border-b-0 hover:bg-surface-muted cursor-pointer transition-colors"
                      onClick={() => setSelected(row)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={row.presidentAvatarUrl ?? undefined} alt={row.presidentUsername} />
                            <AvatarFallback className="text-xs bg-surface-muted text-text-secondary">
                              {row.presidentUsername.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-text-primary">@{row.presidentUsername}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-primary">{row.chapterName}</td>
                      <td className="py-3 px-4 text-text-secondary uppercase text-xs tracking-wide">{row.countryCode}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={row.chapterStatus} />
                      </td>
                      <td className="py-3 px-4 text-right text-text-primary">{row.memberCount}</td>
                      <td className={`py-3 px-4 text-right text-xs ${isInactive(row) ? "text-feedback-warning" : "text-text-secondary"}`}>
                        {relativeDate(row.lastActiveAt)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-text-primary">{row.edits30d}</td>
                      <td className="py-3 px-4 text-right">
                        {row.openApplications > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-feedback-warning text-feedback-warning-foreground text-xs font-medium px-1.5">
                            {row.openApplications}
                          </span>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <PresidentPanel row={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
