import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { submitCompanyStewardRequest } from "@/features/credits/api/companies";

type RequestStewardAccessDialogProps = {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
};

export function RequestStewardAccessDialog({
  companyId,
  companyName,
  open,
  onOpenChange,
  onSubmitted,
}: RequestStewardAccessDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      await submitCompanyStewardRequest(companyId, message);
      toast({
        title: "Request sent",
        description: "Company owners were emailed. They can approve you from the link we sent them.",
      });
      setMessage("");
      onOpenChange(false);
      onSubmitted();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not send request",
        description: err instanceof Error ? err.message : "Something went wrong. Try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border-default sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-text-primary">Request access</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Ask the owners of <span className="font-medium text-text-primary">{companyName}</span> to add you as
              a steward so you can edit this company on Plano. They will get an email with an approval link.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="steward-request-message">Message (optional)</Label>
            <Textarea
              id="steward-request-message"
              value={message}
              onChange={(ev) => setMessage(ev.target.value)}
              className="min-h-24 border-border-default bg-transparent"
              placeholder="Introduce yourself or explain your role…"
              maxLength={2000}
            />
            <p className="text-2xs text-text-secondary">{message.length}/2000</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="border-border-default"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !user}>
              {submitting ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
