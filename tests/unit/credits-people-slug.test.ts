import { describe, expect, it } from "vitest";
import { slugifyPersonName } from "@/features/credits/api/people";

describe("slugifyPersonName", () => {
  it("matches DB slugify_person_name style (lowercase, dashes, trim)", () => {
    expect(slugifyPersonName("  Norman Foster  ")).toBe("norman-foster");
    expect(slugifyPersonName("OMA / AMO")).toBe("oma-amo");
    expect(slugifyPersonName("Name---Parts")).toBe("name-parts");
  });

  it("returns null for empty or non-alphanumeric input", () => {
    expect(slugifyPersonName("")).toBeNull();
    expect(slugifyPersonName("   ")).toBeNull();
    expect(slugifyPersonName("???")).toBeNull();
  });
});
