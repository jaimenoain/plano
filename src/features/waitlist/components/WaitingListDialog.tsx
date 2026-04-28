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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { insertWaitlistSignup, parseWaitlistSignup } from "../api/waitlist";

type WaitingListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WaitingListDialog({ open, onOpenChange }: WaitingListDialogProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [pending, setPending] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPending(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseWaitlistSignup({ email, fullName: fullName || undefined });
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    setPending(true);
    const result = await insertWaitlistSignup(supabase, parsed.data);
    setPending(false);
    if (!result.ok) {
      if (result.code === "duplicate") {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      if (result.code === "duplicate") {
        handleOpenChange(false);
        setEmail("");
        setFullName("");
      }
      return;
    }
    toast.success("You are on the list. We will email you when we can let you in.");
    handleOpenChange(false);
    setEmail("");
    setFullName("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Join the waiting list</DialogTitle>
          <DialogDescription className="text-left text-text-secondary space-y-3 pt-1">
            <span className="block">
              Plano is the IMDb for architecture: a shared catalog of buildings, who shaped
              them, and how people experience them.
            </span>
            <span className="block">
              We are excited to open up more soon. Leave your details and we will notify you as
              soon as we can invite you to start using it.
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="waitlist-name" className="text-text-primary">
              Name <span className="text-text-secondary font-normal">(optional)</span>
            </Label>
            <Input
              id="waitlist-name"
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
              placeholder="Your name"
              disabled={pending}
              className="bg-surface-default"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waitlist-email" className="text-text-primary">
              Email
            </Label>
            <Input
              id="waitlist-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@example.com"
              disabled={pending}
              className="bg-surface-default"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden />
                  Sending
                </>
              ) : (
                "Notify me"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
