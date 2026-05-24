import { useMemo, useState } from "react";
import { Link, type MetaFunction } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminAmbassadorLocalityCoverage,
  fetchAdminAmbassadorProgramStats,
  fetchNationalChapterOverview,
  type AdminAmbassadorLocalityCoverageRow,
} from "@/features/admin/api/ambassadorCoverage";
import type { Json, Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe2,
  Loader2,
  Shield,
  Users,
  Crown,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronRight,
  Plus,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { ambassadorChapterCreateSchema } from "@/lib/validations/ambassador";
import {
  AdminPageHeader,
  AdminSectionLabel,
  AdminFormLabel,
  AdminEmptyState,
  AdminErrorState,
  adminTableHeadClass,
  adminHairlineTabsListClass,
  adminHairlineTabTriggerClass,
} from "@/features/admin/components/admin-ui";
import { cn } from "@/lib/utils";

export const meta: MetaFunction = () => [
  { title: "Ambassador management | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

type ChapterRow = Database["public"]["Tables"]["ambassador_chapters"]["Row"];

type CountryBreakdownRow = { country_code: string; active_count: number };

function parseMembersByCountry(raw: Json | null | undefined): CountryBreakdownRow[] {
  if (!Array.isArray(raw)) return [];
  const out: CountryBreakdownRow[] = [];
  for (const item of raw) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const o = item as Record<string, unknown>;
      if (typeof o.country_code === "string" && typeof o.active_count === "number") {
        out.push({ country_code: o.country_code, active_count: o.active_count });
      }
    }
  }
  return out;
}

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card className="border border-border-default rounded-sm p-4 space-y-1">
      <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">{label}</p>
      <p className="text-2xl font-semibold text-text-primary tabular-nums">{value}</p>
      {sub && <p className="text-xs text-text-secondary">{sub}</p>}
    </Card>
  );
}

function NationalChapterCard({ chapter }: { chapter: ChapterRow }) {
  const [expanded, setExpanded] = useState(false);

  const overviewQuery = useQuery({
    queryKey: ["national-chapter-overview", chapter.id],
    queryFn: () => fetchNationalChapterOverview(chapter.id),
    enabled: expanded,
    staleTime: 60_000,
  });

  const localChapters = overviewQuery.data ?? [];

  return (
    <div className="rounded-sm border border-border-default bg-surface-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted transition-colors"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-text-secondary shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-text-secondary shrink-0" />
        )}
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
          <span className="font-medium text-text-primary">{chapter.name}</span>
          <span className="text-xs text-text-disabled">{chapter.country_code}</span>
          <Badge variant="secondary" className="capitalize text-2xs font-normal">{chapter.status}</Badge>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          asChild
          onClick={(e) => e.stopPropagation()}
        >
          <Link to={`/admin/ambassadors/${chapter.id}`}>Open</Link>
        </Button>
      </button>

      {expanded && (
        <div className="border-t border-border-default">
          {overviewQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
            </div>
          ) : localChapters.length === 0 ? (
            <p className="text-sm text-text-secondary px-4 py-4">No local chapters yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={adminTableHeadClass}>Local chapter</TableHead>
                  <TableHead className={adminTableHeadClass}>President</TableHead>
                  <TableHead className={cn(adminTableHeadClass, "text-right")}>Members</TableHead>
                  <TableHead className={cn(adminTableHeadClass, "text-right")}>Photos (30d)</TableHead>
                  <TableHead className={cn(adminTableHeadClass, "text-right")}>Edits (30d)</TableHead>
                  <TableHead className={adminTableHeadClass}>Last activity</TableHead>
                  <TableHead className={cn(adminTableHeadClass, "w-[80px]")} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {localChapters.map((lc) => (
                  <TableRow key={lc.chapter_id}>
                    <TableCell className="font-medium text-text-primary text-sm">{lc.chapter_name}</TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {lc.president_name ? (
                        <span className="flex items-center gap-1">
                          <Crown className="h-3 w-3 text-text-disabled" />
                          {lc.president_name}
                        </span>
                      ) : (
                        <span className="text-text-disabled">Vacant</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-text-secondary">{lc.member_count}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-text-secondary">{lc.photos_last_30d}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-text-secondary">{lc.edits_last_30d}</TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {lc.last_activity_at
                        ? new Date(lc.last_activity_at).toLocaleDateString()
                        : <span className="text-text-disabled">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/admin/ambassadors/${lc.chapter_id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}

export default function AmbassadorCoverage() {
  const queryClient = useQueryClient();

  // Gap tab state
  const [gapCountryFilter, setGapCountryFilter] = useState("");
  const [gapMinBuildings, setGapMinBuildings] = useState(10);
  const [gapDialogOpen, setGapDialogOpen] = useState(false);
  const [gapRow, setGapRow] = useState<AdminAmbassadorLocalityCoverageRow | null>(null);
  const [gapName, setGapName] = useState("");
  const [gapParentChapterId, setGapParentChapterId] = useState<string | null>(null);
  const [gapMaxAmbassadors, setGapMaxAmbassadors] = useState(20);
  const [gapSaving, setGapSaving] = useState(false);
  const [gapNationalChapters, setGapNationalChapters] = useState<ChapterRow[]>([]);

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

  const nationalChaptersQuery = useQuery({
    queryKey: ["admin-ambassador-national-chapters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_chapters")
        .select("*")
        .eq("type", "national")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ChapterRow[];
    },
    staleTime: 120_000,
  });

  const countryRows = useMemo(
    () => parseMembersByCountry(statsQuery.data?.members_by_country),
    [statsQuery.data?.members_by_country],
  );

  const opportunityLocalities = useMemo(
    () =>
      (coverageQuery.data ?? [])
        .filter((r) => !r.chapter_id && r.buildings_count >= 20)
        .sort((a, b) => b.buildings_count - a.buildings_count),
    [coverageQuery.data],
  );

  const coveredLocalities = useMemo(
    () => (coverageQuery.data ?? []).filter((r) => r.chapter_id),
    [coverageQuery.data],
  );

  // Gap tab computed values
  const allGapCountries = useMemo(
    () =>
      Array.from(
        new Map(
          (coverageQuery.data ?? [])
            .filter((r) => !r.chapter_id && r.buildings_count > 10)
            .map((r) => [r.country_code, r.country]),
        ).entries(),
      ).sort((a, b) => a[1].localeCompare(b[1])),
    [coverageQuery.data],
  );

  const gapLocalities = useMemo(
    () =>
      (coverageQuery.data ?? [])
        .filter((r) => !r.chapter_id && r.buildings_count > 10)
        .filter((r) => !gapCountryFilter || r.country_code === gapCountryFilter)
        .filter((r) => r.buildings_count >= gapMinBuildings)
        .sort((a, b) => b.buildings_count - a.buildings_count),
    [coverageQuery.data, gapCountryFilter, gapMinBuildings],
  );

  const openGapDialog = async (row: AdminAmbassadorLocalityCoverageRow) => {
    setGapRow(row);
    setGapName(`Plano ${row.city}`);
    setGapParentChapterId(null);
    setGapMaxAmbassadors(20);
    const { data } = await supabase
      .from("ambassador_chapters")
      .select("*")
      .eq("type", "national")
      .eq("country_code", row.country_code)
      .order("name");
    setGapNationalChapters(data ?? []);
    setGapDialogOpen(true);
  };

  const handleGapCreate = async () => {
    if (!gapRow) return;
    if (!gapParentChapterId) {
      toast.error("Select a national parent chapter first");
      return;
    }
    const parsed = ambassadorChapterCreateSchema.safeParse({
      name: gapName,
      type: "local",
      country_code: gapRow.country_code,
      locality_id: gapRow.locality_id,
      parent_chapter_id: gapParentChapterId,
      max_ambassadors: gapMaxAmbassadors,
      status: "forming",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    setGapSaving(true);
    try {
      const { data: existing } = await supabase
        .from("ambassador_chapters")
        .select("id")
        .eq("type", "local")
        .eq("locality_id", gapRow.locality_id)
        .limit(1);
      if (existing && existing.length > 0) {
        toast.error("A local chapter for this locality already exists");
        return;
      }
      const { error } = await supabase.from("ambassador_chapters").insert({
        name: parsed.data.name,
        type: "local",
        country_code: parsed.data.country_code,
        locality_id: parsed.data.locality_id,
        parent_chapter_id: parsed.data.parent_chapter_id,
        max_ambassadors: parsed.data.max_ambassadors,
        status: "forming",
      });
      if (error) throw error;
      toast.success(`Forming chapter "${parsed.data.name}" created`);
      setGapDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-ambassador-locality-coverage"] });
    } catch {
      toast.error("Could not create chapter");
    } finally {
      setGapSaving(false);
    }
  };

  const loading = statsQuery.isLoading;

  const coverageErrorMessage =
    "Could not load coverage data. Ensure migration 20270870400000_ambassador_phase5_national_overview_admin_coverage.sql has been applied, then reload.";

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Ambassadors"
        title="Ambassador management"
        description="Program health, chapter coverage, and growth opportunities."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Globe2 className="hidden h-7 w-7 text-text-secondary sm:block shrink-0" aria-hidden />
            <Button variant="outline" type="button" asChild>
              <Link to="/admin/ambassadors">
                <Shield className="h-4 w-4 mr-2" aria-hidden />
                Chapters
              </Link>
            </Button>
            <Button variant="outline" type="button" asChild>
              <Link to="/admin/ambassadors/applications">Applications</Link>
            </Button>
          </div>
        }
      />

      {(statsQuery.error || coverageQuery.error) && <AdminErrorState message={coverageErrorMessage} />}

      {/* Program stats */}
      <section className="space-y-4">
        <AdminSectionLabel>Program summary</AdminSectionLabel>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-24 w-full" />)}
          </div>
        ) : statsQuery.data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active members" value={statsQuery.data.total_active_memberships} />
            <StatCard label="Pending applications" value={statsQuery.data.pending_applications} />
            <StatCard
              label="Active chapters"
              value={statsQuery.data.chapters_active}
              sub={`${statsQuery.data.chapters_forming} forming · ${statsQuery.data.chapters_inactive} inactive`}
            />
            <Card className="border border-border-default rounded-sm p-4 space-y-2">
              <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Top countries</p>
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

      {/* Tabs */}
      <Tabs defaultValue="gaps">
        <TabsList className={cn("mb-4", adminHairlineTabsListClass)}>
          <TabsTrigger value="gaps" className={cn(adminHairlineTabTriggerClass, "inline-flex items-center gap-1.5")}>
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            Coverage gaps
            {gapLocalities.length > 0 && (
              <span className="tabular-nums text-feedback-warning">({gapLocalities.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="chapters"
            className={cn(adminHairlineTabTriggerClass, "inline-flex items-center gap-1.5")}
          >
            <Shield className="h-3.5 w-3.5 shrink-0" />
            National chapters
            {nationalChaptersQuery.data && (
              <span className="tabular-nums text-text-disabled">({nationalChaptersQuery.data.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="coverage" className={cn(adminHairlineTabTriggerClass, "inline-flex items-center gap-1.5")}>
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            All localities
          </TabsTrigger>
        </TabsList>

        {/* ── COVERAGE GAPS ── */}
        <TabsContent value="gaps" className="pt-4 space-y-4">
          <div className="flex items-start gap-3 rounded-sm bg-surface-muted border border-border-default p-3">
            <TrendingUp className="h-4 w-4 text-text-secondary mt-0.5 shrink-0" />
            <p className="text-sm text-text-secondary">
              Cities with more than 10 buildings and no chapter. Sorted by gap score (building count) — highest impact first.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-text-disabled" aria-hidden />
              <span className="text-xs font-medium text-text-secondary">Filter</span>
            </div>
            <Select
              value={gapCountryFilter || "__all__"}
              onValueChange={(v) => setGapCountryFilter(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-8 w-44 text-sm">
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All countries</SelectItem>
                {allGapCountries.map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name} ({code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Min buildings:</span>
              <Input
                type="number"
                min={1}
                max={9999}
                value={gapMinBuildings}
                onChange={(e) => setGapMinBuildings(Number.parseInt(e.target.value, 10) || 1)}
                className="h-8 w-20 text-sm"
              />
            </div>
          </div>

          {coverageQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-text-disabled" />
            </div>
          ) : gapLocalities.length === 0 ? (
            <AdminEmptyState
              title="No coverage gaps match the current filters."
              description="Adjust country or minimum building count."
            />
          ) : (
            <div className="rounded-lg border border-border-default bg-surface-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={adminTableHeadClass}>City</TableHead>
                    <TableHead className={adminTableHeadClass}>Country</TableHead>
                    <TableHead className={cn(adminTableHeadClass, "text-right")}>Buildings</TableHead>
                    <TableHead className={cn(adminTableHeadClass, "text-right")}>Gap score</TableHead>
                    <TableHead className={cn(adminTableHeadClass, "w-[180px]")} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gapLocalities.map((row) => (
                    <TableRow key={row.locality_id}>
                      <TableCell className="font-medium text-text-primary">{row.city}</TableCell>
                      <TableCell className="text-text-secondary">
                        {row.country}
                        <span className="text-text-disabled ml-1">({row.country_code})</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{row.buildings_count}</TableCell>
                      <TableCell className="text-right tabular-nums text-text-secondary">{row.buildings_count}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void openGapDialog(row)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Create forming chapter
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── NATIONAL CHAPTERS ── */}
        <TabsContent value="chapters" className="pt-4 space-y-3">
          {nationalChaptersQuery.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((k) => <Skeleton key={k} className="h-14 w-full" />)}
            </div>
          ) : (nationalChaptersQuery.data ?? []).length === 0 ? (
            <AdminEmptyState title="No national chapters yet." />
          ) : (
            <>
              <p className="text-xs text-text-secondary">
                Expand a national chapter to see its local chapters, president, and 30-day activity.
              </p>
              {(nationalChaptersQuery.data ?? []).map((ch) => (
                <NationalChapterCard key={ch.id} chapter={ch} />
              ))}
            </>
          )}
        </TabsContent>

        {/* ── ALL LOCALITIES ── */}
        <TabsContent value="coverage" className="pt-4 space-y-4">
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {coveredLocalities.length} localities covered
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {opportunityLocalities.length} opportunities
            </span>
          </div>
          {coverageQuery.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-text-disabled" aria-hidden />
            </div>
          ) : (
            <div className="rounded-lg border border-border-default bg-surface-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={adminTableHeadClass}>City</TableHead>
                    <TableHead className={adminTableHeadClass}>Country</TableHead>
                    <TableHead className={cn(adminTableHeadClass, "text-right")}>Buildings</TableHead>
                    <TableHead className={adminTableHeadClass}>Chapter</TableHead>
                    <TableHead className={cn(adminTableHeadClass, "text-right")}>
                      <span className="flex items-center justify-end gap-1">
                        <Users className="h-3.5 w-3.5" aria-hidden />
                        Members
                      </span>
                    </TableHead>
                    <TableHead className={cn(adminTableHeadClass, "w-[100px]")} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(coverageQuery.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <AdminEmptyState title="No localities in the database yet." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    (coverageQuery.data ?? []).map((row) => {
                      const isOpportunity = !row.chapter_id && row.buildings_count >= 20;
                      return (
                        <TableRow
                          key={row.locality_id}
                          className={isOpportunity ? "bg-surface-muted" : undefined}
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
                                <span className="text-text-primary text-sm">{row.chapter_name}</span>
                                {row.chapter_status && (
                                  <Badge variant="secondary" className="font-normal capitalize text-2xs">
                                    {row.chapter_status}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-text-disabled text-sm">None</span>
                                {isOpportunity && (
                                  <Badge variant="outline" className="font-normal text-2xs">Opportunity</Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-text-secondary">
                            {row.chapter_id ? row.chapter_member_count : "—"}
                          </TableCell>
                          <TableCell>
                            {row.chapter_id && (
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/admin/ambassadors/${row.chapter_id}`}>Open</Link>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Gap chapter creation dialog */}
      <Dialog open={gapDialogOpen} onOpenChange={(o) => { if (!o) setGapDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create forming chapter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {gapRow && (
              <p className="text-sm text-text-secondary">
                Creating a forming chapter for{" "}
                <span className="font-medium text-text-primary">{gapRow.city}, {gapRow.country}</span>
                {" "}({gapRow.buildings_count} buildings in catalogue).
              </p>
            )}
            <div className="space-y-2">
              <AdminFormLabel htmlFor="gap-name">Chapter name</AdminFormLabel>
              <Input
                id="gap-name"
                value={gapName}
                onChange={(e) => setGapName(e.target.value)}
                placeholder="Plano City Name"
              />
            </div>
            <div className="space-y-2">
              <AdminFormLabel>National parent chapter</AdminFormLabel>
              {gapNationalChapters.length === 0 ? (
                <p className="text-sm text-text-disabled">
                  No national chapter found for {gapRow?.country_code}. Create one first at{" "}
                  <Link to="/admin/ambassadors" className="underline text-text-secondary hover:text-text-primary">
                    Ambassador chapters
                  </Link>.
                </p>
              ) : (
                <Select
                  value={gapParentChapterId ?? ""}
                  onValueChange={(v) => setGapParentChapterId(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select national chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {gapNationalChapters.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <AdminFormLabel htmlFor="gap-max">Max ambassadors</AdminFormLabel>
              <Input
                id="gap-max"
                type="number"
                min={1}
                max={500}
                value={gapMaxAmbassadors}
                onChange={(e) => setGapMaxAmbassadors(Number.parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-text-disabled">
              <Badge variant="secondary" className="font-normal">local</Badge>
              <Badge variant="secondary" className="font-normal">forming</Badge>
              <span>Type and status are pre-set.</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGapDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={gapSaving || gapNationalChapters.length === 0}
              onClick={() => void handleGapCreate()}
            >
              {gapSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
