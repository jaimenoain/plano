import { useMemo } from "react";
import { Link, type MetaFunction } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminAmbassadorLocalityCoverage,
  fetchAdminAmbassadorProgramStats,
} from "@/features/admin/api/ambassadorCoverage";
import type { Json } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Globe2, Loader2, Shield } from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "Ambassador coverage | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

type CountryBreakdownRow = {
  country_code: string;
  active_count: number;
};

function parseMembersByCountry(raw: Json | null | undefined): CountryBreakdownRow[] {
  if (raw == null || !Array.isArray(raw)) return [];
  const out: CountryBreakdownRow[] = [];
  for (const item of raw) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const o = item as Record<string, unknown>;
      const cc = o.country_code;
      const ac = o.active_count;
      if (typeof cc === "string" && typeof ac === "number") {
        out.push({ country_code: cc, active_count: ac });
      }
    }
  }
  return out;
}

export default function AmbassadorCoverage() {
  const statsQuery = useQuery({
    queryKey: ["admin-ambassador-program-stats"],
    queryFn: fetchAdminAmbassadorProgramStats,
    staleTime: 60_000,
  });

  const coverageQuery = useQuery({
    queryKey: ["admin-ambassador-locality-coverage"],
    queryFn: fetchAdminAmbassadorLocalityCoverage,
    staleTime: 60_000,
  });

  const countryRows = useMemo(
    () => parseMembersByCountry(statsQuery.data?.members_by_country),
    [statsQuery.data?.members_by_country],
  );

  const loading = statsQuery.isLoading || coverageQuery.isLoading;
  const error = statsQuery.error ?? coverageQuery.error;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Globe2 className="h-8 w-8 text-text-secondary shrink-0" aria-hidden />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">Ambassador coverage</h1>
            <p className="text-sm text-text-secondary mt-1">
              Locality building volume versus chapter presence. Use this to prioritise new chapters.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" asChild>
            <Link to="/admin/ambassadors">
              <Shield className="h-4 w-4 mr-2" aria-hidden />
              Chapters
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-feedback-destructive">
          Could not load coverage data. If this is the first deploy of Phase 5, apply migration{" "}
          <code className="text-2xs bg-surface-muted px-1 rounded-sm">20270870400000_ambassador_phase5_national_overview_admin_coverage.sql</code>{" "}
          in the Supabase SQL Editor, then reload.
        </p>
      ) : null}

      <section className="space-y-4" aria-labelledby="amb-cov-stats-heading">
        <h2 id="amb-cov-stats-heading" className="text-lg font-semibold text-text-primary">
          Program summary
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((k) => (
              <Skeleton key={k} className="h-28 w-full" />
            ))}
          </div>
        ) : statsQuery.data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-border-default rounded-sm p-4 space-y-1">
              <p className="text-2xs text-text-disabled uppercase tracking-widest">Active members</p>
              <p className="text-2xl font-semibold text-text-primary tabular-nums">
                {statsQuery.data.total_active_memberships}
              </p>
            </Card>
            <Card className="border border-border-default rounded-sm p-4 space-y-1">
              <p className="text-2xs text-text-disabled uppercase tracking-widest">Pending applications</p>
              <p className="text-2xl font-semibold text-text-primary tabular-nums">
                {statsQuery.data.pending_applications}
              </p>
            </Card>
            <Card className="border border-border-default rounded-sm p-4 space-y-2">
              <p className="text-2xs text-text-disabled uppercase tracking-widest">Chapters by status</p>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>
                  Active:{" "}
                  <span className="font-medium text-text-primary tabular-nums">
                    {statsQuery.data.chapters_active}
                  </span>
                </li>
                <li>
                  Forming:{" "}
                  <span className="font-medium text-text-primary tabular-nums">
                    {statsQuery.data.chapters_forming}
                  </span>
                </li>
                <li>
                  Inactive:{" "}
                  <span className="font-medium text-text-primary tabular-nums">
                    {statsQuery.data.chapters_inactive}
                  </span>
                </li>
              </ul>
            </Card>
            <Card className="border border-border-default rounded-sm p-4 space-y-2">
              <p className="text-2xs text-text-disabled uppercase tracking-widest">Top countries</p>
              {countryRows.length === 0 ? (
                <p className="text-sm text-text-secondary">No active memberships yet.</p>
              ) : (
                <ul className="text-sm text-text-secondary space-y-1 max-h-28 overflow-y-auto">
                  {countryRows.slice(0, 8).map((r) => (
                    <li key={r.country_code} className="flex justify-between gap-2">
                      <span>{r.country_code}</span>
                      <span className="font-medium text-text-primary tabular-nums">{r.active_count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        ) : null}
      </section>

      <section className="space-y-4" aria-labelledby="amb-cov-localities-heading">
        <h2 id="amb-cov-localities-heading" className="text-lg font-semibold text-text-primary">
          Localities
        </h2>
        {coverageQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-text-disabled" aria-hidden />
          </div>
        ) : (
          <div className="rounded-lg border border-border-default bg-surface-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Buildings</TableHead>
                  <TableHead>Chapter</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(coverageQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-text-secondary py-12">
                      No localities in the database yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (coverageQuery.data ?? []).map((row) => {
                    const opportunity = !row.chapter_id && row.buildings_count >= 20;
                    return (
                      <TableRow
                        key={row.locality_id}
                        className={opportunity ? "bg-surface-muted" : undefined}
                      >
                        <TableCell className="font-medium text-text-primary">{row.city}</TableCell>
                        <TableCell className="text-text-secondary">
                          {row.country}
                          <span className="text-text-disabled ml-1">({row.country_code})</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.buildings_count}</TableCell>
                        <TableCell>
                          {row.chapter_id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-text-primary">{row.chapter_name}</span>
                              {row.chapter_status ? (
                                <Badge variant="secondary" className="font-normal capitalize">
                                  {row.chapter_status}
                                </Badge>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-text-secondary">None</span>
                          )}
                          {opportunity ? (
                            <Badge variant="outline" className="ml-2 font-normal text-2xs">
                              Opportunity
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.chapter_id ? row.chapter_member_count : "—"}
                        </TableCell>
                        <TableCell>
                          {row.chapter_id ? (
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/admin/ambassadors/${row.chapter_id}`}>Open</Link>
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
