import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * QA 11.4 — automated slice: building detail + edit surfaces use credits v2, not legacy
 * architect tables or selectors. Manual UAT: live building pages, add/flag credits, admin hide.
 */

const BUILDINGS_SRC = join(process.cwd(), "src/features/buildings");

const QA114_SOURCES = [
  "pages/BuildingDetails.tsx",
  "components/BuildingForm.tsx",
  "components/BuildingMasthead.tsx",
  "components/BuildingAttributes.tsx",
] as const;

const LEGACY_ARCHITECT_REF =
  /building_architects|"architects"|`architects`|from architects|\.architects\b/;

describe("QA 11.4 — building detail pages (automated)", () => {
  it("core building page sources omit legacy architect table/query patterns", () => {
    const hits: string[] = [];
    for (const rel of QA114_SOURCES) {
      const path = join(BUILDINGS_SRC, rel);
      const text = readFileSync(path, "utf8");
      if (LEGACY_ARCHITECT_REF.test(text)) {
        hits.push(path);
      }
      if (text.includes("ArchitectSelect")) {
        hits.push(`${path}: ArchitectSelect`);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("BuildingDetails mounts BuildingCredits (public credits section)", () => {
    const path = join(BUILDINGS_SRC, "pages/BuildingDetails.tsx");
    const text = readFileSync(path, "utf8");
    expect(text).toContain("BuildingCredits");
    expect(text).toContain("getBuildingCredits");
  });

  it("BuildingForm uses CreditedEntitiesSelect for design credits, not legacy architect UI", () => {
    const path = join(BUILDINGS_SRC, "components/BuildingForm.tsx");
    const text = readFileSync(path, "utf8");
    expect(text).toContain("CreditedEntitiesSelect");
    expect(text).not.toContain("ArchitectSelect");
  });
});
