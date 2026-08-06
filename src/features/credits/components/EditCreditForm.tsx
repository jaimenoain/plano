import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ZodError } from "zod";
import {
  errorIsInDetails,
  leadWarningForRow,
  rowFromCredit,
  rowHasDetailContent,
  rowToUpdatePayload,
  type CreditEntryRow,
} from "../addCreditFormRow";
import { buildingCreditsQueryKey, CREDIT_ROLES, updateBuildingCredit } from "../api/credits";
import { CreditDetailsDisclosure } from "./CreditDetailsDisclosure";
import { CreditEntityPicker } from "./CreditEntityPicker";
import { formatCreditRoleLabel } from "../formatCreditRole";
import type { BuildingCreditWithEntities, CreditRole } from "../types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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

export interface EditCreditFormProps {
  credit: BuildingCreditWithEntities;
  buildingId: string;
  /** Every credit on this building — powers the "already has a lead" hint. */
  existingCredits: BuildingCreditWithEntities[];
  onRequestClose: () => void;
}

/**
 * Correct one existing credit. Same field set, order and wording as a row of
 * `AddCreditForm` — the two are deliberately the same form seen twice, and the
 * folded half of it is literally the same component, `CreditDetailsDisclosure`.
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
  // A credit that already carries tier/lead/notes/years/URL opens expanded —
  // otherwise the edit form would look like it had lost them.
  const [detailsOpen, setDetailsOpen] = useState(() => rowHasDetailContent(row));

  /** Surface a rejected value even when its field is folded away. */
  const failValidation = useCallback((message: string) => {
    setValidationError(message);
    if (errorIsInDetails(message)) setDetailsOpen(true);
  }, []);

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
      failValidation(message);
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

          <CreditDetailsDisclosure
            idPrefix="edit-credit"
            row={row}
            disabled={disabled}
            leadHint={leadHint}
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            onPatch={patch}
          />

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
                failValidation(built.message);
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
