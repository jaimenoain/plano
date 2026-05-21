import { useState, useMemo } from "react";
import { type MetaFunction, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, ArrowUp, ArrowDown, Download, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { fetchChapterPerformanceRanking } from "@/features/admin/api/programme";
import type { ChapterRankingRow } from "@/features/admin/types/programme";

export const meta: MetaFunction = () => [
  { title: "Chapter Rankings | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

// ─── Types ─────────────────────────────────────────────────────────────────

type SortKey = keyof Omit<ChapterRankingRow, "chapterId" | "lastActivityDate" | "chapterType">;
type SortDir = "asc" | "desc";

const PERIOD_OPTIONS: { label: string; value: string }[] = [
  { label: "Last 7 days",  value: "7"    },
  { label: "Last 30 days", value: "30"   },
  { label: "Last 90 days", value: "90"   },
  { label: "All time",     value: "null" },
];

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "chapterName",          label: "Chapter",          align: "left"  },
  { key: "countryCode",          label: "Country",          align: "left"  },
  { key: "memberCount",          label: "Members",          align: "right" },
  { key: "edits",                label: "Edits",            align: "right" },
  { key: "photosAdded",          label: "Photos",           align: "right" },
  { key: "newMembers",           label: "New members",      align: "right" },
  { key: "applicationsApproved", label: "Apps approved",    align: "right" },
  { key: "score",                label: "Score",            align: "right" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function exportCsv(rows: (ChapterRankingRow & { rank: number })[]): void {
  const headers = ["Rank", "Chapter", "Country", "Type", "Members", "Edits", "Photos", "New members", "Apps approved", "Last activity", "Score"];
  const lines = rows.map((r) =>
    [
      r.rank,
      `"${r.chapterName.replace(/"/g, '""')}"`,
      r.countryCode.toUpperCase(),
      r.chapterType,
      r.memberCount,
      r.edits,
      r.photosAdded,
      r.newMembers,
      r.applicationsApproved,
      r.lastActivityDate ? new Date(r.lastActivityDate).toISOString().slice(0, 10) : "",
      r.score,
    ].join(",")
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chapter-rankings.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sort icon ─────────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="h-3 w-3 ml-1 text-text-tertiary inline-block" />;
  return sortDir === "asc"
    ? <ArrowUp   className="h-3 w-3 ml-1 text-text-primary inline-block" />
    : <ArrowDown className="h-3 w-3 ml-1 text-text-primary inline-block" />;
}

// ─── Loading skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-[480px]" />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ProgrammeRankings() {
  const [periodValue, setPeriodValue] = useState<string>("30");
  const [sortKey, setSortKey]         = useState<SortKey>("score");
  const [sortDir, setSortDir]         = useState<SortDir>("desc");

  const periodDays = periodValue === "null" ? null : Number(periodValue);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "chapter-rankings", periodDays],
    queryFn: () => fetchChapterPerformanceRanking(periodDays),
    staleTime: 5 * 60 * 1000,
  });

  const sorted = useMemo(() => {
    if (!data) return [];
    const rows = [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av ?? "").toLowerCase();
      const bs = String(bv ?? "").toLowerCase();
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [data, sortKey, sortDir]);

  const top10pctThreshold = sorted.length > 0 ? Math.ceil(sorted.length * 0.1) : 0;

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (isLoading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen bg-surface-default flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-feedback-destructive text-center max-w-lg">
          {error instanceof Error ? error.message : "Failed to load chapter rankings."}
        </p>
        <p className="text-sm text-text-secondary text-center max-w-md">
          Apply migration{" "}
          <code className="font-mono text-xs">20271136000000_chapter_performance_ranking_rpc.sql</code>{" "}
          in the Supabase SQL Editor, then reload.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Chapter Rankings</h1>
        <div className="flex items-center gap-3">
          <Select value={periodValue} onValueChange={setPeriodValue}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(sorted)}
            disabled={sorted.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">
            {sorted.length} chapter{sorted.length !== 1 ? "s" : ""} · Score = edits × 1 + photos × 2 + new members × 5
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-12">No chapters found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-text-secondary tracking-wide uppercase w-10">#</th>
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={`px-4 py-2.5 text-xs font-medium text-text-secondary tracking-wide uppercase cursor-pointer select-none hover:text-text-primary ${col.align === "right" ? "text-right" : "text-left"}`}
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}
                        <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                      </th>
                    ))}
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-text-secondary tracking-wide uppercase">Last active</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const isTopTier = row.rank <= top10pctThreshold;
                    const isInactive = row.edits === 0 && row.photosAdded === 0 && row.newMembers === 0;

                    return (
                      <tr
                        key={row.chapterId}
                        className={`border-b border-border-default last:border-b-0 transition-colors ${
                          isTopTier
                            ? "bg-surface-muted hover:bg-surface-subtle"
                            : isInactive
                            ? "opacity-40 hover:opacity-60"
                            : "hover:bg-surface-muted"
                        }`}
                      >
                        <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                          {isTopTier ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-primary text-text-inverse text-xs font-bold">
                              {row.rank}
                            </span>
                          ) : (
                            row.rank
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/ambassadors/${row.chapterId}`}
                              className="font-medium text-text-primary hover:underline"
                            >
                              {row.chapterName}
                            </Link>
                            {row.chapterType === "national" && (
                              <Badge variant="secondary" className="text-xs py-0 px-1.5">National</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary uppercase text-xs">{row.countryCode}</td>
                        <td className="px-4 py-3 text-right text-text-primary">{row.memberCount}</td>
                        <td className="px-4 py-3 text-right text-text-primary">{row.edits}</td>
                        <td className="px-4 py-3 text-right text-text-primary">{row.photosAdded}</td>
                        <td className="px-4 py-3 text-right text-text-primary">{row.newMembers}</td>
                        <td className="px-4 py-3 text-right text-text-primary">{row.applicationsApproved}</td>
                        <td className="px-4 py-3 text-right font-semibold text-text-primary">{row.score}</td>
                        <td className="px-4 py-3 text-right text-text-secondary text-xs whitespace-nowrap">{formatDate(row.lastActivityDate)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/admin/ambassadors/${row.chapterId}`}
                            className="text-text-secondary hover:text-text-primary"
                            aria-label={`Manage ${row.chapterName}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
