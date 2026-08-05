import type { AddBuildingCreditInput } from "@/features/credits/api/credits";
import type { CreditEntitySelection } from "./components/CreditEntityPicker";
import type { BuildingCreditWithEntities, CreditRole, CreditTier } from "./types";

export type SubmitStatus = "idle" | "pending" | "success" | "error";

/** One editable row of the Add-credits form, before it becomes a credit. */
export interface CreditEntryRow {
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

export function createEmptyRow(): CreditEntryRow {
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

export function tierLabel(tier: CreditTier): string {
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

/**
 * Validate a row and shape it for `addBuildingCredit`. A row needs a person
 * and/or a company — company-only is normal, and is what an architect filed in
 * `companies` produces when picked from the person box (ADR 0030).
 */
export function rowToPayload(
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

/** Non-blocking hint when this row claims a lead already taken for the same role. */
export function leadWarningForRow(
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
