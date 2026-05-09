import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase/migrations");

function latestMigrationDefining(fnName: string): string {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .reverse();
  for (const f of files) {
    const body = readFileSync(join(migrationsDir, f), "utf8");
    if (body.includes(`FUNCTION ${fnName}`) && body.includes(`v_country_filter`)) {
      return body;
    }
  }
  return "";
}

describe("get_buildings_list country filter (Phase 0 fix)", () => {
  it("reads country from filter_criteria->>'country', not ->>'query'", () => {
    const sql = latestMigrationDefining("get_buildings_list");
    expect(sql.length).toBeGreaterThan(0);

    // Must contain the correct key
    expect(sql).toMatch(/v_country_filter\s*:=\s*filter_criteria->>'country'/);
  });

  it("does not assign country filter from the 'query' key", () => {
    const sql = latestMigrationDefining("get_buildings_list");

    // Ensure the copy-paste bug (reading ->>'query' into country var) is absent
    expect(sql).not.toMatch(/v_country_filter\s*:=\s*filter_criteria->>'query'/);
  });
});
