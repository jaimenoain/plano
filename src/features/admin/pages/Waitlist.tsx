import { useMemo, useState } from "react";
import type { MetaFunction } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchWaitlistSignups, type WaitlistSignupRow } from "@/features/admin/api/waitlist";
import {
  AdminPageHeader,
  AdminEmptyState,
  AdminErrorState,
  adminTableHeadClass,
} from "@/features/admin/components/admin-ui";

export const meta: MetaFunction = () => [
  { title: "Waiting List | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function exportCsv(rows: WaitlistSignupRow[]): void {
  const headers = ["Email", "Name", "Joined"];
  const lines = rows.map((r) =>
    [
      r.email,
      `"${(r.fullName ?? "").replace(/"/g, '""')}"`,
      new Date(r.createdAt).toISOString().slice(0, 10),
    ].join(","),
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "waitlist-signups.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Waitlist() {
  const [search, setSearch] = useState("");

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin", "waitlist-signups"],
    queryFn: fetchWaitlistSignups,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (r) => r.email.toLowerCase().includes(q) || (r.fullName ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="Community"
        title="Waiting List"
        description={`${data.length} total signup${data.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Input
              placeholder="Search email or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search waiting list"
              className="w-64"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(filtered)}
              disabled={filtered.length === 0}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </div>
      ) : error ? (
        <AdminErrorState
          message={error instanceof Error ? error.message : "Failed to load waiting list."}
        />
      ) : data.length === 0 ? (
        <AdminEmptyState
          title="No signups yet"
          description="New waiting-list signups will appear here."
        />
      ) : filtered.length === 0 ? (
        <AdminEmptyState title="No matches" description="Try a different search." />
      ) : (
        <div className="rounded-sm border border-border-default bg-surface-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={adminTableHeadClass}>Email</TableHead>
                <TableHead className={adminTableHeadClass}>Name</TableHead>
                <TableHead className={adminTableHeadClass}>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.email}</TableCell>
                  <TableCell>{r.fullName ?? "—"}</TableCell>
                  <TableCell className="text-text-secondary">{formatDate(r.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
