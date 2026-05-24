import { useState } from "react";
import { Link, type MetaFunction } from "react-router";
import { Loader2, CheckCircle, XCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useAwardClaimRequests,
  useReviewAwardClaimRequest,
} from "@/features/awards/hooks/useAwards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AdminPageHeader,
  adminHairlineTabTriggerClass,
  adminHairlineTabsListClass,
  adminTableHeadClass,
} from "@/features/admin/components/admin-ui";
import { cn } from "@/lib/utils";

export const meta: MetaFunction = () => [{ title: "Award Claim Requests | Plano Admin" }];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-feedback-warning/15 text-feedback-warning border-none",
  approved: "bg-feedback-success/15 text-feedback-success border-none",
  rejected: "bg-feedback-destructive/15 text-feedback-destructive border-none",
};

export default function AwardClaimRequests() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const { data: requests = [], isLoading } = useAwardClaimRequests(tab);
  const review = useReviewAwardClaimRequest();

  // Track per-row reject popover note state.
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  const handleApprove = (requestId: string) => {
    review.mutate(
      { requestId, approve: true },
      {
        onSuccess: () => toast.success("Claim approved — award marked as claimed."),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError:   (e: any) => toast.error(e.message ?? "Approval failed"),
      },
    );
  };

  const handleReject = (requestId: string) => {
    review.mutate(
      { requestId, approve: false, reviewerNote: rejectNotes[requestId] ?? undefined },
      {
        onSuccess: () => {
          toast.success("Claim rejected.");
          setRejectNotes((prev) => { const n = { ...prev }; delete n[requestId]; return n; });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (e: any) => toast.error(e.message ?? "Rejection failed"),
      },
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Awards"
        title="Award claim requests"
        description="Review requests from organisations claiming ownership of an award."
      />

      {/* Status tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className={cn(adminHairlineTabsListClass, "gap-6")}>
          <TabsTrigger className={adminHairlineTabTriggerClass} value="pending">
            Pending
          </TabsTrigger>
          <TabsTrigger className={adminHairlineTabTriggerClass} value="approved">
            Approved
          </TabsTrigger>
          <TabsTrigger className={adminHairlineTabTriggerClass} value="rejected">
            Rejected
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </div>
      ) : (
        <div className="border border-border-default rounded-sm overflow-hidden bg-surface-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-muted/50 hover:bg-surface-muted/50 border-border-default">
                <TableHead className={cn(adminTableHeadClass, "w-[180px]")}>Award</TableHead>
                <TableHead className={cn(adminTableHeadClass, "w-[140px]")}>Requester</TableHead>
                <TableHead className={adminTableHeadClass}>Reason</TableHead>
                <TableHead className={cn(adminTableHeadClass, "w-[120px]")}>Submitted</TableHead>
                <TableHead className={cn(adminTableHeadClass, "w-[60px]")}>Status</TableHead>
                {tab === "pending" && (
                  <TableHead className={cn(adminTableHeadClass, "text-right w-[180px]")}>Actions</TableHead>
                )}
                {tab !== "pending" && (
                  <TableHead className={cn(adminTableHeadClass, "w-[140px]")}>Reviewer note</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-text-secondary text-sm">
                    No {tab} requests.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow
                    key={req.id}
                    className="border-border-default hover:bg-surface-muted/30 align-top"
                  >
                    {/* Award */}
                    <TableCell>
                      {req.award ? (
                        <Link
                          to={`/award/${req.award.slug}`}
                          className="font-medium text-sm text-text-primary hover:underline underline-offset-4"
                        >
                          {req.award.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-text-secondary">—</span>
                      )}
                    </TableCell>

                    {/* Requester */}
                    <TableCell className="text-sm text-text-secondary">
                      {req.requesterProfile?.username ?? req.requesterUserId.slice(0, 8) + "…"}
                    </TableCell>

                    {/* Reason */}
                    <TableCell className="text-sm text-text-secondary max-w-xs">
                      <p className="line-clamp-3">{req.reason}</p>
                    </TableCell>

                    {/* Submitted */}
                    <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                      {format(new Date(req.createdAt), "dd MMM yyyy")}
                    </TableCell>

                    {/* Status badge */}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`capitalize text-[10px] font-bold uppercase tracking-widest ${STATUS_BADGE[req.status] ?? ""}`}
                      >
                        {req.status}
                      </Badge>
                    </TableCell>

                    {/* Actions — pending only */}
                    {tab === "pending" && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs text-feedback-success border-feedback-success/30 hover:bg-feedback-success/10"
                            disabled={review.isPending}
                            onClick={() => handleApprove(req.id)}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve
                          </Button>

                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs text-feedback-destructive border-feedback-destructive/30 hover:bg-feedback-destructive/10"
                                disabled={review.isPending}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                                <ChevronDown className="h-3 w-3 opacity-60" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 space-y-3" align="end">
                              <p className="text-xs font-medium text-text-primary">
                                Rejection note (optional)
                              </p>
                              <Textarea
                                rows={3}
                                placeholder="Reason shown to the requester…"
                                value={rejectNotes[req.id] ?? ""}
                                onChange={(e) =>
                                  setRejectNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                                }
                                className="resize-none text-sm"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                className="w-full"
                                disabled={review.isPending}
                                onClick={() => handleReject(req.id)}
                              >
                                Confirm rejection
                              </Button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                    )}

                    {/* Reviewer note — reviewed rows */}
                    {tab !== "pending" && (
                      <TableCell className="text-sm text-text-secondary">
                        {req.reviewerNote ?? <span className="opacity-40">—</span>}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
