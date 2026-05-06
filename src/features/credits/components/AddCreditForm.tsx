import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, X } from "lucide-react";
import { ZodError } from "zod";
import {
  addBuildingCredit,
  buildingCreditsQueryKey,
  CREDIT_ROLES,
  CREDIT_TIERS,
  notifyCreditedEntities,
  type AddBuildingCreditInput,
} from "@/features/credits/api/credits";
import { CreditEntityPicker, type CreditEntitySelection } from "@/features/credits/components/CreditEntityPicker";
import { formatCreditRoleLabel } from "@/features/credits/formatCreditRole";
import type { BuildingCreditWithEntities, CreditRole, CreditTier } from "@/features/credits/types";
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
import {
  CREDIT_NOTIFY_MAX_RECIPIENTS,
  parseCreditNotifyEmails,
} from "@/lib/parse-credit-notify-emails";
import { cn } from "@/lib/utils";
import { getBuildingUrl } from "@/utils/url";

type SubmitStatus = "idle" | "pending" | "success" | "error";

interface CreditEntryRow {
  key: string;
  person: CreditEntitySelection | null;
  company: CreditEntitySelection | null;
  role: CreditRole;
  roleOtherText: string;
  creditTier: CreditTier;
  isLead: boolean;
  contributionNotes: string;
  yearFrom: string;
  yearTo: string;
  projectUrl: string;
  submitStatus: SubmitStatus;
  submitError: string | null;
  validationError: string | null;
  /** Set when this row was saved successfully in this session (for the notify step). */
  submittedCreditId: string | null;
}

function newRowKey(): string {
  return crypto.randomUUID();
}

function createEmptyRow(): CreditEntryRow {
  return {
    key: newRowKey(),
    person: null,
    company: null,
    role: "design_architecture",
    roleOtherText: "",
    creditTier: "contributor",
    isLead: false,
    contributionNotes: "",
    yearFrom: "",
    yearTo: "",
    projectUrl: "",
    submitStatus: "idle",
    submitError: null,
    validationError: null,
    submittedCreditId: null,
  };
}

function rolesMatchForLead(
  a: { role: CreditRole; roleCustom: string | null },
  b: { role: CreditRole; roleCustom: string | null },
): boolean {
  if (a.role !== b.role) return false;
  if (a.role !== "other") return true;
  return (a.roleCustom?.trim() ?? "") === (b.roleCustom?.trim() ?? "");
}

function tierLabel(tier: CreditTier): string {
  if (tier === "primary") return "Primary";
  if (tier === "contributor") return "Contributor";
  return "Additional";
}

function parseOptionalYear(raw: string): { value: number | null; error: string | null } {
  const t = raw.trim();
  if (!t) return { value: null, error: null };
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1000 || n > 2100) {
    return { value: null, error: "Year must be between 1000 and 2100" };
  }
  return { value: n, error: null };
}

function rowToPayload(
  buildingId: string,
  row: CreditEntryRow,
): { ok: true; data: AddBuildingCreditInput } | { ok: false; message: string } {
  const hasPerson = row.person?.kind === "person";
  const hasCompany = row.company?.kind === "company";
  if (!hasPerson && !hasCompany) {
    return { ok: false, message: "Choose a person and/or a company" };
  }

  const yf = parseOptionalYear(row.yearFrom);
  const yt = parseOptionalYear(row.yearTo);
  if (yf.error) return { ok: false, message: yf.error };
  if (yt.error) return { ok: false, message: yt.error };

  const notes = row.contributionNotes.trim();
  if (notes.length > 500) {
    return { ok: false, message: "Contribution notes must be at most 500 characters" };
  }

  const roleCustom =
    row.role === "other" ? (row.roleOtherText.trim() ? row.roleOtherText.trim() : null) : null;
  if (row.role === "other" && !roleCustom) {
    return { ok: false, message: "Describe the role when selecting Other" };
  }

  const url = row.projectUrl.trim();
  const projectUrl = url.length > 0 ? url : null;

  return {
    ok: true,
    data: {
      buildingId,
      personId: hasPerson ? row.person!.id : null,
      companyId: hasCompany ? row.company!.id : null,
      role: row.role,
      roleCustom,
      creditTier: row.creditTier,
      isLead: row.isLead,
      contributionNotes: notes.length > 0 ? notes : null,
      yearFrom: yf.value,
      yearTo: yt.value,
      projectUrl,
    },
  };
}

function leadWarningForRow(
  row: CreditEntryRow,
  existingCredits: BuildingCreditWithEntities[],
  allRows: CreditEntryRow[],
): string | null {
  if (!row.isLead) return null;
  const rc = row.role === "other" ? row.roleOtherText.trim() || null : null;
  const self = { role: row.role, roleCustom: rc };

  const existingLead = existingCredits.some(
    (c) => c.isLead && rolesMatchForLead(self, { role: c.role, roleCustom: c.roleCustom }),
  );
  if (existingLead) {
    return "This building already has a lead credit for this role. You can still submit.";
  }

  const otherLead = allRows.some(
    (r) =>
      r.key !== row.key &&
      r.isLead &&
      rolesMatchForLead(self, {
        role: r.role,
        roleCustom: r.role === "other" ? r.roleOtherText.trim() || null : null,
      }),
  );
  if (otherLead) {
    return "Another entry in this form is already marked lead for this role. You can still submit.";
  }

  return null;
}

export interface AddCreditFormProps {
  buildingId: string;
  buildingName?: string | null;
  existingCredits: BuildingCreditWithEntities[];
  onRequestClose: () => void;
}

export function AddCreditForm({
  buildingId,
  buildingName,
  existingCredits,
  onRequestClose,
}: AddCreditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"form" | "notify">("form");
  const [rows, setRows] = useState<CreditEntryRow[]>(() => [createEmptyRow()]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [notifyDraft, setNotifyDraft] = useState("");
  const [notifyRemovedEmails, setNotifyRemovedEmails] = useState<string[]>([]);
  const [notifySending, setNotifySending] = useState(false);

  const parsedNotify = useMemo(() => parseCreditNotifyEmails(notifyDraft), [notifyDraft]);
  const visibleNotifyEmails = useMemo(
    () => parsedNotify.accepted.filter((e) => !notifyRemovedEmails.includes(e)),
    [parsedNotify.accepted, notifyRemovedEmails],
  );
  const sessionCreditIds = useMemo(
    () =>
      rows
        .map((r) => r.submittedCreditId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    [rows],
  );

  const updateRow = useCallback((key: string, patch: Partial<CreditEntryRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow()]);
  }, []);

  const removeRow = useCallback((key: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }, []);

  const handleSubmit = useCallback(async () => {
    const toSubmit = rows.filter((r) => r.submitStatus !== "success");
    if (toSubmit.length === 0) {
      setStep("notify");
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
        toast({ variant: "destructive", title: "Check your entries", description: built.message });
        return;
      }
    }

    setBatchSubmitting(true);
    let apiFailures = 0;
    let anyApiSuccess = false;

    for (const row of toSubmit) {
      const built = rowToPayload(buildingId, row);
      if (!built.ok) continue;

      setRows((prev) => {
        return prev.map((r) => (r.key === row.key ? { ...r, submitStatus: "pending", submitError: null } : r));
      });

      try {
        const created = await addBuildingCredit(built.data);
        anyApiSuccess = true;
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

    if (anyApiSuccess) {
      void queryClient.invalidateQueries({ queryKey: buildingCreditsQueryKey(buildingId) });
    }

    setBatchSubmitting(false);

    if (apiFailures === 0) {
      setStep("notify");
    }
  }, [buildingId, queryClient, rows, toast]);

  const pendingCount = useMemo(() => rows.filter((r) => r.submitStatus !== "success").length, [rows]);
  const allRowsSaved = useMemo(
    () => rows.length > 0 && rows.every((r) => r.submitStatus === "success"),
    [rows],
  );

  const handleNotifySend = useCallback(async () => {
    if (visibleNotifyEmails.length === 0) {
      toast({ variant: "destructive", title: "Add an email", description: "Enter at least one valid address." });
      return;
    }
    if (sessionCreditIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Nothing to send",
        description: "No saved credits were found for this session.",
      });
      return;
    }
    setNotifySending(true);
    try {
      await notifyCreditedEntities({ creditIds: sessionCreditIds, emails: visibleNotifyEmails });
      toast({ title: "Notifications sent", description: "Recipients will receive an email from Plano." });
      onRequestClose();
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : "Could not send notifications";
      toast({ variant: "destructive", title: "Send failed", description: message });
    } finally {
      setNotifySending(false);
    }
  }, [onRequestClose, sessionCreditIds, toast, visibleNotifyEmails]);

  const removeNotifyPill = useCallback((email: string) => {
    setNotifyRemovedEmails((prev) => (prev.includes(email) ? prev : [...prev, email]));
  }, []);

  const handleCopyInvitation = useCallback(() => {
    const url = window.location.origin + getBuildingUrl(buildingId);
    const name = buildingName?.trim() || "this building";
    const text = `I've credited your work at ${name}, take a look here\n${url}`;

    void navigator.clipboard.writeText(text);
    toast({ title: "Message and link copied" });
  }, [buildingId, buildingName, toast]);

  if (step === "notify") {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Notify credited people</SheetTitle>
          <SheetDescription>
            Notify the people you have credited — paste their email addresses below. This step is optional.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          {sessionCreditIds.length === 0 ? (
            <p className="text-sm text-text-secondary" role="alert">
              No credits from this session were found. You can close this sheet.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="add-credit-notify-emails" className="text-text-primary">
              Email addresses
            </Label>
            <Textarea
              id="add-credit-notify-emails"
              value={notifyDraft}
              disabled={notifySending}
              onChange={(e) => {
                setNotifyDraft(e.target.value);
                setNotifyRemovedEmails([]);
              }}
              className="min-h-24 resize-y"
              placeholder={"one@example.com, other@example.com\nor one address per line"}
              autoComplete="off"
            />
            <p className="text-2xs text-text-secondary">
              Separate with commas or new lines. Up to {CREDIT_NOTIFY_MAX_RECIPIENTS} addresses; duplicates are merged.
            </p>
          </div>

          {parsedNotify.invalid.length > 0 ? (
            <p className="text-sm text-destructive" role="alert">
              Skipping invalid: {parsedNotify.invalid.slice(0, 5).join(", ")}
              {parsedNotify.invalid.length > 5 ? "…" : ""}
            </p>
          ) : null}
          {parsedNotify.truncated > 0 ? (
            <p className="text-sm text-text-secondary" role="status">
              Only the first {CREDIT_NOTIFY_MAX_RECIPIENTS} valid addresses will be used ({parsedNotify.truncated}{" "}
              ignored).
            </p>
          ) : null}

          {visibleNotifyEmails.length > 0 ? (
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-widest text-text-secondary">Sending to</span>
              <div className="flex flex-wrap gap-2">
                {visibleNotifyEmails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-1 rounded-none border border-border-default bg-surface-muted py-1 pl-2 pr-1"
                  >
                    <span className="max-w-search-serp-alt truncate text-sm text-text-primary">{email}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 shrink-0 p-0 text-text-secondary"
                      disabled={notifySending}
                      onClick={() => removeNotifyPill(email)}
                      aria-label={`Remove ${email}`}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3 rounded-none border border-border-default bg-surface-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-secondary">
                Share manually
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 text-text-primary hover:bg-surface-muted"
                onClick={handleCopyInvitation}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </Button>
            </div>
            <div className="rounded-none border border-border-tertiary bg-surface-muted p-3 text-sm leading-relaxed text-text-primary">
              <p>I&apos;ve credited your work at {buildingName?.trim() || "this building"}, take a look here:</p>
              <p className="mt-1 break-all text-text-secondary underline">
                {window.location.origin + getBuildingUrl(buildingId)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border-default pt-4">
            <Button
              type="button"
              size="sm"
              className="w-full uppercase tracking-widest"
              disabled={
                notifySending ||
                sessionCreditIds.length === 0 ||
                visibleNotifyEmails.length === 0 ||
                parsedNotify.invalid.length > 0
              }
              onClick={() => void handleNotifySend()}
            >
              {notifySending ? "Sending…" : "Send notifications"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full uppercase tracking-widest"
              disabled={notifySending}
              onClick={onRequestClose}
            >
              Skip
            </Button>
          </div>
        </div>
      </>
    );
  }

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
                    onChange={(next) => updateRow(row.key, { person: next?.kind === "person" ? next : null })}
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

                <div className="space-y-2">
                  <Label htmlFor={`add-credit-tier-${row.key}`} className="text-text-primary">
                    Credit tier
                  </Label>
                  <Select
                    value={row.creditTier}
                    disabled={disabled}
                    onValueChange={(v) => updateRow(row.key, { creditTier: v as CreditTier })}
                  >
                    <SelectTrigger id={`add-credit-tier-${row.key}`}>
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
                    id={`add-credit-lead-${row.key}`}
                    checked={row.isLead}
                    disabled={disabled}
                    onCheckedChange={(c) => updateRow(row.key, { isLead: c === true })}
                  />
                  <Label htmlFor={`add-credit-lead-${row.key}`} className="cursor-pointer text-sm font-normal text-text-primary">
                    Lead for this role on this building
                  </Label>
                </div>
                {leadHint ? <p className="text-sm text-text-secondary">{leadHint}</p> : null}

                <div className="space-y-2">
                  <Label htmlFor={`add-credit-notes-${row.key}`} className="text-text-primary">
                    Contribution notes <span className="font-normal text-text-secondary">(max 500)</span>
                  </Label>
                  <Textarea
                    id={`add-credit-notes-${row.key}`}
                    value={row.contributionNotes}
                    disabled={disabled}
                    onChange={(e) => updateRow(row.key, { contributionNotes: e.target.value })}
                    maxLength={500}
                    className="min-h-20 resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`add-credit-yf-${row.key}`} className="text-text-primary">
                      Year from
                    </Label>
                    <Input
                      id={`add-credit-yf-${row.key}`}
                      inputMode="numeric"
                      value={row.yearFrom}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.key, { yearFrom: e.target.value })}
                      placeholder="e.g. 2018"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`add-credit-yt-${row.key}`} className="text-text-primary">
                      Year to
                    </Label>
                    <Input
                      id={`add-credit-yt-${row.key}`}
                      inputMode="numeric"
                      value={row.yearTo}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.key, { yearTo: e.target.value })}
                      placeholder="e.g. 2020"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`add-credit-url-${row.key}`} className="text-text-primary">
                    Project URL <span className="font-normal text-text-secondary">(optional)</span>
                  </Label>
                  <Input
                    id={`add-credit-url-${row.key}`}
                    value={row.projectUrl}
                    disabled={disabled}
                    onChange={(e) => updateRow(row.key, { projectUrl: e.target.value })}
                    placeholder="https://…"
                    maxLength={2000}
                  />
                </div>

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
            {batchSubmitting ? "Saving…" : allRowsSaved ? "Continue" : `Submit (${pendingCount})`}
          </Button>
        </div>
      </div>
    </>
  );
}
