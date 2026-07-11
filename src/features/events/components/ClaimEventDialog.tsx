import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getManageableOrganisers } from "@/features/events/api/eventsApi";
import { useClaimEvent } from "@/features/events/hooks/useClaimEvent";
import type { EventClaimIdentity, EventDTO } from "@/features/events/types";

type ClaimEventDialogProps = {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed: (event: EventDTO) => void;
};

const HOST_VALUE = "user";

function initials(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function valueToIdentity(value: string): EventClaimIdentity {
  if (value === HOST_VALUE) return { kind: "user" };
  const [kind, id] = value.split(":");
  if (kind === "person" && id) return { kind: "person", id };
  if (kind === "company" && id) return { kind: "company", id };
  return { kind: "user" };
}

function isApiError(e: unknown): e is { code: string; message: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    "message" in e &&
    typeof (e as { code: unknown }).code === "string"
  );
}

export function ClaimEventDialog({
  eventId,
  eventSlug,
  eventTitle,
  open,
  onOpenChange,
  onClaimed,
}: ClaimEventDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const claim = useClaimEvent();
  const [selected, setSelected] = useState<string>(HOST_VALUE);

  const organisersQuery = useQuery({
    queryKey: ["events", "manageable-organisers", user?.id ?? "anon"],
    queryFn: getManageableOrganisers,
    enabled: open && Boolean(user),
    staleTime: 60_000,
  });

  // Reset the selection back to "host" whenever the dialog re-opens.
  useEffect(() => {
    if (open) setSelected(HOST_VALUE);
  }, [open]);

  const managed = organisersQuery.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const event = await claim.mutateAsync({
        eventId,
        slug: eventSlug,
        identity: valueToIdentity(selected),
      });
      toast({ title: "Event claimed", description: "You're now listed as the organiser." });
      onClaimed(event);
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not claim event",
        description: isApiError(err) ? err.message : "Something went wrong. Try again in a moment.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border-default sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-text-primary">Claim this event</DialogTitle>
            <DialogDescription className="text-text-secondary">
              You are about to become the organiser of{" "}
              <span className="font-medium text-text-primary">{eventTitle}</span>. Misrepresentation
              may be removed by moderators.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Label className="text-sm font-medium text-text-primary">Claim as</Label>
            <RadioGroup value={selected} onValueChange={setSelected} className="grid gap-2">
              <label
                htmlFor="claim-host"
                className="flex cursor-pointer items-center gap-3 rounded-sm border border-border-default px-3 py-3"
              >
                <RadioGroupItem value={HOST_VALUE} id="claim-host" />
                <Avatar className="h-8 w-8 rounded-full border border-border-default">
                  <AvatarFallback className="text-xs">
                    <User className="h-4 w-4" aria-hidden />
                  </AvatarFallback>
                </Avatar>
                <span className="font-normal leading-snug text-text-primary">This is me (I&apos;m the host)</span>
              </label>

              {managed.map((org) => {
                const value = `${org.kind}:${org.id}`;
                const fieldId = `claim-${org.kind}-${org.id}`;
                return (
                  <label
                    key={value}
                    htmlFor={fieldId}
                    className="flex cursor-pointer items-center gap-3 rounded-sm border border-border-default px-3 py-3"
                  >
                    <RadioGroupItem value={value} id={fieldId} />
                    <Avatar className="h-8 w-8 rounded-full border border-border-default">
                      {org.avatarUrl ? <AvatarImage src={org.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="text-xs">{initials(org.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate font-normal leading-snug text-text-primary">
                        {org.name}
                      </span>
                      <span className="block eyebrow tracking-widest text-text-disabled">
                        {org.kind === "company" ? "Company" : "Person"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
            {organisersQuery.isLoading ? (
              <p className="text-xs text-text-disabled">Loading the entities you manage…</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="border-border-default"
              onClick={() => onOpenChange(false)}
              disabled={claim.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={claim.isPending || !user}>
              {claim.isPending ? "Claiming…" : "Confirm claim"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
