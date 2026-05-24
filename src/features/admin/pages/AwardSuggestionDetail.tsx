import { useParams, useNavigate, Link } from "react-router";
import { useSuggestion, useApproveSuggestion, useRejectSuggestion } from "@/features/awards/hooks/useAwards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  XCircle,
  User,
  Trophy,
  Calendar,
  Link as LinkIcon,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AdminErrorState,
  AdminPageHeader,
  AdminSectionLabel,
} from "@/features/admin/components/admin-ui";

export default function AwardSuggestionDetail() {
  const { suggestionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: s, isLoading } = useSuggestion(suggestionId!);
  const approve = useApproveSuggestion();
  const reject = useRejectSuggestion();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }
  if (!s) {
    return <AdminErrorState message="Suggestion not found" />;
  }

  const handleApprove = async () => {
    try {
      await approve.mutateAsync(s.id);
      toast({ title: "Approved", description: "Award recipient created successfully." });
      navigate("/admin/awards/suggestions");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    try {
      await reject.mutateAsync({ id: s.id, note: rejectNote });
      toast({ title: "Rejected", description: "Suggestion marked as rejected." });
      navigate("/admin/awards/suggestions");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const recipientName =
    s.recipientType === "building"
      ? s.building?.name
      : s.recipientType === "person"
        ? s.person?.name
        : s.company?.name;

  const recipientUrl =
    s.recipientType === "building"
      ? `/building/${s.recipientBuildingId}`
      : s.recipientType === "person"
        ? `/person/${s.person?.slug}`
        : `/company/${s.company?.slug}`;

  return (
    <div className="max-w-4xl space-y-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-text-secondary">
        <Link to="/admin/awards/suggestions">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to suggestions
        </Link>
      </Button>

      <AdminPageHeader
        eyebrow="Awards · Suggestions"
        title="Review suggestion"
        description={`Submitted by ${s.submittedByProfile?.name ?? "Unknown"} · ${format(new Date(s.createdAt), "MMMM d, yyyy")}`}
        actions={
          s.status === "pending" ? (
            <>
              <Button
                variant="outline"
                className="rounded-none border-feedback-destructive/30 text-feedback-destructive hover:bg-feedback-destructive/10 hover:text-feedback-destructive"
                onClick={() => setShowRejectForm(true)}
              >
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button
                variant="outline"
                disabled={approve.isPending}
                className="rounded-none gap-1 border-feedback-success/40 text-feedback-success hover:bg-feedback-success/10 hover:text-feedback-success"
                onClick={handleApprove}
              >
                <CheckCircle className="h-4 w-4" />
                Approve & insert
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className={cn(
            "rounded-none text-[10px] uppercase tracking-widest",
            s.status === "pending"
              ? "bg-feedback-warning/10 text-feedback-warning"
              : s.status === "approved"
                ? "bg-feedback-success/10 text-feedback-success"
                : "bg-feedback-destructive/10 text-feedback-destructive",
          )}
        >
          {s.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-8 md:col-span-2">
          <section className="space-y-4">
            <AdminSectionLabel>Award details</AdminSectionLabel>
            <div className="grid grid-cols-1 gap-6 rounded-sm border border-border-default bg-surface-card p-6 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="flex items-center text-[10px] uppercase tracking-widest text-text-secondary">
                  <Trophy className="mr-1.5 h-3 w-3" /> Award
                </p>
                <p className="font-medium">{s.award?.name}</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center text-[10px] uppercase tracking-widest text-text-secondary">
                  <Calendar className="mr-1.5 h-3 w-3" /> Year
                </p>
                <p className="font-medium">{s.year}</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center text-[10px] uppercase tracking-widest text-text-secondary">
                  <CheckCircle className="mr-1.5 h-3 w-3" /> Outcome
                </p>
                <Badge variant="outline" className="rounded-none capitalize">
                  {s.outcome.replace("_", " ")}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="flex items-center text-[10px] uppercase tracking-widest text-text-secondary">
                  <User className="mr-1.5 h-3 w-3" /> Recipient
                </p>
                <Link
                  to={recipientUrl}
                  target="_blank"
                  className="group flex items-center font-medium hover:underline"
                >
                  {recipientName}
                  <ExternalLink className="ml-1.5 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
                <p className="text-[10px] uppercase tracking-widest text-text-secondary">{s.recipientType}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <AdminSectionLabel>Verification</AdminSectionLabel>
            <div className="space-y-4 rounded-sm border border-border-default bg-surface-card p-6">
              <div className="space-y-1">
                <p className="flex items-center text-[10px] uppercase tracking-widest text-text-secondary">
                  <LinkIcon className="mr-1.5 h-3 w-3" /> Source URL
                </p>
                <a href={s.sourceUrl || "#"} target="_blank" rel="noopener noreferrer" className="break-all text-brand-primary hover:underline">
                  {s.sourceUrl}
                </a>
              </div>
              {s.notes ? (
                <div className="space-y-1">
                  <p className="flex items-center text-[10px] uppercase tracking-widest text-text-secondary">
                    <MessageSquare className="mr-1.5 h-3 w-3" /> Submitter notes
                  </p>
                  <p className="text-sm italic leading-relaxed text-text-primary">&ldquo;{s.notes}&rdquo;</p>
                </div>
              ) : null}
            </div>
          </section>

          {showRejectForm ? (
            <section className="space-y-4 rounded-none border border-feedback-destructive/30 bg-feedback-destructive/5 p-6">
              <h2 className="text-sm font-bold text-feedback-destructive">Reject suggestion</h2>
              <div className="space-y-2">
                <p className="text-xs text-text-secondary">
                  Provide a reason for rejection (optional). This will be saved for audit.
                </p>
                <Textarea
                  placeholder="e.g. Duplicate entry, incorrect verification link…"
                  className="min-h-[100px] rounded-none border-border-default bg-surface-card"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowRejectForm(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="rounded-none bg-feedback-destructive text-feedback-destructive-foreground hover:opacity-90"
                  onClick={handleReject}
                  disabled={reject.isPending}
                >
                  Confirm rejection
                </Button>
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className="space-y-4">
            <AdminSectionLabel>Audit trail</AdminSectionLabel>
            <div className="space-y-4 rounded-sm border border-border-default bg-surface-muted/30 p-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-text-secondary">Status</p>
                <p className="text-sm font-medium capitalize">{s.status}</p>
              </div>
              {s.reviewedBy ? (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-text-secondary">Reviewed by</p>
                    <p className="text-sm font-medium">{s.reviewedBy}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-text-secondary">Reviewed at</p>
                    <p className="text-sm font-medium">
                      {s.reviewedAt ? format(new Date(s.reviewedAt), "MMM d, yyyy HH:mm") : "—"}
                    </p>
                  </div>
                  {s.reviewerNote ? (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-text-secondary">Reviewer note</p>
                      <p className="text-sm text-text-primary">{s.reviewerNote}</p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
