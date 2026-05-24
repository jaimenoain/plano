import { useEffect, useMemo, useState } from "react";
import { type MetaFunction, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Json } from "@/integrations/supabase/types";
import {
  AdminPageHeader,
  AdminFormLabel,
  AdminEmptyState,
  adminTableHeadClass,
} from "@/features/admin/components/admin-ui";
import { cn } from "@/lib/utils";

export const meta: MetaFunction = () => [{ title: "Building Audit | Plano" }];

const CREDIT_AUDIT_ACTIONS = ["credit_added", "credit_status_changed"] as const;

interface AuditLogView {
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  table_name?: string;
  operation?: string;
}

type BuildingAuditLogRow = {
  id: string;
  created_at: string | null;
  table_name: string;
  operation: string;
  old_data: Json | null;
  new_data: Json | null;
  buildings: { name: string } | null;
  profiles: { username: string | null } | null;
};

type CreditAuditLogRow = {
  id: string;
  created_at: string | null;
  admin_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  details: Json | null;
};

type MergedLog =
  | { kind: "building"; row: BuildingAuditLogRow }
  | {
      kind: "credit_audit";
      row: CreditAuditLogRow;
      actorUsername: string | null;
      buildingDisplay: string;
    };

function jsonObjectOrNull(value: Json | null | undefined): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

async function fetchAuditTimeline(buildingFilterId: string | null): Promise<MergedLog[]> {
  if (!buildingFilterId) {
    const { data, error } = await supabase
      .from("building_audit_logs")
      .select(
        `
          *,
          buildings (name),
          profiles (username)
        `,
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data ?? []).map((row) => ({ kind: "building" as const, row: row as BuildingAuditLogRow }));
  }

  const [balRes, creditRes, buildingRes] = await Promise.all([
    supabase
      .from("building_audit_logs")
      .select(
        `
          *,
          buildings (name),
          profiles (username)
        `,
      )
      .eq("building_id", buildingFilterId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("admin_audit_logs")
      .select("*")
      .in("action_type", [...CREDIT_AUDIT_ACTIONS])
      .order("created_at", { ascending: false })
      .limit(400),
    supabase.from("buildings").select("name").eq("id", buildingFilterId).maybeSingle(),
  ]);

  if (balRes.error) throw balRes.error;
  if (creditRes.error) throw creditRes.error;
  if (buildingRes.error) throw buildingRes.error;

  const buildingDisplay = buildingRes.data?.name ?? "Unknown";

  const filteredCredit = (creditRes.data ?? []).filter((r) => {
    const d = jsonObjectOrNull((r as CreditAuditLogRow).details);
    const bid = d?.building_id;
    return typeof bid === "string" && bid === buildingFilterId;
  });

  const actorIds = [...new Set(filteredCredit.map((r) => (r as CreditAuditLogRow).admin_id))];
  const usernameById: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", actorIds);
    if (pErr) throw pErr;
    for (const p of profs ?? []) {
      const id = p.id as string;
      const u = p.username as string | null;
      if (u) usernameById[id] = u;
    }
  }

  const merged: MergedLog[] = [
    ...(balRes.data ?? []).map((row) => ({ kind: "building" as const, row: row as BuildingAuditLogRow })),
    ...filteredCredit.map((row) => {
      const r = row as CreditAuditLogRow;
      return {
        kind: "credit_audit" as const,
        row: r,
        actorUsername: usernameById[r.admin_id] ?? null,
        buildingDisplay,
      };
    }),
  ];

  merged.sort((a, b) => {
    const ta = new Date(a.kind === "building" ? a.row.created_at ?? 0 : a.row.created_at ?? 0).getTime();
    const tb = new Date(b.kind === "building" ? b.row.created_at ?? 0 : b.row.created_at ?? 0).getTime();
    return tb - ta;
  });

  return merged;
}

export default function BuildingAudit() {
  const [searchParams, setSearchParams] = useSearchParams();
  const buildingParam = searchParams.get("building")?.trim() ?? "";
  const buildingFilterId = z.string().uuid().safeParse(buildingParam).success ? buildingParam : null;

  const [draftBuildingId, setDraftBuildingId] = useState(buildingParam);

  useEffect(() => {
    setDraftBuildingId(buildingParam);
  }, [buildingParam]);

  const { data: mergedLogs, isLoading, refetch } = useQuery({
    queryKey: ["building_audit_timeline", buildingFilterId ?? "all"],
    queryFn: () => fetchAuditTimeline(buildingFilterId),
  });

  const [revertingId, setRevertingId] = useState<string | null>(null);

  const applyBuildingFilter = () => {
    const t = draftBuildingId.trim();
    if (!t) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("building");
        return next;
      });
      return;
    }
    if (!z.string().uuid().safeParse(t).success) {
      toast.error("Enter a valid building UUID");
      return;
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("building", t);
      return next;
    });
  };

  const handleRevert = async (logId: string) => {
    try {
      setRevertingId(logId);
      const { error } = await supabase.rpc("revert_building_change", {
        log_id: logId,
      });

      if (error) throw error;

      toast.success("Change reverted successfully");
      refetch();
    } catch (_error) {
      toast.error("Failed to revert change");
    } finally {
      setRevertingId(null);
    }
  };

  const renderBuildingDiff = (log: AuditLogView) => {
    const oldD = log.old_data ?? {};
    const newD = log.new_data ?? {};

    if (log.table_name === "buildings" && log.operation === "UPDATE") {
      const keys = Array.from(new Set([...Object.keys(oldD), ...Object.keys(newD)]));
      const changes = keys.filter((k) => JSON.stringify(oldD[k]) !== JSON.stringify(newD[k]));

      return (
        <div className="text-xs space-y-1">
          {changes.slice(0, 5).map((k) => (
            <div key={k}>
              <span className="font-semibold">{k}:</span>{" "}
              <span className="text-feedback-destructive line-through">
                {String(oldD[k] ?? "").slice(0, 20)}
              </span>
              {" -> "}
              <span className="text-feedback-success">{String(newD[k] ?? "").slice(0, 20)}</span>
            </div>
          ))}
          {changes.length > 5 && <div>...and {changes.length - 5} more</div>}
        </div>
      );
    }
    if (log.table_name === "building_styles") {
      return (
        <div className="text-xs">
          {log.operation === "INSERT" ? (
            <span className="text-feedback-success">
              Added Style (ID: {String(newD.style_id ?? "").slice(0, 8)})
            </span>
          ) : (
            <span className="text-feedback-destructive">
              Removed Style (ID: {String(oldD.style_id ?? "").slice(0, 8)})
            </span>
          )}
        </div>
      );
    }
    return (
      <span className="text-xs text-text-secondary">
        {log.operation} on {log.table_name}
      </span>
    );
  };

  const renderCreditAuditSummary = (item: Extract<MergedLog, { kind: "credit_audit" }>) => {
    const d = jsonObjectOrNull(item.row.details);
    if (item.row.action_type === "credit_status_changed") {
      const oldV = d?.old_value != null ? String(d.old_value) : "—";
      const newV = d?.new_value != null ? String(d.new_value) : "—";
      return (
        <div className="text-xs space-y-1">
          <span className="font-semibold text-text-primary">Credit status</span>
          <div>
            <span className="text-feedback-destructive line-through">{oldV}</span>
            <span className="text-text-secondary"> → </span>
            <span className="text-feedback-success">{newV}</span>
          </div>
          <div className="text-text-secondary">Credit ID: {item.row.target_id?.slice(0, 8) ?? "—"}…</div>
        </div>
      );
    }
    const role = d?.role != null ? String(d.role) : "—";
    return (
      <div className="text-xs space-y-1">
        <span className="font-semibold text-text-primary">Credit added</span>
        <div className="text-text-secondary">Role: {role}</div>
        <div className="text-text-secondary">Credit ID: {item.row.target_id?.slice(0, 8) ?? "—"}…</div>
      </div>
    );
  };

  const pageDescription = useMemo(() => {
    if (buildingFilterId) {
      return "Building edits plus credit events for the selected building (set via ?building= UUID).";
    }
    return "Track and revert changes made to buildings. Add ?building= UUID to include credit audit events for one building.";
  }, [buildingFilterId]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  const logs = mergedLogs ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Moderation" title="Building audit" description={pageDescription} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <AdminFormLabel htmlFor="building-audit-filter">Building UUID filter</AdminFormLabel>
          <Input
            id="building-audit-filter"
            value={draftBuildingId}
            onChange={(e) => setDraftBuildingId(e.target.value)}
            placeholder="Paste building UUID…"
            className="max-w-xl rounded-sm font-mono text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" className="rounded-sm" onClick={applyBuildingFilter}>
            Apply
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-sm"
            onClick={() => {
              setDraftBuildingId("");
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("building");
                return next;
              });
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {logs.length === 0 ? (
        <AdminEmptyState
          title="No audit logs found"
          description={
            buildingFilterId
              ? "No building or credit events match this UUID."
              : "Changes will appear here as editors update catalogue records."
          }
        />
      ) : (
      <div className="rounded-sm border border-border-default bg-surface-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={adminTableHeadClass}>Date</TableHead>
              <TableHead className={adminTableHeadClass}>User</TableHead>
              <TableHead className={adminTableHeadClass}>Building</TableHead>
              <TableHead className={adminTableHeadClass}>Change</TableHead>
              <TableHead className={cn(adminTableHeadClass, "text-right")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((entry) =>
              entry.kind === "building" ? (
                <TableRow key={`b-${entry.row.id}`}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(entry.row.created_at ?? ""), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>{entry.row.profiles?.username || "System"}</TableCell>
                  <TableCell>{entry.row.buildings?.name || "Unknown"}</TableCell>
                  <TableCell className="max-w-[300px]">
                    {renderBuildingDiff({
                      table_name: entry.row.table_name,
                      operation: entry.row.operation,
                      old_data: jsonObjectOrNull(entry.row.old_data),
                      new_data: jsonObjectOrNull(entry.row.new_data),
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Revert
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Revert</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to revert this change? This will restore the data to its previous
                            state.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 flex justify-end gap-2">
                          <Button
                            variant="destructive"
                            onClick={() => handleRevert(entry.row.id)}
                            disabled={revertingId === entry.row.id}
                          >
                            {revertingId === entry.row.id && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Confirm Revert
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={`c-${entry.row.id}`}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(entry.row.created_at ?? ""), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>{entry.actorUsername || "—"}</TableCell>
                  <TableCell>{entry.buildingDisplay}</TableCell>
                  <TableCell className="max-w-[300px]">{renderCreditAuditSummary(entry)}</TableCell>
                  <TableCell className="text-right text-xs text-text-secondary">—</TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
