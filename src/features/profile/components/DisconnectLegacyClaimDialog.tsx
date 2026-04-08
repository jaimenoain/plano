import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DisconnectLegacyClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** Legacy UUID from `profiles.verified_architect_id` (migrated person/company id); matches `architect_claims.architect_id`. */
  legacyEntityId: string;
}

export function DisconnectLegacyClaimDialog({
  open,
  onOpenChange,
  onSuccess,
  legacyEntityId,
}: DisconnectLegacyClaimDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDisconnect = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("architect_claims")
        .delete()
        .eq("user_id", user.id)
        .eq("architect_id", legacyEntityId);

      if (error) throw error;

      toast.success("Removed your legacy verification claim.");
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove claim. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-feedback-destructive">
            <AlertTriangle className="h-5 w-5" />
            Remove legacy claim
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            This clears an old verification record tied to your account. Your public person or company
            profile (if you have claimed one) is managed from that profile’s page and portfolio.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 text-sm text-text-secondary">
          <p>
            You may lose access that depended on this legacy claim until you use the current claim flow on
            your professional profile.
          </p>
          <p className="font-medium text-text-primary">
            Buildings and credits you added stay in the catalog.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDisconnect}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
