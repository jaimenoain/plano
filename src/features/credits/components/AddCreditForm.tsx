import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ZodError } from "zod";
import {
  createEmptyRow,
  errorIsInDetails,
  leadWarningForRow,
  rowToPayload,
  type CreditEntryRow,
} from "../addCreditFormRow";
import {
  addBuildingCredit,
  buildingCreditsQueryKey,
  CREDIT_ROLES,
} from "@/features/credits/api/credits";
import { CreditDetailsDisclosure } from "./CreditDetailsDisclosure";
import { CreditEntityPicker } from "@/features/credits/components/CreditEntityPicker";
import { formatCreditRoleLabel } from "@/features/credits/formatCreditRole";
import type { BuildingCreditWithEntities, CreditRole } from "@/features/credits/types";
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
import { ToastAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface AddCreditFormProps {
  buildingId: string;
  existingCredits: BuildingCreditWithEntities[];
  /**
   * Every row saved. The host closes the drawer; the success toast offers the
   * optional email step, which the host reopens with these ids.
   */
  onSaved: (creditIds: string[]) => void;
  /** Reopens the drawer on the notify step. */
  onRequestNotify: (creditIds: string[]) => void;
}

export function AddCreditForm({
  buildingId,
  existingCredits,
  onSaved,
  onRequestNotify,
}: AddCreditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<CreditEntryRow[]>(() => [createEmptyRow()]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  /** Row keys whose "Show more details" section is expanded. Every row starts folded. */
  const [openDetailKeys, setOpenDetailKeys] = useState<string[]>([]);

  const setDetailsOpen = useCallback((key: string, open: boolean) => {
    setOpenDetailKeys((prev) =>
      open ? (prev.includes(key) ? prev : [...prev, key]) : prev.filter((k) => k !== key),
    );
  }, []);

  const updateRow = useCallback((key: string, patch: Partial<CreditEntryRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow()]);
  }, []);

  const removeRow = useCallback((key: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }, []);

  /**
   * A save is finished when the drawer is gone and the list has the new rows.
   * Emailing the people credited is a separate, optional errand, so it rides on
   * the confirmation rather than standing between the user and the page.
   */
  const finish = useCallback(
    (creditIds: string[]) => {
      toast({
        title: creditIds.length > 1 ? "Credits added" : "Credit added",
        action:
          creditIds.length > 0 ? (
            <ToastAction altText="Notify the people you credited" onClick={() => onRequestNotify(creditIds)}>
              Notify them
            </ToastAction>
          ) : undefined,
      });
      onSaved(creditIds);
    },
    [onRequestNotify, onSaved, toast],
  );

  const handleSubmit = useCallback(async () => {
    const savedIdsOf = (list: CreditEntryRow[]) =>
      list
        .map((r) => r.submittedCreditId)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

    // Everything already saved: nothing left to do but confirm and get out of the way.
    const toSubmit = rows.filter((r) => r.submitStatus !== "success");
    if (toSubmit.length === 0) {
      finish(savedIdsOf(rows));
      return;
    }

    setRows((prev) =>
      prev.map((r) =>
        toSubmit.some((t) => t.key === r.key)
          ? { ...r, validationError: null, submitError: null }
          : r,
      ),
    );

    for (const row of toSubmit) {
      const built = rowToPayload(buildingId, row);
      if (!built.ok) {
        setRows((prev) =>
          prev.map((r) => (r.key === row.key ? { ...r, validationError: built.message } : r)),
        );
        // Never reject a value the user cannot see — unfold the section holding it.
        if (errorIsInDetails(built.message)) setDetailsOpen(row.key, true);
        toast({ variant: "destructive", title: "Check your entries", description: built.message });
        return;
      }
    }

    setBatchSubmitting(true);
    let apiFailures = 0;
    const createdIds: string[] = [];

    for (const row of toSubmit) {
      const built = rowToPayload(buildingId, row);
      if (!built.ok) continue;

      setRows((prev) => {
        return prev.map((r) => (r.key === row.key ? { ...r, submitStatus: "pending", submitError: null } : r));
      });

      try {
        const created = await addBuildingCredit(built.data);
        createdIds.push(created.id);
        setRows((prev) => {
          return prev.map((r) =>
            r.key === row.key
              ? {
                  ...r,
                  submitStatus: "success",
                  submitError: null,
                  validationError: null,
                  submittedCreditId: created.id,
                }
              : r,
          );
        });
      } catch (err: unknown) {
        apiFailures += 1;
        let message = "Could not save this credit";
        if (err instanceof ZodError) {
          message = err.issues[0]?.message ?? message;
        } else if (err instanceof Error && err.message) {
          message = err.message;
        }
        setRows((prev) => {
          return prev.map((r) =>
            r.key === row.key ? { ...r, submitStatus: "error", submitError: message, validationError: null } : r,
          );
        });
      }
    }

    if (createdIds.length > 0) {
      void queryClient.invalidateQueries({ queryKey: buildingCreditsQueryKey(buildingId) });
    }

    setBatchSubmitting(false);

    // A partial failure keeps the drawer open on the rows that still need fixing.
    if (apiFailures === 0) {
      finish([...savedIdsOf(rows), ...createdIds]);
    }
  }, [buildingId, finish, queryClient, rows, setDetailsOpen, toast]);

  const pendingCount = useMemo(() => rows.filter((r) => r.submitStatus !== "success").length, [rows]);
  const allRowsSaved = useMemo(
    () => rows.length > 0 && rows.every((r) => r.submitStatus === "success"),
    [rows],
  );

  return (
    <>
      <SheetHeader>
        <SheetTitle>Add credits</SheetTitle>
        <SheetDescription>
          Add one or more credits for this building. At least a person or a company is required per row.
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 flex max-h-[calc(100vh-8rem)] flex-col gap-6 overflow-hidden">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1 pb-2">
          {rows.map((row, index) => {
            const leadHint = leadWarningForRow(row, existingCredits, rows);
            const disabled = row.submitStatus === "success" || batchSubmitting;

            return (
              <div
                key={row.key}
                className={cn(
                  "space-y-4 rounded-none border border-border-default bg-surface-muted p-4",
                  row.submitStatus === "success" && "border-border-default opacity-90",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                    Credit {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    {row.submitStatus === "success" ? (
                      <span className="text-2xs font-medium uppercase tracking-widest text-text-secondary">Saved</span>
                    ) : null}
                    {row.submitStatus === "error" ? (
                      <span className="text-2xs font-medium uppercase tracking-widest text-destructive">Error</span>
                    ) : null}
                    {rows.length > 1 && row.submitStatus !== "success" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-text-secondary"
                        disabled={batchSubmitting}
                        onClick={() => removeRow(row.key)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-text-primary">Person (optional)</Label>
                  <CreditEntityPicker
                    id={`add-credit-person-${row.key}`}
                    allowedKinds={["person"]}
                    value={row.person}
                    onChange={(next) =>
                      // The person box can return a company: architects imported
                      // into `companies` are offered there so nobody is duplicated
                      // (ADR 0030). Land it in the Company slot, which sits right
                      // below, rather than dropping the pick on the floor.
                      updateRow(
                        row.key,
                        next?.kind === "company"
                          ? { person: null, company: next }
                          : { person: next },
                      )
                    }
                    disabled={disabled}
                    placeholder="Search or create a person…"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-text-primary">Company (optional)</Label>
                  <CreditEntityPicker
                    id={`add-credit-company-${row.key}`}
                    allowedKinds={["company"]}
                    value={row.company}
                    onChange={(next) => updateRow(row.key, { company: next?.kind === "company" ? next : null })}
                    disabled={disabled}
                    placeholder="Search or create a company…"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`add-credit-role-${row.key}`} className="text-text-primary">
                    Role
                  </Label>
                  <Select
                    value={row.role}
                    disabled={disabled}
                    onValueChange={(v) => updateRow(row.key, { role: v as CreditRole })}
                  >
                    <SelectTrigger id={`add-credit-role-${row.key}`}>
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
                    <Label htmlFor={`add-credit-role-other-${row.key}`} className="text-text-primary">
                      Describe role
                    </Label>
                    <Input
                      id={`add-credit-role-other-${row.key}`}
                      value={row.roleOtherText}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.key, { roleOtherText: e.target.value })}
                      maxLength={500}
                      placeholder="e.g. Lighting artist"
                    />
                  </div>
                ) : null}

                <CreditDetailsDisclosure
                  idPrefix={`add-credit-${row.key}`}
                  row={row}
                  disabled={disabled}
                  leadHint={leadHint}
                  open={openDetailKeys.includes(row.key)}
                  onOpenChange={(open) => setDetailsOpen(row.key, open)}
                  onPatch={(next) => updateRow(row.key, next)}
                />

                {row.validationError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {row.validationError}
                  </p>
                ) : null}
                {row.submitError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {row.submitError}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="shrink-0 space-y-3 border-t border-border-default pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full uppercase tracking-widest"
            disabled={batchSubmitting}
            onClick={addRow}
          >
            Add another
          </Button>
          <Button
            type="button"
            size="sm"
            className="w-full uppercase tracking-widest"
            disabled={batchSubmitting || (pendingCount === 0 && !allRowsSaved)}
            onClick={() => void handleSubmit()}
          >
            {batchSubmitting ? "Saving…" : allRowsSaved ? "Done" : `Submit (${pendingCount})`}
          </Button>
        </div>
      </div>
    </>
  );
}
