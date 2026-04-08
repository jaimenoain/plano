import { useEffect, useState } from "react";
import { Link, type MetaFunction } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2, Merge, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { companyQueryKey, getCompanyStewardsWithProfiles } from "@/features/credits/api/companies";
import type { CompanyStewardWithProfile } from "@/features/credits/types";
import {
  adminMergeCompanies,
  searchAdminCompanies,
  updateAdminCompanyClaimStatus,
  type AdminCompanyListItem,
  type EntityClaimStatus,
} from "@/features/admin/api/entity-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const meta: MetaFunction = () => [
  { title: "Companies | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

const CLAIM_LABELS: Record<EntityClaimStatus, string> = {
  unclaimed: "Unclaimed",
  claimed: "Claimed",
  verified: "Verified",
};

function CompanyMergeCard({
  company,
  kind,
}: {
  company: AdminCompanyListItem;
  kind: "target" | "source";
}) {
  const isTarget = kind === "target";
  return (
    <Card
      className={
        isTarget
          ? "border-2 border-border-default bg-surface-card"
          : "border-2 border-feedback-destructive/30 bg-surface-muted/30"
      }
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Badge variant={isTarget ? "default" : "destructive"}>
            {isTarget ? "KEEP (target)" : "REMOVE (source)"}
          </Badge>
          <Badge variant="outline">{CLAIM_LABELS[company.claimStatus]}</Badge>
        </div>
        <CardTitle className="mt-2 break-words leading-tight">{company.name}</CardTitle>
        <CardDescription className="font-mono text-xs">/{company.slug}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-text-secondary">
        <div>Credits: {company.creditCount}</div>
        <div>Stewards: {company.stewardCount}</div>
        <div className="break-all text-xs">ID: {company.id}</div>
      </CardContent>
    </Card>
  );
}

function StewardList({ companyId, slug }: { companyId: string; slug: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-company-stewards", companyId],
    queryFn: () => getCompanyStewardsWithProfiles(companyId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading stewards…
      </div>
    );
  }

  if (error || !data?.length) {
    return <p className="py-2 text-sm text-text-secondary">No stewards or could not load.</p>;
  }

  return (
    <ul className="space-y-2 py-2">
      {data.map((s: CompanyStewardWithProfile) => (
        <li key={s.id} className="flex items-center gap-3 text-sm">
          <Avatar className="h-8 w-8">
            <AvatarImage src={s.avatarUrl ?? undefined} alt="" />
            <AvatarFallback>{(s.username ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{s.username ?? s.userId}</div>
            <div className="text-xs text-text-secondary capitalize">{s.role}</div>
          </div>
        </li>
      ))}
      <li>
        <Link
          to={`/company/${slug}`}
          className="text-xs text-brand-primary underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Open company page
        </Link>
      </li>
    </ul>
  );
}

export default function AdminCompanies() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  const [masterSearch, setMasterSearch] = useState("");
  const [dupSearch, setDupSearch] = useState("");
  const [masterResults, setMasterResults] = useState<AdminCompanyListItem[]>([]);
  const [dupResults, setDupResults] = useState<AdminCompanyListItem[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [loadingDup, setLoadingDup] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<AdminCompanyListItem | null>(null);
  const [selectedSource, setSelectedSource] = useState<AdminCompanyListItem | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [openStewardsId, setOpenStewardsId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const { data: rows = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-companies-search", debounced],
    queryFn: () => searchAdminCompanies(debounced),
    enabled: debounced.trim().length >= 2,
  });

  const searchCompanyPicklist = async (
    query: string,
    setResults: (v: AdminCompanyListItem[]) => void,
    setLoading: (v: boolean) => void,
  ) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const list = await searchAdminCompanies(query);
      setResults(list);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => searchCompanyPicklist(masterSearch, setMasterResults, setLoadingMaster), 400);
    return () => window.clearTimeout(t);
  }, [masterSearch]);

  useEffect(() => {
    const t = window.setTimeout(() => searchCompanyPicklist(dupSearch, setDupResults, setLoadingDup), 400);
    return () => window.clearTimeout(t);
  }, [dupSearch]);

  const handleClaimStatusChange = async (companyId: string, slug: string, next: EntityClaimStatus) => {
    setStatusSavingId(companyId);
    try {
      await updateAdminCompanyClaimStatus(companyId, next);
      toast.success("Claim status updated");
      await refetch();
      await queryClient.invalidateQueries({ queryKey: companyQueryKey(slug) });
    } catch {
      toast.error("Could not update claim status");
    } finally {
      setStatusSavingId(null);
    }
  };

  const startMergeFromRow = (c: AdminCompanyListItem) => {
    setSelectedSource(c);
    setDupSearch("");
    setDupResults([]);
    setSelectedTarget(null);
    setMasterSearch("");
    setMasterResults([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const runMerge = async () => {
    if (!selectedTarget || !selectedSource) return;
    setIsMerging(true);
    try {
      await adminMergeCompanies(selectedSource.id, selectedTarget.id);
      toast.success(`Merged “${selectedSource.name}” into “${selectedTarget.name}”`);
      setSelectedSource(null);
      setSelectedTarget(null);
      setDupSearch("");
      setMasterSearch("");
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["company"] });
      await queryClient.invalidateQueries({ queryKey: ["company-stewards"] });
      await queryClient.invalidateQueries({ queryKey: ["building-credits"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Merge failed. Is the migration applied?");
    } finally {
      setIsMerging(false);
    }
  };

  const loadPairFromSearch = async (nameQuery: string) => {
    try {
      const { data, error: qErr } = await supabase
        .from("companies")
        .select("id, name, slug, claim_status")
        .ilike("name", `%${nameQuery}%`)
        .order("name")
        .limit(2);

      if (qErr) throw qErr;
      const list = data ?? [];
      if (list.length < 2) {
        toast.message("Need at least two name matches to compare");
        return;
      }
      const full = await searchAdminCompanies(nameQuery);
      const byId = new Map(full.map((x) => [x.id, x]));
      const mapRow = (r: (typeof list)[0]): AdminCompanyListItem => {
        const hit = byId.get(r.id as string);
        if (hit) return hit;
        return {
          id: r.id as string,
          name: r.name as string,
          slug: r.slug as string,
          claimStatus: r.claim_status as EntityClaimStatus,
          creditCount: 0,
          stewardCount: 0,
        };
      };
      setSelectedTarget(mapRow(list[0]));
      setSelectedSource(mapRow(list[1]));
    } catch {
      toast.error("Could not load pair");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Companies</h1>
        <p className="text-sm text-text-secondary">
          Search companies, adjust claim status, inspect stewards, or merge duplicates (credits and stewards consolidate
          into the target; source company is removed).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">1. Select target (keep)</h2>
          <div className="relative">
            <Input
              placeholder="Search company to keep…"
              value={masterSearch}
              onChange={(e) => setMasterSearch(e.target.value)}
              aria-label="Search target company"
            />
            {loadingMaster && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-text-secondary" />
            )}
            {masterSearch && !selectedTarget && masterResults.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border-default bg-surface-overlay shadow-lg">
                {masterResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-brand-secondary"
                    onClick={() => {
                      setSelectedTarget(c);
                      setMasterSearch("");
                    }}
                  >
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="whitespace-nowrap text-xs text-text-secondary">{c.slug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedTarget ? (
            <div className="relative group">
              <CompanyMergeCard company={selectedTarget} kind="target" />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => setSelectedTarget(null)}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-border-default bg-surface-muted/30 text-text-secondary">
              No target selected
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">2. Select source (remove)</h2>
          <div className="relative">
            <Input
              placeholder="Search duplicate to remove…"
              value={dupSearch}
              onChange={(e) => setDupSearch(e.target.value)}
              aria-label="Search source company"
            />
            {loadingDup && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-text-secondary" />
            )}
            {dupSearch && !selectedSource && dupResults.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border-default bg-surface-overlay shadow-lg">
                {dupResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-brand-secondary"
                    onClick={() => {
                      setSelectedSource(c);
                      setDupSearch("");
                    }}
                  >
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="whitespace-nowrap text-xs text-text-secondary">{c.slug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedSource ? (
            <div className="relative group">
              <CompanyMergeCard company={selectedSource} kind="source" />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => setSelectedSource(null)}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-border-default bg-surface-muted/30 text-text-secondary">
              No source selected
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 py-4 sm:flex-row">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="lg"
              disabled={
                !selectedTarget || !selectedSource || isMerging || selectedTarget.id === selectedSource.id
              }
              className="gap-2 bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
            >
              {isMerging ? <Loader2 className="h-5 w-5 animate-spin" /> : <Merge className="h-5 w-5" />}
              Merge companies
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Merge these companies?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-text-secondary">
                  <p>
                    Credits and steward rows on <strong>{selectedSource?.name}</strong> will consolidate into{" "}
                    <strong>{selectedTarget?.name}</strong>. The source company and its pending tokens/requests will be
                    removed.
                  </p>
                  {selectedSource != null && selectedSource.stewardCount > 0 && (
                    <p className="text-feedback-warning">
                      The source company has stewards — they will be merged into the target where possible.
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={runMerge}
                className="bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
              >
                Confirm merge
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button type="button" variant="outline" size="sm" onClick={() => loadPairFromSearch(masterSearch || dupSearch)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Load first two name matches
        </Button>
      </div>

      <div className="space-y-4 border-t border-border-default pt-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Directory search</h2>
            <p className="text-sm text-text-secondary">Type at least two characters to search by name or slug.</p>
          </div>
          <div className="relative w-full max-w-md">
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search companies directory"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-text-secondary" />
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-feedback-destructive" role="alert">
            Could not load results.
          </p>
        )}

        <div className="rounded-sm border border-border-default bg-surface-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Stewards</TableHead>
                <TableHead>Claim status</TableHead>
                <TableHead className="text-right">Merge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debounced.trim().length < 2 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-text-secondary">
                    Enter a search to list companies.
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-text-secondary" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-text-secondary">
                    No matches.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Link
                        to={`/company/${c.slug}`}
                        className="text-brand-primary underline-offset-4 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        /{c.slug}
                      </Link>
                    </TableCell>
                    <TableCell>{c.creditCount}</TableCell>
                    <TableCell>
                      <Collapsible
                        open={openStewardsId === c.id}
                        onOpenChange={(open) => setOpenStewardsId(open ? c.id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 px-2 text-text-primary">
                            {openStewardsId === c.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            View ({c.stewardCount})
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-l-2 border-border-default pl-3">
                          <StewardList companyId={c.id} slug={c.slug} />
                        </CollapsibleContent>
                      </Collapsible>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={c.claimStatus}
                        onValueChange={(v) =>
                          handleClaimStatusChange(c.id, c.slug, v as EntityClaimStatus)
                        }
                        disabled={statusSavingId === c.id}
                      >
                        <SelectTrigger className="w-36" aria-label={`Claim status for ${c.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(CLAIM_LABELS) as EntityClaimStatus[]).map((k) => (
                            <SelectItem key={k} value={k}>
                              {CLAIM_LABELS[k]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => startMergeFromRow(c)}>
                        Merge
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
