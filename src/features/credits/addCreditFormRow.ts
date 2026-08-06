import type {
  AddBuildingCreditInput,
  UpdateBuildingCreditInput,
} from "@/features/credits/api/credits";
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

/**
 * `rowToPayload` validates the whole row including the building it belongs to, and
 * an update patch carries no building. This stand-in satisfies the shared uuid
 * validation and is dropped before the patch leaves `rowToUpdatePayload`.
 */
const PLACEHOLDER_BUILDING_ID = "00000000-0000-0000-0000-000000000000";

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

/**
 * Seed a form row from a credit that already exists — the inverse of
 * `createEmptyRow`. Add and edit share one row model so the field set only has to
 * be laid out once.
 */
export function rowFromCredit(credit: BuildingCreditWithEntities): CreditEntryRow {
  return {
    key: newRowKey(),
    person: credit.person
      ? { kind: "person", id: credit.person.id, name: credit.person.name, slug: credit.person.slug }
      : null,
    company: credit.company
      ? {
          kind: "company",
          id: credit.company.id,
          name: credit.company.name,
          slug: credit.company.slug,
        }
      : null,
    role: credit.role,
    roleOtherText: credit.role === "other" ? (credit.roleCustom ?? "") : "",
    creditTier: credit.creditTier,
    isLead: credit.isLead,
    contributionNotes: credit.contributionNotes ?? "",
    yearFrom: credit.yearFrom != null ? String(credit.yearFrom) : "",
    yearTo: credit.yearTo != null ? String(credit.yearTo) : "",
    projectUrl: credit.projectUrl ?? "",
    submitStatus: "idle",
    submitError: null,
    validationError: null,
    submittedCreditId: credit.id,
  };
}

/** The two messages raised by fields that stay visible above the disclosure. */
const VISIBLE_FIELD_MESSAGES = [
  "Choose a person and/or a company",
  "Describe the role when selecting Other",
];

/**
 * True when the row carries anything in the fields folded behind "Show more
 * details" (Roadmap Task 2.3). Editing such a credit opens the section, so no
 * stored value is ever hidden from the person correcting it.
 */
export function rowHasDetailContent(row: CreditEntryRow): boolean {
  return (
    row.creditTier !== "contributor" ||
    row.isLead ||
    row.contributionNotes.trim().length > 0 ||
    row.yearFrom.trim().length > 0 ||
    row.yearTo.trim().length > 0 ||
    row.projectUrl.trim().length > 0
  );
}

/** True when a validation message points at a field inside the folded section. */
export function errorIsInDetails(message: string): boolean {
  return !VISIBLE_FIELD_MESSAGES.includes(message);
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

/**
 * Validate an edited row and shape it for `updateBuildingCredit`. Same rules and
 * same wording as `rowToPayload` — an edit that would be rejected as an add must
 * be rejected here too, and the user must not have to learn two vocabularies.
 */
export function rowToUpdatePayload(
  row: CreditEntryRow,
): { ok: true; data: UpdateBuildingCreditInput } | { ok: false; message: string } {
  const built = rowToPayload(PLACEHOLDER_BUILDING_ID, row);
  if (!built.ok) return built;

  const { buildingId: _buildingId, ...rest } = built.data;
  return { ok: true, data: rest };
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
