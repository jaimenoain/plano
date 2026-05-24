import { useState, useEffect } from "react";
import { Link, type MetaFunction } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Scale } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Database, Json } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchOpenCompanyClaimDisputesForAdmin,
  resolveCompanyClaimDispute,
  type OpenCompanyClaimDisputeRow,
} from "@/features/admin/api/entity-management";
import {
  AdminPageHeader,
  AdminEmptyState,
  adminTableHeadClass,
} from "@/features/admin/components/admin-ui";
import { cn } from "@/lib/utils";

type ArchitectVerificationNotifInsert =
  Database["public"]["Tables"]["notifications"]["Insert"] & {
    architect_id: string;
    metadata: Json;
  };

interface ArchitectClaimRow {
  id: string;
  user_id: string;
  architect_id: string;
  status: "pending" | "verified" | "rejected";
  proof_email: string;
  created_at: string;
  resolved_at: string | null;
  user: {
    username: string | null;
    avatar_url: string | null;
  };
  architect: {
    name: string;
    type: string;
  };
}

export const meta: MetaFunction = () => [
  { title: "Entity claims | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function EntityClaims() {
  const queryClient = useQueryClient();
  const [claims, setClaims] = useState<ArchitectClaimRow[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const [processingArchitectId, setProcessingArchitectId] = useState<string | null>(null);
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(null);

  const {
    data: disputes = [],
    isLoading: disputesLoading,
    error: disputesError,
  } = useQuery({
    queryKey: ["admin-open-company-claim-disputes"],
    queryFn: fetchOpenCompanyClaimDisputesForAdmin,
  });

  useEffect(() => {
    void fetchArchitectClaims();
  }, []);

  const fetchArchitectClaims = async () => {
    setClaimsLoading(true);
    try {
      const { data, error } = await supabase
        .from("architect_claims")
        .select(
          `
          *,
          user:user_id(username, avatar_url)
        `,
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const raw = (data ?? []) as Array<
        Omit<ArchitectClaimRow, "architect" | "user"> & {
          user: ArchitectClaimRow["user"] | ArchitectClaimRow["user"][];
        }
      >;

      const ids = [...new Set(raw.map((r) => r.architect_id))];
      const [peopleRes, companiesRes] = await Promise.all([
        ids.length > 0
          ? supabase.from("people").select("id, name").in("id", ids)
          : Promise.resolve({ data: [] as { id: string; name: string }[] | null }),
        ids.length > 0
          ? supabase.from("companies").select("id, name").in("id", ids)
          : Promise.resolve({ data: [] as { id: string; name: string }[] | null }),
      ]);

      const nameById = new Map<string, { name: string; type: string }>();
      peopleRes.data?.forEach((p) => nameById.set(p.id, { name: p.name, type: "person" }));
      companiesRes.data?.forEach((c) => nameById.set(c.id, { name: c.name, type: "company" }));

      const mapped: ArchitectClaimRow[] = raw.map((r) => {
        const u = Array.isArray(r.user) ? r.user[0] : r.user;
        return {
          id: r.id,
          user_id: r.user_id,
          architect_id: r.architect_id,
          status: r.status,
          proof_email: r.proof_email,
          created_at: r.created_at,
          resolved_at: r.resolved_at,
          user: u ?? { username: null, avatar_url: null },
          architect:
            nameById.get(r.architect_id) ?? {
              name: "Unknown entity",
              type: "unknown",
            },
        };
      });

      setClaims(mapped);
    } catch {
      toast.error("Failed to load architect claims");
    } finally {
      setClaimsLoading(false);
    }
  };

  const handleApprove = async (claim: ArchitectClaimRow) => {
    if (!currentUser) return;
    setProcessingArchitectId(claim.id);
    try {
      const { error: updateError } = await supabase
        .from("architect_claims")
        .update({ status: "verified", resolved_at: new Date().toISOString() })
        .eq("id", claim.id);

      if (updateError) throw updateError;

      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: claim.user_id,
        actor_id: currentUser.id,
        type: "architect_verification",
        architect_id: claim.architect_id,
        metadata: { status: "approved" },
      } satisfies ArchitectVerificationNotifInsert);

      if (notifError) throw notifError;
    } catch {
      toast.error("Failed to approve claim");
      setProcessingArchitectId(null);
      return;
    }

    setClaims((prev) => prev.filter((c) => c.id !== claim.id));
    toast.success("Claim approved");
    setProcessingArchitectId(null);
  };

  const handleDeny = async (claim: ArchitectClaimRow) => {
    if (!currentUser) return;
    setProcessingArchitectId(claim.id);
    try {
      const { error: updateError } = await supabase
        .from("architect_claims")
        .update({ status: "rejected", resolved_at: new Date().toISOString() })
        .eq("id", claim.id);

      if (updateError) throw updateError;

      const { error: rejectNotifError } = await supabase.from("notifications").insert({
        user_id: claim.user_id,
        actor_id: currentUser.id,
        type: "architect_verification",
        architect_id: claim.architect_id,
        metadata: { status: "rejected" },
      } satisfies ArchitectVerificationNotifInsert);

      if (rejectNotifError) throw rejectNotifError;
    } catch {
      toast.error("Failed to deny claim");
      setProcessingArchitectId(null);
      return;
    }

    setClaims((prev) => prev.filter((c) => c.id !== claim.id));
    toast.success("Claim denied");
    setProcessingArchitectId(null);
  };

  const handleResolveDispute = async (row: OpenCompanyClaimDisputeRow) => {
    setResolvingDisputeId(row.id);
    try {
      await resolveCompanyClaimDispute(row.id);
      toast.success("Dispute marked resolved");
      await queryClient.invalidateQueries({ queryKey: ["admin-open-company-claim-disputes"] });
    } catch {
      toast.error("Could not resolve dispute");
    } finally {
      setResolvingDisputeId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Entities"
        title="Entity claims"
        description="Review pending architect verifications and open company claim disputes."
      />

      <Tabs defaultValue="people" className="w-full">
        <TabsList className="h-auto rounded-none border-0 bg-transparent p-0">
          <TabsTrigger
            value="people"
            className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary data-[state=active]:border-text-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none"
          >
            Legacy architect claims
          </TabsTrigger>
          <TabsTrigger
            value="companies"
            className="gap-2 rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary data-[state=active]:border-text-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none"
          >
            <Scale className="h-4 w-4" aria-hidden />
            Company disputes
            {disputes.length > 0 ? (
              <Badge
                variant="outline"
                className="ml-1 border-feedback-warning/40 bg-feedback-warning/10 text-feedback-warning"
              >
                {disputes.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-6 space-y-4">
          <p className="text-sm text-text-secondary">
            Pending rows in <code className="rounded-sm bg-surface-muted px-1">architect_claims</code> (legacy flow).
          </p>
          <div className="rounded-sm border border-border-default bg-surface-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={adminTableHeadClass}>User</TableHead>
                  <TableHead className={adminTableHeadClass}>Target architect</TableHead>
                  <TableHead className={adminTableHeadClass}>Proof of affiliation</TableHead>
                  <TableHead className={adminTableHeadClass}>Submitted</TableHead>
                  <TableHead className={cn(adminTableHeadClass, "text-right")}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claimsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Loading…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : claims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <AdminEmptyState title="No pending architect claims" />
                    </TableCell>
                  </TableRow>
                ) : (
                  claims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={claim.user.avatar_url || undefined} />
                            <AvatarFallback>
                              {claim.user.username?.charAt(0).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{claim.user.username || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{claim.architect.name}</span>
                          <span className="text-xs capitalize text-text-secondary">{claim.architect.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="relative rounded-sm bg-surface-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                          {claim.proof_email}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-feedback-destructive hover:bg-feedback-destructive/10 hover:text-feedback-destructive"
                            onClick={() => handleDeny(claim)}
                            disabled={processingArchitectId === claim.id}
                          >
                            {processingArchitectId === claim.id ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <X className="mr-1 h-4 w-4" />
                            )}
                            Deny
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-sm border-text-primary text-text-primary hover:bg-surface-muted"
                            onClick={() => handleApprove(claim)}
                            disabled={processingArchitectId === claim.id}
                          >
                            {processingArchitectId === claim.id ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-1 h-4 w-4" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="companies" className="mt-6 space-y-4">
          <p className="text-sm text-text-secondary">
            Open company claim disputes. Resolving records a decision in the database only — ownership is handled outside
            this tool.
          </p>
          {disputesError && (
            <p className="text-sm text-feedback-destructive" role="alert">
              Could not load disputes.
            </p>
          )}
          <div className="rounded-sm border border-border-default bg-surface-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={adminTableHeadClass}>Company</TableHead>
                  <TableHead className={adminTableHeadClass}>Disputant</TableHead>
                  <TableHead className={adminTableHeadClass}>Reason</TableHead>
                  <TableHead className={adminTableHeadClass}>Evidence</TableHead>
                  <TableHead className={adminTableHeadClass}>Submitted</TableHead>
                  <TableHead className={cn(adminTableHeadClass, "text-right")}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-text-secondary" />
                    </TableCell>
                  </TableRow>
                ) : disputes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <AdminEmptyState title="No open company disputes" />
                    </TableCell>
                  </TableRow>
                ) : (
                  disputes.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Link
                          to={`/company/${d.companySlug}`}
                          className="font-medium text-text-primary underline-offset-4 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.companyName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{d.disputantUsername ?? d.disputedByUserId}</TableCell>
                      <TableCell className="max-w-xs text-sm text-text-secondary">
                        <span className="line-clamp-3" title={d.reason}>
                          {d.reason}
                        </span>
                      </TableCell>
                      <TableCell>
                        {d.evidenceUrl ? (
                          <a
                            href={d.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-text-primary underline-offset-4 hover:underline"
                          >
                            Link
                          </a>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveDispute(d)}
                          disabled={resolvingDisputeId === d.id}
                        >
                          {resolvingDisputeId === d.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Resolved"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
