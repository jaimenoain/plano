import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { CompanyStewardWithProfile } from "../types";
import {
  companyStewardsQueryKey,
  inviteCompanySteward,
  removeCompanySteward,
} from "../api/companies";

function stewardRoleLabel(role: string): string {
  if (role === "owner") return "Owner";
  if (role === "steward") return "Steward";
  return role;
}

interface CompanyStewardsSectionProps {
  companyId: string;
  stewards: CompanyStewardWithProfile[];
  /** Owners may invite and remove; plain stewards only see the roster. */
  isOwner: boolean;
}

/**
 * Stewards tab body — the roster of members who manage this company page, plus
 * the owner-only invite and remove flows. The tab itself is only mounted for
 * stewards (RLS returns rows to stewards only), so this never leaks the roster.
 */
export function CompanyStewardsSection({ companyId, stewards, isOwner }: CompanyStewardsSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [removeStewardId, setRemoveStewardId] = useState<string | null>(null);
  const [removeWorking, setRemoveWorking] = useState(false);

  const confirmRemoveSteward = async () => {
    if (!removeStewardId) return;
    setRemoveWorking(true);
    try {
      await removeCompanySteward(removeStewardId);
      void queryClient.invalidateQueries({ queryKey: companyStewardsQueryKey(companyId) });
      toast({ description: "Steward removed" });
      setRemoveStewardId(null);
    } catch (err) {
      toast({
        variant: "destructive",
        description: err instanceof Error ? err.message : "Could not remove steward",
      });
    } finally {
      setRemoveWorking(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = inviteEmail.trim().toLowerCase();
    if (!em) {
      toast({ variant: "destructive", description: "Enter an email address." });
      return;
    }
    setInviteSending(true);
    try {
      await inviteCompanySteward(companyId, em);
      toast({ description: "Invite sent" });
      setInviteOpen(false);
      setInviteEmail("");
    } catch (err) {
      toast({
        variant: "destructive",
        description: err instanceof Error ? err.message : "Could not send invite",
      });
    } finally {
      setInviteSending(false);
    }
  };

  return (
    <section aria-label="Company stewards">
      <AlertDialog open={Boolean(removeStewardId)} onOpenChange={(o) => !o && setRemoveStewardId(null)}>
        <AlertDialogContent className="border-border-default bg-surface-overlay">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove steward</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to edit this company page and manage stewards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeWorking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeWorking}
              onClick={(ev) => {
                ev.preventDefault();
                void confirmRemoveSteward();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="border-border-default bg-surface-overlay sm:max-w-md">
          <form onSubmit={handleSendInvite}>
            <DialogHeader>
              <DialogTitle>Invite a steward</DialogTitle>
              <DialogDescription>
                We&apos;ll email them a link to accept. They must sign in with that email address.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <Label htmlFor="invite-steward-email">Email</Label>
              <Input
                id="invite-steward-email"
                type="email"
                autoComplete="email"
                value={inviteEmail}
                onChange={(ev) => setInviteEmail(ev.target.value)}
                className="border-border-default bg-transparent"
                placeholder="name@company.com"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteSending}>
                {inviteSending ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isOwner ? (
        <div className="mb-6 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit shrink-0 border-border-default"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            Invite a steward
          </Button>
        </div>
      ) : null}

      <ul className="divide-y divide-border-default">
        {stewards.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-10 w-10 shrink-0 rounded-full border border-border-default">
                {s.avatarUrl ? <AvatarImage src={s.avatarUrl} alt="" /> : null}
                <AvatarFallback className="rounded-full text-xs font-medium text-text-primary">
                  {(s.username?.[0] ?? "?").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {s.username ? `@${s.username}` : "Plano member"}
                </p>
                <p className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
                  {stewardRoleLabel(s.role)}
                </p>
              </div>
            </div>
            {isOwner && s.role === "steward" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px] min-w-[44px] border-border-default"
                onClick={() => setRemoveStewardId(s.id)}
              >
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
