import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { buildingCreditsQueryKey, flagCredit, type FlagReason } from "@/features/credits";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

const FLAG_REASON_OPTIONS: { value: FlagReason; label: string }[] = [
  { value: "wrong_person", label: "Wrong person" },
  { value: "never_involved", label: "Never involved" },
  { value: "wrong_role", label: "Wrong role" },
  { value: "other", label: "Other" },
];

function CreditFlagFormFields({
  reason,
  onReasonChange,
  notes,
  onNotesChange,
  disabled,
}: {
  reason: FlagReason | null;
  onReasonChange: (r: FlagReason) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-text-primary">Reason</legend>
        <div className="space-y-2">
          {FLAG_REASON_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 text-sm text-text-primary"
            >
              <input
                type="radio"
                name="credit-flag-reason"
                value={value}
                checked={reason === value}
                disabled={disabled}
                onChange={() => onReasonChange(value)}
                className="h-4 w-4 shrink-0 accent-brand-primary"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="credit-flag-notes" className="text-text-primary">
          Notes <span className="font-normal text-text-secondary">(optional)</span>
        </Label>
        <Textarea
          id="credit-flag-notes"
          value={notes}
          disabled={disabled}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add context for reviewers"
          maxLength={10000}
          className="min-h-20 resize-y"
        />
      </div>
    </div>
  );
}

export function CreditFlagTrigger({
  creditId,
  buildingId,
  show,
  onReported,
}: {
  creditId: string;
  buildingId: string;
  show: boolean;
  onReported: () => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (reason == null) {
        throw new Error("CreditFlagTrigger: missing reason");
      }
      return flagCredit(creditId, reason, notes.trim() || null);
    },
    onSuccess: () => {
      onReported();
      void queryClient.invalidateQueries({ queryKey: buildingCreditsQueryKey(buildingId) });
      toast({ title: "Credit reported — we'll review it" });
      setOpen(false);
      setNotes("");
      setReason(null);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Could not send report" });
    },
  });

  if (!show) return null;

  const fields = (
    <CreditFlagFormFields
      reason={reason}
      onReasonChange={setReason}
      notes={notes}
      onNotesChange={setNotes}
      disabled={mutation.isPending}
    />
  );

  const actions = (
    <div className="mt-4 flex justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={mutation.isPending}
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={mutation.isPending}
        onClick={() => {
          if (reason == null) {
            toast({ variant: "destructive", description: "Select a reason before submitting." });
            return;
          }
          mutation.mutate();
        }}
      >
        {mutation.isPending ? "Sending…" : "Submit report"}
      </Button>
    </div>
  );

  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-text-disabled hover:text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
      aria-label="Report issue with this credit"
    >
      <Flag className="h-3.5 w-3.5" aria-hidden />
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-text-disabled hover:text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Report issue with this credit"
          onClick={() => setOpen(true)}
        >
          <Flag className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <Sheet
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setNotes("");
              setReason(null);
            }
          }}
        >
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-none [&_button]:rounded-none!">
            <SheetHeader>
              <SheetTitle>Report credit</SheetTitle>
              <SheetDescription>
                Flag incorrect information. We review every report.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {fields}
              {actions}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setNotes("");
          setReason(null);
        }
      }}
    >
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent className="w-80 rounded-none [&_button]:rounded-none!" align="end" sideOffset={8}>
        <p className="mb-4 text-sm text-text-secondary">Flag incorrect information. We review every report.</p>
        {fields}
        {actions}
      </PopoverContent>
    </Popover>
  );
}
