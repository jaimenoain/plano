import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ZodError } from "zod";
import {
  leadWarningForRow,
  rowFromCredit,
  rowToUpdatePayload,
  tierLabel,
  type CreditEntryRow,
} from "../addCreditFormRow";
import {
  buildingCreditsQueryKey,
  CREDIT_ROLES,
  CREDIT_TIERS,
  updateBuildingCredit,
} from "../api/credits";
import { CreditEntityPicker } from "./CreditEntityPicker";
import { formatCreditRoleLabel } from "../formatCreditRole";
import type { BuildingCreditWithEntities, CreditRole, CreditTier } from "../types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export interface EditCreditFormProps {
  credit: BuildingCreditWithEntities;
  buildingId: string;
  /** Every credit on this building — powers the "already has a lead" hint. */
  existingCredits: BuildingCreditWithEntities[];
  onRequestClose: () => void;
}

/**
 * Correct one existing credit. Same field set, order and wording as a row of
 * `AddCreditForm` — the two are deliberately the same form seen twice, so
 * Task 2.3's progressive disclosure has one shape to restructure, not two.
 */
export function EditCreditForm({
  credit,
  buildingId,
  existingCredits,
  onRequestClose,
}: EditCreditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [row, setRow] = useState<CreditEntryRow>(() => rowFromCredit(credit));
  const [validationError, setValidationError] = useState<string | null>(null);

  const patch = useCallback(
    (next: Partial<CreditEntryRow>) => {
      setRow((prev) => ({ ...prev, ...next }));
      setValidationError(null);
    },
    [],
  );

  // The credit being edited is not competition for its own lead flag.
  const otherCredits = useMemo(
    () => existingCredits.filter((c) => c.id !== credit.id),
    [credit.id, existingCredits],
  );
  const leadHint = leadWarningForRow(row, otherCredits, [row]);

  const mutation = useMutation({
    mutationFn: async () => {
      const built = rowToUpdatePayload(row);
      if (!built.ok) throw new Error(built.message);
      return updateBuildingCredit(credit.id, built.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: buildingCreditsQueryKey(buildingId) });
      toast({ title: "Credit updated" });
      onRequestClose();
    },
    onError: (err: unknown) => {
      let message = "Could not save your changes";
      if (err instanceof ZodError) {
        message = err.issues[0]?.message ?? message;
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      setValidationError(message);
      toast({ variant: "destructive", title: "Could not save your changes", description: message });
    },
  });

  const disabled = mutation.isPending;

  return (
    <>
      <SheetHeader>
        <SheetTitle>Edit credit</SheetTitle>
        <SheetDescription>
          Correct who is credited, their role, or the details. Changes show on this building straight away.
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 flex max-h-[calc(100vh-8rem)] flex-col gap-6 overflow-hidden">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 pb-2">
          <div className="space-y-2">
            <Label className="text-text-primary">Person (optional)</Label>
            <CreditEntityPicker
              id="edit-credit-person"
              allowedKinds={["person"]}
              value={row.person}
              onChange={(next) =>
                // The person box can return a company (ADR 0030) — land it in the
                // Company slot below rather than dropping the pick on the floor.
                patch(next?.kind === "company" ? { person: null, company: next } : { person: next })
              }
              disabled={disabled}
              placeholder="Search or create a person…"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-text-primary">Company (optional)</Label>
            <CreditEntityPicker
              id="edit-credit-company"
              allowedKinds={["company"]}
              value={row.company}
              onChange={(next) => patch({ company: next?.kind === "company" ? next : null })}
              disabled={disabled}
              placeholder="Search or create a company…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-credit-role" className="text-text-primary">
              Role
            </Label>
            <Select
              value={row.role}
              disabled={disabled}
              onValueChange={(v) => patch({ role: v as CreditRole })}
            >
              <SelectTrigger id="edit-credit-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {formatCreditRoleLabel(role, null)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {row.role === "other" ? (
            <div className="space-y-2">
              <Label htmlFor="edit-credit-role-other" className="text-text-primary">
                Describe role
              </Label>
              <Input
                id="edit-credit-role-other"
                value={row.roleOtherText}
                disabled={disabled}
                onChange={(e) => patch({ roleOtherText: e.target.value })}
                maxLength={500}
                placeholder="e.g. Lighting artist"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="edit-credit-tier" className="text-text-primary">
              Credit tier
            </Label>
            <Select
              value={row.creditTier}
              disabled={disabled}
              onValueChange={(v) => patch({ creditTier: v as CreditTier })}
            >
              <SelectTrigger id="edit-credit-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_TIERS.map((tier) => (
                  <SelectItem key={tier} value={tier}>
                    {tierLabel(tier)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-credit-lead"
              checked={row.isLead}
              disabled={disabled}
              onCheckedChange={(c) => patch({ isLead: c === true })}
            />
            <Label htmlFor="edit-credit-lead" className="cursor-pointer text-sm font-normal text-text-primary">
              Lead for this role on this building
            </Label>
          </div>
          {leadHint ? <p className="text-sm text-text-secondary">{leadHint}</p> : null}

          <div className="space-y-2">
            <Label htmlFor="edit-credit-notes" className="text-text-primary">
              Contribution notes <span className="font-normal text-text-secondary">(max 500)</span>
            </Label>
            <Textarea
              id="edit-credit-notes"
              value={row.contributionNotes}
              disabled={disabled}
              onChange={(e) => patch({ contributionNotes: e.target.value })}
              maxLength={500}
              className="min-h-20 resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-credit-yf" className="text-text-primary">
                Year from
              </Label>
              <Input
                id="edit-credit-yf"
                inputMode="numeric"
                value={row.yearFrom}
                disabled={disabled}
                onChange={(e) => patch({ yearFrom: e.target.value })}
                placeholder="e.g. 2018"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-credit-yt" className="text-text-primary">
                Year to
              </Label>
              <Input
                id="edit-credit-yt"
                inputMode="numeric"
                value={row.yearTo}
                disabled={disabled}
                onChange={(e) => patch({ yearTo: e.target.value })}
                placeholder="e.g. 2020"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-credit-url" className="text-text-primary">
              Project URL <span className="font-normal text-text-secondary">(optional)</span>
            </Label>
            <Input
              id="edit-credit-url"
              value={row.projectUrl}
              disabled={disabled}
              onChange={(e) => patch({ projectUrl: e.target.value })}
              placeholder="https://…"
              maxLength={2000}
            />
          </div>

          {validationError ? (
            <p className="text-sm text-destructive" role="alert">
              {validationError}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 space-y-3 border-t border-border-default pt-4">
          <Button
            type="button"
            size="sm"
            className="w-full uppercase tracking-widest"
            disabled={disabled}
            onClick={() => {
              const built = rowToUpdatePayload(row);
              if (!built.ok) {
                setValidationError(built.message);
                toast({ variant: "destructive", title: "Check your entries", description: built.message });
                return;
              }
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full uppercase tracking-widest"
            disabled={disabled}
            onClick={onRequestClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </>
  );
}
