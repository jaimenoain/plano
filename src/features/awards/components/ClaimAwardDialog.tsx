import { useState } from "react";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSubmitAwardClaimRequest } from "@/features/awards/hooks/useAwards";

interface Props {
  awardId: string;
  awardName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the request is successfully submitted. */
  onSuccess?: () => void;
}

const MIN_REASON_LENGTH = 20;

const ERROR_COPY: Record<string, string> = {
  not_authenticated: "You must be signed in to claim an award.",
  award_not_found:   "This award could not be found.",
  already_claimed:   "This award has already been claimed by another organisation.",
  already_pending:   "You already have a pending claim request for this award.",
  reason_too_short:  `Please provide at least ${MIN_REASON_LENGTH} characters explaining your connection to the award.`,
};

export function ClaimAwardDialog({ awardId, awardName, open, onOpenChange, onSuccess }: Props) {
  const [reason, setReason]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submit = useSubmitAwardClaimRequest();

  const handleSubmit = async () => {
    if (reason.trim().length < MIN_REASON_LENGTH) {
      toast.error(ERROR_COPY.reason_too_short);
      return;
    }

    const result = await submit.mutateAsync({ awardId, reason: reason.trim() });

    if (!result.ok) {
      toast.error(ERROR_COPY[result.error ?? ""] ?? "Something went wrong. Please try again.");
      return;
    }

    setSubmitted(true);
    onSuccess?.();
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset form on close unless loading.
      if (!submit.isPending) {
        setReason("");
        setSubmitted(false);
      }
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-brand-primary/5 rounded-sm">
              <Shield className="h-5 w-5 text-brand-primary" />
            </div>
            <DialogTitle>Claim this award</DialogTitle>
          </div>
          <DialogDescription>
            {submitted ? null : (
              <>
                Are you the awarding body or an official representative of{" "}
                <span className="font-medium text-text-primary">{awardName}</span>? Submit a
                request below and the Plano team will review it.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-4 space-y-3 text-center">
            <p className="text-sm text-text-primary font-medium">Request submitted</p>
            <p className="text-sm text-text-secondary">
              We'll review your claim and get back to you via the email on your Plano account.
              This usually takes 1–3 working days.
            </p>
            <Button
              className="mt-2 w-full"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2 py-2">
              <Label htmlFor="claim-reason" className="text-xs font-medium uppercase tracking-widest">
                Your connection to this award
              </Label>
              <Textarea
                id="claim-reason"
                placeholder="e.g. I work at the RIBA and manage the Stirling Prize programme."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
                disabled={submit.isPending}
              />
              <p className="text-xs text-text-secondary">
                {reason.trim().length}/{MIN_REASON_LENGTH} characters minimum
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={submit.isPending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submit.isPending || reason.trim().length < MIN_REASON_LENGTH}
                className="w-full sm:w-auto"
              >
                {submit.isPending ? "Submitting…" : "Submit claim request"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
