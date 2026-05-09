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
    if (
      body.includes(`FUNCTION public.${fnName}`) ||
      body.includes(`FUNCTION ${fnName}`)
    ) {
      return body;
    }
  }
  return "";
}

describe("search_buildings_v2 migration (Phase 1)", () => {
  const sql = latestMigrationDefining("search_buildings_v2");

  it("migration exists and defines search_buildings_v2", () => {
    expect(sql.length).toBeGreaterThan(0);
    expect(sql).toMatch(/FUNCTION.*search_buildings_v2/);
  });

  it("uses 'simple' dictionary, not 'english'", () => {
    expect(sql).toMatch(/to_tsvector\('simple'/);
    expect(sql).not.toMatch(/to_tsvector\('english'/);
  });

  it("adds search_vector column to buildings", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS search_vector tsvector/);
  });

  it("creates GIN index on search_vector", () => {
    expect(sql).toMatch(/USING GIN.*search_vector/i);
  });

  it("creates trigram index on alt_name", () => {
    expect(sql).toMatch(/buildings_alt_name_trgm_idx/);
    expect(sql).toMatch(/gin_trgm_ops/);
  });

  it("has no bbox parameter — viewport-independent by design", () => {
    // The function signature must not contain min_lat / max_lat
    const fnBlock = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION public.search_buildings_v2"));
    const signature = fnBlock.slice(0, fnBlock.indexOf("RETURNS TABLE"));
    expect(signature).not.toMatch(/min_lat|max_lat|min_lng|max_lng/);
  });

  it("has no silent status exclusions", () => {
    // Must not hard-exclude Demolished, Lost, Under Construction, Unbuilt
    const fnBody = sql.slice(sql.indexOf("RETURN QUERY"));
    expect(fnBody).not.toMatch(/Demolished.*Distinct|IS DISTINCT FROM.*Demolished/);
    expect(fnBody).not.toMatch(/'Lost'.*IS DISTINCT|IS DISTINCT.*'Lost'/);
  });

  it("uses building_credits not architects table for credit_names", () => {
    expect(sql).toMatch(/building_credits/);
    expect(sql).not.toMatch(/building_architects/);
    expect(sql).not.toMatch(/\barchitects\b/);
  });

  it("grants execute to anon and authenticated", () => {
    expect(sql).toMatch(/GRANT EXECUTE.*search_buildings_v2.*TO anon.*authenticated/s);
  });

  it("is SECURITY DEFINER with correct search_path", () => {
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = public, extensions/);
  });

  it("combines ts_rank_cd + similarity in the rank_score", () => {
    expect(sql).toMatch(/ts_rank_cd/);
    expect(sql).toMatch(/similarity/);
    expect(sql).toMatch(/rank_score/);
  });

  it("trigger backfills search_vector on the right columns", () => {
    expect(sql).toMatch(/BEFORE INSERT OR UPDATE OF name.*alt_name.*aliases.*address.*city.*country/);
  });

  it("backfills existing rows after adding the column", () => {
    // UPDATE must come after ALTER TABLE ADD COLUMN in the file
    const alterPos = sql.indexOf("ADD COLUMN IF NOT EXISTS search_vector");
    const updatePos = sql.indexOf("UPDATE public.buildings\nSET search_vector");
    expect(alterPos).toBeGreaterThan(-1);
    expect(updatePos).toBeGreaterThan(alterPos);
  });
});

describe("update_building_search_vector trigger function (Phase 1)", () => {
  const sql = latestMigrationDefining("update_building_search_vector");

  it("migration defines the trigger function", () => {
    expect(sql).toMatch(/FUNCTION public\.update_building_search_vector/);
  });

  it("applies setweight for all indexed fields", () => {
    expect(sql).toMatch(/setweight.*'A'.*name/s);
    expect(sql).toMatch(/setweight.*aliases/s);
    expect(sql).toMatch(/setweight.*city/s);
    expect(sql).toMatch(/setweight.*country/s);
  });
});
