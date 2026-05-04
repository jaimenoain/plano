import { useParams, useNavigate, Link } from "react-router";
import { 
  useSuggestion, 
  useApproveSuggestion, 
  useRejectSuggestion 
} from "@/features/awards/hooks/useAwards";
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
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AwardSuggestionDetail() {
  const { suggestionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: s, isLoading } = useSuggestion(suggestionId!);
  const approve = useApproveSuggestion();
  const reject = useRejectSuggestion();

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!s) return <div className="p-8 text-center text-red-500">Suggestion not found</div>;

  const handleApprove = async () => {
    try {
      await approve.mutateAsync(s.id);
      toast({ title: "Approved", description: "Award recipient created successfully." });
      navigate("/admin/awards/suggestions");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    try {
      await reject.mutateAsync({ id: s.id, note: rejectNote });
      toast({ title: "Rejected", description: "Suggestion marked as rejected." });
      navigate("/admin/awards/suggestions");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const recipientName = s.recipientType === 'building' ? s.building?.name : 
                         s.recipientType === 'person' ? s.person?.name : 
                         s.company?.name;
  
  const recipientUrl = s.recipientType === 'building' ? `/building/${s.recipientBuildingId}` :
                        s.recipientType === 'person' ? `/person/${s.person?.slug}` :
                        `/company/${s.company?.slug}`;

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-secondary">
        <Link to="/admin/awards/suggestions">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Suggestions
        </Link>
      </Button>

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Badge 
            variant="secondary" 
            className={cn(
              "rounded-none text-[10px] uppercase tracking-widest",
              s.status === 'pending' ? "bg-amber-100 text-amber-900" :
              s.status === 'approved' ? "bg-emerald-100 text-emerald-900" :
              "bg-red-100 text-red-900"
            )}
          >
            {s.status}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Review Suggestion</h1>
          <p className="text-secondary">Submitted by {s.submittedByProfile?.name} on {format(new Date(s.createdAt), "MMMM d, yyyy")}</p>
        </div>

        {s.status === 'pending' && (
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-sm"
              onClick={() => setShowRejectForm(true)}
            >
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button 
              className="bg-brand-primary text-text-inverse rounded-sm"
              onClick={handleApprove}
              disabled={approve.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Approve & Insert
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Award Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 border border-border-default rounded-sm bg-surface-card">
              <div className="space-y-1">
                <p className="text-[10px] text-secondary uppercase tracking-widest flex items-center">
                  <Trophy className="mr-1.5 h-3 w-3" /> Award
                </p>
                <p className="font-medium">{s.award?.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-secondary uppercase tracking-widest flex items-center">
                  <Calendar className="mr-1.5 h-3 w-3" /> Year
                </p>
                <p className="font-medium">{s.year}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-secondary uppercase tracking-widest flex items-center">
                  <CheckCircle className="mr-1.5 h-3 w-3" /> Outcome
                </p>
                <Badge variant="outline" className="rounded-none capitalize">
                  {s.outcome.replace('_', ' ')}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-secondary uppercase tracking-widest flex items-center">
                  <User className="mr-1.5 h-3 w-3" /> Recipient
                </p>
                <Link to={recipientUrl} target="_blank" className="font-medium hover:underline flex items-center group">
                  {recipientName} <ExternalLink className="ml-1.5 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <p className="text-[10px] text-secondary uppercase tracking-widest">{s.recipientType}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Verification</h2>
            <div className="p-6 border border-border-default rounded-sm bg-surface-card space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] text-secondary uppercase tracking-widest flex items-center">
                  <LinkIcon className="mr-1.5 h-3 w-3" /> Source URL
                </p>
                <a 
                  href={s.sourceUrl || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline break-all"
                >
                  {s.sourceUrl}
                </a>
              </div>
              {s.notes && (
                <div className="space-y-1">
                  <p className="text-[10px] text-secondary uppercase tracking-widest flex items-center">
                    <MessageSquare className="mr-1.5 h-3 w-3" /> Submitter Notes
                  </p>
                  <p className="text-sm leading-relaxed text-text-primary italic">"{s.notes}"</p>
                </div>
              )}
            </div>
          </section>

          {showRejectForm && (
            <section className="p-6 border border-red-200 rounded-sm bg-red-50 space-y-4">
              <h2 className="text-sm font-bold text-red-900">Reject Suggestion</h2>
              <div className="space-y-2">
                <p className="text-xs text-red-800">Provide a reason for rejection (optional). This will be saved for audit.</p>
                <Textarea 
                  placeholder="e.g. Duplicate entry, incorrect verification link..."
                  className="border-red-200 bg-white min-h-[100px] rounded-sm"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                <Button 
                  size="sm" 
                  className="bg-red-600 text-white hover:bg-red-700 rounded-sm"
                  onClick={handleReject}
                  disabled={reject.isPending}
                >
                  Confirm Rejection
                </Button>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Audit Trail</h2>
            <div className="p-4 border border-border-default rounded-sm bg-surface-muted/30 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] text-secondary uppercase tracking-widest">Status</p>
                <p className="text-sm font-medium capitalize">{s.status}</p>
              </div>
              {s.reviewedBy && (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] text-secondary uppercase tracking-widest">Reviewed By</p>
                    <p className="text-sm font-medium">{s.reviewedBy}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-secondary uppercase tracking-widest">Reviewed At</p>
                    <p className="text-sm font-medium">
                      {s.reviewedAt ? format(new Date(s.reviewedAt), "MMM d, yyyy HH:mm") : "-"}
                    </p>
                  </div>
                  {s.reviewerNote && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-secondary uppercase tracking-widest">Reviewer Note</p>
                      <p className="text-sm text-text-primary">{s.reviewerNote}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
