import { useState } from "react";
import { Link, type MetaFunction } from "react-router";
import { Loader2, Plus, Pencil, Search, ArrowUpDown, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAwards, useUpdateAward } from "@/features/awards/hooks/useAwards";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminPageHeader,
  AdminEmptyState,
  adminTableHeadClass,
} from "@/features/admin/components/admin-ui";
import { cn } from "@/lib/utils";

export const meta: MetaFunction = () => [{ title: "Awards | Plano Admin" }];

const frequencyLabel: Record<string, string> = {
  annual: "Annual",
  biennial: "Biennial",
  ad_hoc: "Ad-hoc",
  other: "Other",
};

export default function AwardsList() {
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: "name" | "wikidata"; direction: "asc" | "desc" }>({
    key: "wikidata",
    direction: "desc",
  });
  const { data: awards, isLoading } = useAwards();
  const updateAward = useUpdateAward();

  const filtered = (awards ?? []).filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortConfig.key === "name") {
      return sortConfig.direction === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
    const aSitelinks = a.wikidataSitelinks ?? -1;
    const bSitelinks = b.wikidataSitelinks ?? -1;
    if (aSitelinks !== bSitelinks) {
      return sortConfig.direction === "asc" ? aSitelinks - bSitelinks : bSitelinks - aSitelinks;
    }
    return a.name.localeCompare(b.name);
  });

  const toggleSort = (key: "name" | "wikidata") => {
    if (sortConfig.key === key) {
      setSortConfig({ key, direction: sortConfig.direction === "asc" ? "desc" : "asc" });
    } else {
      setSortConfig({ key, direction: key === "name" ? "asc" : "desc" });
    }
  };

  const handleToggleActive = (awardId: string, current: boolean) => {
    updateAward.mutate(
      { awardId, payload: { is_active: !current } },
      {
        onSuccess: () => toast.success(current ? "Award deactivated" : "Award activated"),
        onError: () => toast.error("Failed to update"),
      },
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Awards"
        title="Awards"
        description="Catalogue of architecture awards, editions, and claim status."
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-secondary" aria-hidden />
              <Input
                placeholder="Search awards…"
                className="pl-8 max-w-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search awards"
              />
            </div>
            <Button asChild>
              <Link to="/admin/awards/new">
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                New award
              </Link>
            </Button>
          </>
        }
      />

      <div className="rounded-sm border border-border-default bg-surface-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={adminTableHeadClass}>
                <Button
                  variant="ghost"
                  onClick={() => toggleSort("name")}
                  className="-ml-4 h-8 data-[active=true]:text-text-primary"
                  data-active={sortConfig.key === "name"}
                >
                  Name
                  <ArrowUpDown className="ml-2 h-3 w-3" aria-hidden />
                </Button>
              </TableHead>
              <TableHead className={adminTableHeadClass}>Awarding body</TableHead>
              <TableHead className={adminTableHeadClass}>Frequency</TableHead>
              <TableHead className={adminTableHeadClass}>
                <Button
                  variant="ghost"
                  onClick={() => toggleSort("wikidata")}
                  className="-ml-4 h-8 data-[active=true]:text-text-primary"
                  data-active={sortConfig.key === "wikidata"}
                >
                  Wikidata
                  <ArrowUpDown className="ml-2 h-3 w-3" aria-hidden />
                </Button>
              </TableHead>
              <TableHead className={cn(adminTableHeadClass, "text-center")}>Editions</TableHead>
              <TableHead className={adminTableHeadClass}>Claim</TableHead>
              <TableHead className={cn(adminTableHeadClass, "text-center")}>Active</TableHead>
              <TableHead className={cn(adminTableHeadClass, "text-right")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-text-secondary">
                  <p className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    Loading…
                  </p>
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <AdminEmptyState
                    title={search ? "No awards match your search" : "No awards yet"}
                    description={search ? undefined : "Create one to get started."}
                  />
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((award) => (
                <TableRow key={award.id}>
                  <TableCell>
                    <Link
                      to={`/admin/awards/${award.id}`}
                      className="font-medium text-sm text-text-primary hover:underline underline-offset-4"
                    >
                      {award.name}
                    </Link>
                    {award.country && (
                      <span className="ml-2 text-xs text-text-secondary">{award.country}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {award.awardingBodyCompany ? (
                      <Link
                        to={`/company/${award.awardingBodyCompany.slug}`}
                        className="hover:underline underline-offset-4"
                      >
                        {award.awardingBodyCompany.name}
                      </Link>
                    ) : (
                      award.awardingBodyName ?? <span className="opacity-40">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{frequencyLabel[award.frequency] ?? award.frequency}</Badge>
                  </TableCell>
                  <TableCell>
                    {award.wikidataQid ? (
                      award.wikidataSitelinks !== null && award.wikidataSitelinks !== undefined ? (
                        <Badge variant="secondary">{award.wikidataSitelinks} wikis</Badge>
                      ) : (
                        <span className="text-sm text-text-secondary">—</span>
                      )
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center text-sm text-text-secondary">
                    {award.editionCount ?? 0}
                  </TableCell>
                  <TableCell>
                    {award.claimStatus === "unclaimed" ? (
                      <span className="text-xs text-text-secondary opacity-50">—</span>
                    ) : (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "gap-1 text-2xs font-bold uppercase tracking-[0.15em] border-none h-auto",
                          award.claimStatus === "verified"
                            ? "bg-feedback-success/15 text-feedback-success"
                            : "bg-brand-primary/10 text-brand-primary",
                        )}
                      >
                        <Shield className="h-2.5 w-2.5" aria-hidden />
                        {award.claimStatus}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={award.isActive}
                      onCheckedChange={() => handleToggleActive(award.id, award.isActive)}
                      className="data-[state=checked]:bg-feedback-success"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" asChild>
                      <Link to={`/admin/awards/${award.id}/edit`} aria-label={`Edit ${award.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
