import { describe, it, expect } from "vitest";
import type { BuildingCreditWithEntities } from "@/features/credits/types";
import {
  leadAttributionFromCredits,
  primaryCreditPlainLabel,
  visiblePrimaryCredits,
} from "@/features/credits/buildingCreditDisplay";

function mkCredit(
  over: Partial<BuildingCreditWithEntities> & Pick<BuildingCreditWithEntities, "id">,
): BuildingCreditWithEntities {
  const base: BuildingCreditWithEntities = {
    id: over.id,
    buildingId: "b1",
    personId: null,
    companyId: null,
    role: "design_architect",
    roleCustom: null,
    creditTier: "primary",
    isLead: false,
    contributionNotes: null,
    yearFrom: null,
    yearTo: null,
    projectUrl: null,
    status: "active",
    flagReason: null,
    flagNotes: null,
    flaggedAt: null,
    flaggedFromStatus: null,
    flaggedByUserId: null,
    addedByUserId: null,
    displayOrder: 0,
    createdAt: "t",
    updatedAt: "t",
    person: null,
    company: null,
    ...over,
  };
  return base;
}

describe("buildingCreditDisplay (QA 5.1)", () => {
  it("primaryCreditPlainLabel uses Person @ Company when both entities exist", () => {
    const c = mkCredit({
      id: "c1",
      person: { id: "p1", name: "Jane Architect", slug: "jane" },
      company: { id: "co1", name: "Studio Co", slug: "studio" },
    });
    expect(primaryCreditPlainLabel(c)).toBe("Jane Architect @ Studio Co");
  });

  it("leadAttributionFromCredits prefers primary-tier isLead over other primary credits", () => {
    const nonLead = mkCredit({
      id: "c1",
      isLead: false,
      person: { id: "p1", name: "Wrong Lead", slug: "wrong" },
    });
    const lead = mkCredit({
      id: "c2",
      isLead: true,
      person: { id: "p2", name: "Lead Name", slug: "lead" },
      company: { id: "co1", name: "Firm", slug: "firm" },
    });
    expect(leadAttributionFromCredits([nonLead, lead])).toBe("Lead Name @ Firm");
  });

  it("leadAttributionFromCredits falls back to first visible primary when none marked lead", () => {
    const a = mkCredit({
      id: "a",
      isLead: false,
      person: { id: "p1", name: "First", slug: "first" },
    });
    const b = mkCredit({
      id: "b",
      isLead: false,
      company: { id: "co1", name: "Only Co", slug: "co" },
    });
    expect(leadAttributionFromCredits([a, b])).toBe("First");
  });

  it("visiblePrimaryCredits excludes non-primary tier and flagged status", () => {
    const primary = mkCredit({ id: "p", creditTier: "primary", status: "active" });
    const contributor = mkCredit({
      id: "c",
      creditTier: "contributor",
      status: "active",
      person: { id: "x", name: "X", slug: "x" },
    });
    const flagged = mkCredit({
      id: "f",
      creditTier: "primary",
      status: "flagged",
      person: { id: "y", name: "Y", slug: "y" },
    });
    expect(visiblePrimaryCredits([primary, contributor, flagged])).toEqual([primary]);
  });
});
