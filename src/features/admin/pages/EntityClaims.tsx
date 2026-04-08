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
import { Loader2, Check, X, ShieldCheck, Scale } from "lucide-react";
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
          user:user_id(username, avatar_url),
          architect:architect_id(name, type)
        `,
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setClaims((data as ArchitectClaimRow[] | null) ?? []);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Entity claims</h1>
      </div>

      <Tabs defaultValue="people" className="w-full">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="people">Legacy architect claims</TabsTrigger>
          <TabsTrigger value="companies" className="gap-2">
            <Scale className="h-4 w-4" />
            Company disputes
            {disputes.length > 0 ? (
              <Badge variant="secondary" className="ml-1">
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
                  <TableHead>User</TableHead>
                  <TableHead>Target architect</TableHead>
                  <TableHead>Proof of affiliation</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell colSpan={5} className="h-24 text-center text-text-secondary">
                      <div className="flex flex-col items-center gap-2">
                        <ShieldCheck className="h-8 w-8 opacity-20" />
                        <p>No pending architect verification claims.</p>
                      </div>
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
                            variant="default"
                            className="bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
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
                  <TableHead>Company</TableHead>
                  <TableHead>Disputant</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell colSpan={6} className="h-24 text-center text-text-secondary">
                      No open company disputes.
                    </TableCell>
                  </TableRow>
                ) : (
                  disputes.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Link
                          to={`/company/${d.companySlug}`}
                          className="font-medium text-brand-primary underline-offset-4 hover:underline"
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
                            className="text-sm text-brand-primary underline-offset-4 hover:underline"
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
