import { useState, useEffect } from "react";
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
import { Loader2, Check, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface Claim {
  id: string;
  user_id: string;
  architect_id: string;
  status: 'pending' | 'verified' | 'rejected';
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

export default function ArchitectClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("architect_claims")
        .select(`
          *,
          user:user_id(username, avatar_url),
          architect:architect_id(name, type)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform data to match interface if needed (Supabase types might be loose)
      // The join syntax user:user_id(...) returns an object or array depending on relation.
      // Since it's Many-to-One (claim -> user), it should be an object.
      setClaims((data as any[]) || []);
    } catch (error) {
      console.error("Error fetching claims:", error);
      toast.error("Failed to load claims");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (claim: Claim) => {
    if (!currentUser) return;
    setProcessingId(claim.id);
    try {
      // 1. Update claim status
      const { error: updateError } = await supabase
        .from("architect_claims")
        .update({ status: "verified", resolved_at: new Date().toISOString() })
        .eq("id", claim.id);

      if (updateError) throw updateError;

      // 2. Send notification
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: claim.user_id,
          actor_id: currentUser.id,
          type: "architect_verification",
          architect_id: claim.architect_id,
          metadata: { status: 'approved' }
        } as any);

      if (notifError) {
          console.error("Error sending notification", notifError);
      }

    } catch (error) {
      console.error("Error approving claim:", error);
      toast.error("Failed to approve claim");
      return;
    }

    // Optimistic update
    setClaims(prev => prev.filter(c => c.id !== claim.id));
    toast.success("Claim approved");
    setProcessingId(null);
  };

  const handleDeny = async (claim: Claim) => {
    if (!currentUser) return;
    setProcessingId(claim.id);
    try {
        const { error: updateError } = await supabase
        .from("architect_claims")
        .update({ status: "rejected", resolved_at: new Date().toISOString() })
        .eq("id", claim.id);

      if (updateError) throw updateError;

      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: claim.user_id,
          actor_id: currentUser.id,
          type: "architect_verification",
          architect_id: claim.architect_id,
          metadata: { status: 'rejected' }
        } as any);

      if (notifError) console.error("Error sending notification", notifError);

    } catch (error) {
      console.error("Error denying claim:", error);
      toast.error("Failed to deny claim");
      return;
    }

    setClaims(prev => prev.filter(c => c.id !== claim.id));
    toast.success("Claim denied");
    setProcessingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pending Claims</h1>
        <Badge variant="outline" className="px-3 py-1">
          {claims.length} Pending
        </Badge>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Target Architect</TableHead>
              <TableHead>Proof of Affiliation</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : claims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <ShieldCheck className="h-8 w-8 opacity-20" />
                    <p>No pending verification claims.</p>
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
                        <AvatarFallback>{claim.user.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{claim.user.username || "Unknown"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{claim.architect.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{claim.architect.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                      {claim.proof_email}
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeny(claim)}
                        disabled={processingId === claim.id}
                      >
                        {processingId === claim.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                        Deny
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(claim)}
                        disabled={processingId === claim.id}
                      >
                        {processingId === claim.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
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
    </div>
  );
}
