import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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

interface DisconnectArchitectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  architectId: string;
}

export function DisconnectArchitectDialog({
  open,
  onOpenChange,
  onSuccess,
  architectId,
}: DisconnectArchitectDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDisconnect = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // @ts-expect-error - architect_claims table exists in migration
      const { error } = await supabase
        .from("architect_claims")
        .delete()
        .eq("user_id", user.id)
        .eq("architect_id", architectId);

      if (error) throw error;

      toast.success("Successfully disconnected from architect profile.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error disconnecting architect:", error);
      toast.error(error.message || "Failed to disconnect profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Disconnect Architect Profile
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            Are you sure you want to disconnect your profile from this architect or architecture studio?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 text-sm text-muted-foreground">
          <p>
            You will lose access to the architect dashboard and will no longer be able to manage official building data.
          </p>
          <p className="font-medium text-foreground">
            Note: All studio and building data you introduced will remain in the system.
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
            Confirm Disconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}