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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Person } from "@/features/credits/types";
import { claimPerson, ClaimPersonError, type ClaimPersonReason } from "@/features/credits/api/people";

type ClaimPersonDialogProps = {
  personId: string;
  personSlug: string;
  personName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed: (person: Person) => void;
};

export function ClaimPersonDialog({
  personId,
  personSlug,
  personName,
  open,
  onOpenChange,
  onClaimed,
}: ClaimPersonDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [relationship, setRelationship] = useState<ClaimPersonReason>("self");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const updated = await claimPerson(personId, personSlug, relationship);
      toast({
        title: "Profile claimed",
        description: "You can edit your public details below.",
      });
      onClaimed(updated);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ClaimPersonError) {
        const messages: Record<ClaimPersonError["code"], string> = {
          not_authenticated: "Sign in to claim this profile.",
          not_found: "This profile could not be found.",
          not_claimable: "This profile is no longer available to claim.",
          already_claimed_other: "You already manage another person profile on Plano.",
          rpc_error: "Something went wrong. Try again in a moment.",
        };
        toast({
          variant: "destructive",
          title: "Could not claim profile",
          description: messages[err.code] ?? err.message,
        });
        return;
      }
      toast({
        variant: "destructive",
        title: "Could not claim profile",
        description: "Something went wrong. Try again in a moment.",
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
            <DialogTitle className="text-text-primary">Claim this profile</DialogTitle>
            <DialogDescription className="text-text-secondary">
              You are about to link <span className="font-medium text-text-primary">{personName}</span> to your
              Plano account. Misrepresentation may be removed by moderators.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Label className="text-sm font-medium text-text-primary">Your relationship</Label>
            <RadioGroup
              value={relationship}
              onValueChange={(v) => setRelationship(v as ClaimPersonReason)}
              className="grid gap-3"
            >
              <div className="flex items-center space-x-3 rounded-sm border border-border-default px-3 py-3">
                <RadioGroupItem value="self" id="claim-self" />
                <Label htmlFor="claim-self" className="cursor-pointer font-normal leading-snug text-text-primary">
                  This is me
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-sm border border-border-default px-3 py-3">
                <RadioGroupItem value="representative" id="claim-rep" />
                <Label htmlFor="claim-rep" className="cursor-pointer font-normal leading-snug text-text-primary">
                  I represent this person
                </Label>
              </div>
            </RadioGroup>
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
              {submitting ? "Claiming…" : "Confirm claim"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
