import { describe, it, expect } from "vitest";
import { suggestSmartFilters } from "./smartFilterSuggestions";
import type { FunctionalCategory, FunctionalTypology, Attribute } from "@/types/classification";
import type { PersonSummary, CompanySummary } from "@/features/credits/types";

const cat = (id: string, name: string): FunctionalCategory => ({
  id,
  name,
  slug: name.toLowerCase(),
  created_at: "",
});
const typ = (id: string, name: string): FunctionalTypology => ({
  id,
  name,
  parent_category_id: "p",
  slug: name.toLowerCase(),
  created_at: "",
});
const attr = (id: string, name: string): Attribute => ({
  id,
  name,
  group_id: "g",
  slug: name.toLowerCase(),
  created_at: "",
});

const taxonomy = {
  functionalCategories: [cat("c1", "Cultural"), cat("c2", "Residential")],
  functionalTypologies: [typ("t1", "Museum"), typ("t2", "Library")],
  attributes: [
    attr("a1", "Brutalist"),
    attr("a2", "Concrete"),
    attr("a3", "Modernist"),
  ],
};

const person = (overrides: Partial<PersonSummary> = {}): PersonSummary => ({
  id: "p1",
  name: "Renzo Piano",
  slug: "renzo-piano",
  claimStatus: "unclaimed",
  associatedCompanies: [],
  knownBuilding: null,
  creditCount: 87,
  ...overrides,
});

const company = (overrides: Partial<CompanySummary> = {}): CompanySummary => ({
  id: "co1",
  name: "Renzo Piano Building Workshop",
  slug: "rpbw",
  claimStatus: "unclaimed",
  country: null,
  logoUrl: null,
  creditCount: 42,
  ...overrides,
});

describe("suggestSmartFilters", () => {
  it("returns empty for short queries", () => {
    expect(
      suggestSmartFilters({
        query: "br",
        taxonomy,
        people: [],
        companies: [],
      }),
    ).toEqual([]);
  });

  it("matches an attribute when the query is similar to its name", () => {
    const out = suggestSmartFilters({
      query: "brutalism",
      taxonomy,
      people: [],
      companies: [],
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].kind).toBe("attribute");
    expect(out[0].label).toBe("Brutalist");
    expect(out[0].apply).toEqual({ key: "attributes", value: "a1" });
  });

  it("matches a typology", () => {
    const out = suggestSmartFilters({
      query: "museum",
      taxonomy,
      people: [],
      companies: [],
    });
    expect(out[0].kind).toBe("typology");
    expect(out[0].apply).toEqual({ key: "typologies", value: "t1" });
  });

  it("matches a category", () => {
    const out = suggestSmartFilters({
      query: "cultural",
      taxonomy,
      people: [],
      companies: [],
    });
    expect(out[0].kind).toBe("category");
    expect(out[0].apply).toEqual({ key: "category", value: "c1" });
  });

  it("surfaces a person chip when the top search result matches the query", () => {
    const out = suggestSmartFilters({
      query: "renzo piano",
      taxonomy,
      people: [person()],
      companies: [],
    });
    const personChip = out.find((s) => s.kind === "person");
    expect(personChip).toBeDefined();
    expect(personChip?.label).toBe("Renzo Piano");
    expect(personChip?.count).toBe(87);
    expect(personChip?.apply).toEqual({
      key: "people",
      value: { id: "p1", name: "Renzo Piano" },
    });
  });

  it("does not surface a person chip when the name doesn't match the query", () => {
    const out = suggestSmartFilters({
      query: "library",
      taxonomy,
      people: [person({ name: "Tadao Ando", id: "p2" })],
      companies: [],
    });
    expect(out.find((s) => s.kind === "person")).toBeUndefined();
  });

  it("does not surface a person chip when creditCount is 0", () => {
    const out = suggestSmartFilters({
      query: "renzo",
      taxonomy,
      people: [person({ creditCount: 0 })],
      companies: [],
    });
    expect(out.find((s) => s.kind === "person")).toBeUndefined();
  });

  it("returns at most 3 suggestions, ranked", () => {
    const out = suggestSmartFilters({
      query: "modernist museum cultural brutalist",
      taxonomy,
      people: [person()],
      companies: [company()],
    });
    expect(out.length).toBeLessThanOrEqual(3);
    // Sorted in descending order by score.
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
    }
  });

  it("returns no chips when nothing in the taxonomy or results matches", () => {
    const out = suggestSmartFilters({
      query: "xyzzy",
      taxonomy,
      people: [person()],
      companies: [company()],
    });
    expect(out).toEqual([]);
  });

  it("is case-insensitive", () => {
    const out = suggestSmartFilters({
      query: "BRUTALISM",
      taxonomy,
      people: [],
      companies: [],
    });
    expect(out[0]?.label).toBe("Brutalist");
  });
});
