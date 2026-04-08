import { describe, expect, it } from "vitest";
import { slugifyCompanyName } from "@/features/credits/api/companies";

describe("slugifyCompanyName", () => {
  it("matches company slug rules (same as slugify_person_name / people)", () => {
    expect(slugifyCompanyName("  Arup  ")).toBe("arup");
    expect(slugifyCompanyName("Foster + Partners")).toBe("foster-partners");
  });

  it("returns null for empty or non-alphanumeric input", () => {
    expect(slugifyCompanyName("")).toBeNull();
    expect(slugifyCompanyName("???")).toBeNull();
  });
});
