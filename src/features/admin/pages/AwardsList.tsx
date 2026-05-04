import { useState } from "react";
import { Link, type MetaFunction } from "react-router";
import { Loader2, Plus, Pencil, Search } from "lucide-react";
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

export const meta: MetaFunction = () => [{ title: "Awards | Plano Admin" }];

const frequencyLabel: Record<string, string> = {
  annual: "Annual",
  biennial: "Biennial",
  ad_hoc: "Ad-hoc",
  other: "Other",
};

export default function AwardsList() {
  const [search, setSearch] = useState("");
  const { data: awards, isLoading } = useAwards();
  const updateAward = useUpdateAward();

  const filtered = (awards ?? []).filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()),
  );

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
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Awards</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-secondary" />
            <Input
              placeholder="Search awards…"
              className="pl-8 max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button asChild>
            <Link to="/admin/awards/new">
              <Plus className="mr-2 h-4 w-4" />
              New Award
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-sm border border-border-default bg-surface-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Awarding Body</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead className="text-center">Editions</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-text-secondary">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading…
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-text-secondary">
                  {search ? "No awards match your search." : "No awards yet. Create one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((award) => (
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
                  <TableCell className="text-center text-sm text-text-secondary">
                    {award.editionCount ?? 0}
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
                      <Link to={`/admin/awards/${award.id}/edit`}>
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
