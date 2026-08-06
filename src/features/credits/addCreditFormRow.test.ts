import { describe, expect, it } from "vitest";
import {
  createEmptyRow,
  rowFromCredit,
  withRoleDefaults,
  type CreditEntryRow,
} from "./addCreditFormRow";
import type { BuildingCreditWithEntities, CreditRole, CreditStatus, CreditTier } from "./types";

function credit(over: Partial<BuildingCreditWithEntities> = {}): BuildingCreditWithEntities {
  return {
    id: over.id ?? "c1",
    buildingId: "b1",
    personId: null,
    companyId: null,
    role: (over.role ?? "design_architecture") as CreditRole,
    roleCustom: over.roleCustom ?? null,
    creditTier: (over.creditTier ?? "contributor") as CreditTier,
    isLead: over.isLead ?? false,
    contributionNotes: null,
    yearFrom: null,
    yearTo: null,
    projectUrl: null,
    status: (over.status ?? "active") as CreditStatus,
    flagReason: null,
    flagNotes: null,
    flaggedAt: null,
    flaggedFromStatus: null,
    flaggedByUserId: null,
    addedByUserId: null,
    displayOrder: 0,
    companyPortfolioRank: null,
    createdAt: "2026-08-06T00:00:00Z",
    updatedAt: "2026-08-06T00:00:00Z",
    person: null,
    company: null,
    note: null,
  } as BuildingCreditWithEntities;
}

function row(over: Partial<CreditEntryRow> = {}): CreditEntryRow {
  return { ...createEmptyRow(), ...over };
}

const only = (rows: CreditEntryRow[]) => ({ creditTier: rows[0]!.creditTier, isLead: rows[0]!.isLead });

describe("withRoleDefaults", () => {
  it("makes the first credit for a role the primary lead", () => {
    expect(only(withRoleDefaults([row()], []))).toEqual({ creditTier: "primary", isLead: true });
  });

  it("steps down behind an existing lead for the same role", () => {
    const existing = [credit({ role: "design_architecture", isLead: true, creditTier: "contributor" })];
    expect(only(withRoleDefaults([row()], existing))).toEqual({
      creditTier: "contributor",
      isLead: false,
    });
  });

  it("steps down behind an existing primary that is not flagged lead", () => {
    const existing = [credit({ role: "design_architecture", creditTier: "primary", isLead: false })];
    expect(only(withRoleDefaults([row()], existing))).toEqual({
      creditTier: "contributor",
      isLead: false,
    });
  });

  it("counts a claim of any status, so it never ticks a lead the form would then warn about", () => {
    for (const status of ["flagged", "hidden", "verified"] as CreditStatus[]) {
      const existing = [credit({ role: "design_architecture", isLead: true, status })];
      expect(only(withRoleDefaults([row()], existing))).toEqual({
        creditTier: "contributor",
        isLead: false,
      });
    }
  });

  it("ignores a claim on a different role", () => {
    const existing = [credit({ role: "structural_engineering", isLead: true, creditTier: "primary" })];
    expect(only(withRoleDefaults([row({ role: "design_architecture" })], existing))).toEqual({
      creditTier: "primary",
      isLead: true,
    });
  });

  it("compares the free-text role when the role is Other", () => {
    const existing = [
      credit({ role: "other", roleCustom: "Lighting artist", isLead: true, creditTier: "primary" }),
    ];

    const same = withRoleDefaults([row({ role: "other", roleOtherText: " Lighting artist " })], existing);
    expect(only(same)).toEqual({ creditTier: "contributor", isLead: false });

    const different = withRoleDefaults([row({ role: "other", roleOtherText: "Acoustics" })], existing);
    expect(only(different)).toEqual({ creditTier: "primary", isLead: true });
  });

  it("demotes a second row that repeats the first row's role", () => {
    const result = withRoleDefaults([row(), row()], []);
    expect(result[0]).toMatchObject({ creditTier: "primary", isLead: true });
    expect(result[1]).toMatchObject({ creditTier: "contributor", isLead: false });
  });

  it("lets each row lead its own role", () => {
    const result = withRoleDefaults([row(), row({ role: "structural_engineering" })], []);
    expect(result[0]).toMatchObject({ creditTier: "primary", isLead: true });
    expect(result[1]).toMatchObject({ creditTier: "primary", isLead: true });
  });

  it("leaves a row the user has set by hand alone", () => {
    const chosen = row({ creditTier: "ancillary", isLead: false, defaultsOverridden: true });
    expect(only(withRoleDefaults([chosen], []))).toEqual({ creditTier: "ancillary", isLead: false });
  });

  it("still counts an overridden row as a claim for the rows below it", () => {
    const chosen = row({ creditTier: "primary", isLead: true, defaultsOverridden: true });
    const result = withRoleDefaults([chosen, row()], []);
    expect(result[1]).toMatchObject({ creditTier: "contributor", isLead: false });
  });

  it("never rewrites a row that is already saved", () => {
    const saved = row({ submitStatus: "success", creditTier: "ancillary", isLead: false });
    expect(only(withRoleDefaults([saved], []))).toEqual({ creditTier: "ancillary", isLead: false });
  });
});

describe("row seeding", () => {
  it("opens a blank row to the defaults engine and a stored credit closed to it", () => {
    expect(createEmptyRow().defaultsOverridden).toBe(false);
    expect(rowFromCredit(credit({ creditTier: "ancillary" })).defaultsOverridden).toBe(true);
  });
});
