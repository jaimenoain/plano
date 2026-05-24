import { useEffect, useState } from "react";
import { Link, type MetaFunction } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Merge, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { personQueryKey } from "@/features/credits/api/people";
import {
  adminMergePeople,
  searchAdminPeople,
  updateAdminPersonClaimStatus,
  type AdminPersonListItem,
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
import {
  AdminPageHeader,
  AdminSectionLabel,
  adminTableHeadClass,
} from "@/features/admin/components/admin-ui";
import { cn } from "@/lib/utils";

export const meta: MetaFunction = () => [
  { title: "People | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

const CLAIM_LABELS: Record<EntityClaimStatus, string> = {
  unclaimed: "Unclaimed",
  claimed: "Claimed",
  verified: "Verified",
};

function PersonMergeCard({
  person,
  kind,
}: {
  person: AdminPersonListItem;
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
          <Badge variant="outline">{CLAIM_LABELS[person.claimStatus]}</Badge>
        </div>
        <CardTitle className="mt-2 break-words leading-tight">{person.name}</CardTitle>
        <CardDescription className="font-mono text-xs">/{person.slug}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-text-secondary">
        <div>Credits: {person.creditCount}</div>
        <div className="break-all text-xs">ID: {person.id}</div>
      </CardContent>
    </Card>
  );
}

export default function AdminPeople() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  const [masterSearch, setMasterSearch] = useState("");
  const [dupSearch, setDupSearch] = useState("");
  const [masterResults, setMasterResults] = useState<AdminPersonListItem[]>([]);
  const [dupResults, setDupResults] = useState<AdminPersonListItem[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [loadingDup, setLoadingDup] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<AdminPersonListItem | null>(null);
  const [selectedSource, setSelectedSource] = useState<AdminPersonListItem | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const { data: rows = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-people-search", debounced],
    queryFn: () => searchAdminPeople(debounced),
    enabled: debounced.trim().length >= 2,
  });

  const searchPeoplePicklist = async (
    query: string,
    setResults: (v: AdminPersonListItem[]) => void,
    setLoading: (v: boolean) => void,
  ) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const list = await searchAdminPeople(query);
      setResults(list);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => searchPeoplePicklist(masterSearch, setMasterResults, setLoadingMaster), 400);
    return () => window.clearTimeout(t);
  }, [masterSearch]);

  useEffect(() => {
    const t = window.setTimeout(() => searchPeoplePicklist(dupSearch, setDupResults, setLoadingDup), 400);
    return () => window.clearTimeout(t);
  }, [dupSearch]);

  const handleClaimStatusChange = async (personId: string, slug: string, next: EntityClaimStatus) => {
    setStatusSavingId(personId);
    try {
      await updateAdminPersonClaimStatus(personId, next);
      toast.success("Claim status updated");
      await refetch();
      await queryClient.invalidateQueries({ queryKey: personQueryKey(slug) });
    } catch {
      toast.error("Could not update claim status");
    } finally {
      setStatusSavingId(null);
    }
  };

  const startMergeFromRow = (person: AdminPersonListItem) => {
    setSelectedSource(person);
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
      await adminMergePeople(selectedSource.id, selectedTarget.id);
      toast.success(`Merged “${selectedSource.name}” into “${selectedTarget.name}”`);
      setSelectedSource(null);
      setSelectedTarget(null);
      setDupSearch("");
      setMasterSearch("");
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["person"] });
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
        .from("people")
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
      const mapped: AdminPersonListItem[] = list.map((p) => ({
        id: p.id as string,
        name: p.name as string,
        slug: p.slug as string,
        claimStatus: p.claim_status as EntityClaimStatus,
        creditCount: 0,
      }));
      const full = await searchAdminPeople(nameQuery);
      const byId = new Map(full.map((x) => [x.id, x]));
      const a = byId.get(mapped[0].id) ?? mapped[0];
      const b = byId.get(mapped[1].id) ?? mapped[1];
      setSelectedTarget(a);
      setSelectedSource(b);
    } catch {
      toast.error("Could not load pair");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <AdminPageHeader
        eyebrow="Credits"
        title="People"
        description="Search people, adjust claim status, or merge duplicates (credits move to the target; source row is removed)."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <AdminSectionLabel>1. Select target (keep)</AdminSectionLabel>
          <div className="relative">
            <Input
              placeholder="Search person to keep…"
              value={masterSearch}
              onChange={(e) => setMasterSearch(e.target.value)}
              aria-label="Search target person"
            />
            {loadingMaster && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-text-secondary" />
            )}
            {masterSearch && !selectedTarget && masterResults.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border-default bg-surface-overlay shadow-lg">
                {masterResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-surface-muted"
                    onClick={() => {
                      setSelectedTarget(p);
                      setMasterSearch("");
                    }}
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="whitespace-nowrap text-xs text-text-secondary">{p.slug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedTarget ? (
            <div className="relative group">
              <PersonMergeCard person={selectedTarget} kind="target" />
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
          <AdminSectionLabel>2. Select source (remove)</AdminSectionLabel>
          <div className="relative">
            <Input
              placeholder="Search duplicate to remove…"
              value={dupSearch}
              onChange={(e) => setDupSearch(e.target.value)}
              aria-label="Search source person"
            />
            {loadingDup && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-text-secondary" />
            )}
            {dupSearch && !selectedSource && dupResults.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border-default bg-surface-overlay shadow-lg">
                {dupResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-surface-muted"
                    onClick={() => {
                      setSelectedSource(p);
                      setDupSearch("");
                    }}
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="whitespace-nowrap text-xs text-text-secondary">{p.slug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedSource ? (
            <div className="relative group">
              <PersonMergeCard person={selectedSource} kind="source" />
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
              className="gap-2 rounded-sm"
              variant="destructive"
            >
              {isMerging ? <Loader2 className="h-5 w-5 animate-spin" /> : <Merge className="h-5 w-5" />}
              Merge people
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Merge these people?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-text-secondary">
                  <p>
                    All credits on <strong>{selectedSource?.name}</strong> will point to{" "}
                    <strong>{selectedTarget?.name}</strong>. The source profile will be deleted.
                  </p>
                  {(selectedSource?.claimStatus === "claimed" || selectedSource?.claimStatus === "verified") && (
                    <p className="text-feedback-warning">
                      The source row has an active claim — confirm this is intentional.
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={runMerge} className="bg-feedback-destructive text-feedback-destructive-foreground hover:bg-feedback-destructive/90">
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
            <AdminSectionLabel>Directory search</AdminSectionLabel>
            <p className="text-sm text-text-secondary">Type at least two characters to search by name or slug.</p>
          </div>
          <div className="relative w-full max-w-md">
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search people directory"
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
                <TableHead className={adminTableHeadClass}>Name</TableHead>
                <TableHead className={adminTableHeadClass}>Profile</TableHead>
                <TableHead className={adminTableHeadClass}>Credits</TableHead>
                <TableHead className={adminTableHeadClass}>Claim status</TableHead>
                <TableHead className={cn(adminTableHeadClass, "text-right")}>Merge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debounced.trim().length < 2 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-text-secondary">
                    Enter a search to list people.
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-text-secondary" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-text-secondary">
                    No matches.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Link
                        to={`/person/${p.slug}`}
                        className="text-text-primary underline-offset-4 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        /{p.slug}
                      </Link>
                    </TableCell>
                    <TableCell>{p.creditCount}</TableCell>
                    <TableCell>
                      <Select
                        value={p.claimStatus}
                        onValueChange={(v) =>
                          handleClaimStatusChange(p.id, p.slug, v as EntityClaimStatus)
                        }
                        disabled={statusSavingId === p.id}
                      >
                        <SelectTrigger className="w-36" aria-label={`Claim status for ${p.name}`}>
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
                      <Button type="button" size="sm" variant="outline" onClick={() => startMergeFromRow(p)}>
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
