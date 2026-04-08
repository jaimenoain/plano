import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { requestCompanyClaimVerification } from "@/features/credits/api/companies";

type ClaimCompanyDialogProps = {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ClaimCompanyDialog({
  companyId,
  companyName,
  open,
  onOpenChange,
}: ClaimCompanyDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const result = await requestCompanyClaimVerification(companyId, email);
      if ("action" in result && result.action === "dispute") {
        navigate(`/company/${result.companySlug}/dispute`);
        onOpenChange(false);
        setEmail("");
        return;
      }
      toast({
        title: "Check your email",
        description: `We sent a verification link to ${email.trim()}. Open it on this device while signed in to Plano.`,
      });
      onOpenChange(false);
      setEmail("");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not start verification",
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
            <DialogTitle className="text-text-primary">Claim this company</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Enter a work email at <span className="font-medium text-text-primary">{companyName}</span>. We&apos;ll
              send a one-time link to verify you represent this organization before you become the owner on Plano.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="claim-company-email">Work email</Label>
            <Input
              id="claim-company-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="border-border-default bg-transparent"
              placeholder="you@yourcompany.com"
              required
            />
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
              {submitting ? "Sending…" : "Send verification link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
