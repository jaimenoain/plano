/**
 * search_buildings_v2 must find a building by its credited architect or firm.
 *
 * `buildings.search_vector` is built from six own columns and has never carried
 * credits, so before 20271192000000 the authoritative text search could not find
 * a building by its architect: "zaha" returned *Hanaha* and *Zazzle*, and "zaha
 * hadid" returned *Hanaha* alone. Meanwhile the in-collection client filter
 * matched credit names, so the two searches disagreed.
 *
 * These assertions guard the *shape* of the fix, which is the part a later
 * CREATE OR REPLACE can silently undo. The behaviour itself is covered by
 * `tests/e2e/search.spec.ts` ("finds a building by its architect"), which runs
 * the real RPC.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase/migrations");

/**
 * The LATEST migration defining the function — a CREATE OR REPLACE chain means
 * only the last one describes what production actually runs. (The companion
 * suite `search-buildings-v2-foundation.test.ts` deliberately reads the
 * earliest, for the one-time column/index/trigger setup.)
 */
function latestMigrationDefining(fnName: string): string {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .reverse(); // descending — newest definition first
  for (const f of files) {
    const body = readFileSync(join(migrationsDir, f), "utf8");
    // Must be a definition, not a bare re-GRANT mentioning the same signature.
    if (body.includes(`CREATE OR REPLACE FUNCTION public.${fnName}(`)) return body;
  }
  return "";
}

const sql = latestMigrationDefining("search_buildings_v2");
/** The plpgsql body only — the header comment quotes SQL it does not execute. */
const body = sql.slice(sql.indexOf("AS $function$"));
/** Signature through the SET clauses, i.e. everything before the body. */
const signature = sql.slice(
  sql.indexOf("CREATE OR REPLACE FUNCTION public.search_buildings_v2("),
  sql.indexOf("AS $function$"),
);

describe("search_buildings_v2 credit-name search", () => {
  it("is defined by a migration in the repo", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  it("matches credited people and companies, not just the building's own columns", () => {
    expect(body).toMatch(/JOIN public\.building_credits bc ON bc\.person_id = p\.id/);
    expect(body).toMatch(/JOIN public\.building_credits bc ON bc\.company_id = c\.id/);
  });

  it("qualifies a credit by strict_word_similarity at an explicit 0.6", () => {
    // The explicit predicate is the authority: `<<%` alone would leave the
    // threshold to a session GUC, and plain `word_similarity`/`similarity` were
    // measured too loose and too tight respectively (see the migration header).
    expect(body).toMatch(/strict_word_similarity\(v_query, p\.name\) >= 0\.6/);
    expect(body).toMatch(/strict_word_similarity\(v_query, c\.name\) >= 0\.6/);
  });

  it("keeps both index-driven candidate predicates ahead of that filter", () => {
    // ILIKE and `<<%` are both served by people_name_trgm_idx /
    // companies_name_trgm_idx; dropping them makes the branch seq-scan 16k
    // companies (380ms measured, against 10ms).
    for (const alias of ["p", "c"]) {
      expect(body).toContain(
        `(${alias}.name ILIKE '%' || v_query || '%' OR v_query <<% ${alias}.name)`,
      );
    }
  });

  it("skips the credit branch for queries under three characters", () => {
    // "de" is a whole word in 208 firm names — a two-letter name search must not
    // be buried under other people's buildings.
    expect(body.match(/length\(v_query\) >= 3/g) ?? []).toHaveLength(2);
  });

  it("resolves credit matches once per query, outside the main WHERE", () => {
    // As an inline `OR EXISTS (…)` the planner cannot reach the trigram indexes
    // and re-runs the join for all 18k buildings.
    expect(body).toMatch(/WITH credit_hits AS MATERIALIZED/);
    expect(body).toMatch(/LEFT JOIN credit_hits ch ON ch\.building_id = b\.id/);
    expect(body).not.toMatch(/OR EXISTS \(\s*SELECT 1 FROM public\.building_credits/);
  });

  it("admits a credit match as its own qualifying branch", () => {
    const where = body.slice(body.indexOf("WHERE\n"));
    expect(where).toMatch(/OR ch\.credit_sim IS NOT NULL/);
  });

  it("scores a credit match above the suggestion noise floor, below a name hit", () => {
    // 0.35 × sim lands a perfect credit match at ~0.42 with the popularity term:
    // clear of the 0.2 floor in useCollectionSearchSuggestions, under the
    // 0.87–1.08 an exact name match scores.
    expect(body).toMatch(/\+ 0\.35 \* COALESCE\(ch\.credit_sim, 0\.0\)/);
  });

  it("leaves a name-only hit scoring exactly what it scored before", () => {
    // The three original terms must be untouched, and the new one is 0 when
    // credit_hits has no row for the building.
    expect(body).toMatch(/0\.6 \* COALESCE\(ts_rank_cd\(b\.search_vector, v_tsquery\), 0\.0\)/);
    expect(body).toMatch(/\+ 0\.3 \* GREATEST\(/);
    expect(body).toMatch(/COALESCE\(ch\.credit_sim, 0\.0\)/);
  });

  it("excludes hidden credits null-safely", () => {
    expect(body.match(/bc\.status IS DISTINCT FROM 'hidden'::public\.credit_status_enum/g) ?? [])
      .toHaveLength(2);
  });

  it("does not reintroduce the location gate a name search must not have", () => {
    const where = body.slice(body.indexOf("WHERE\n"));
    expect(where).not.toMatch(/AND b\.location IS NOT NULL/);
  });

  it("stays SECURITY DEFINER with the same search_path and grants", () => {
    expect(signature).toMatch(/SECURITY DEFINER/);
    expect(signature).toMatch(/SET search_path TO 'public', 'extensions'/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.search_buildings_v2.*TO anon, authenticated, service_role/);
  });

  it("does not pin the pg_trgm GUC in the function's SET clause", () => {
    // Supabase's `postgres` role may only do that while pg_trgm's library
    // happens to be loaded in the backend, so CREATE FUNCTION fails on some
    // pooled connections. The explicit >= 0.6 predicate is the pin instead.
    expect(signature).not.toMatch(/SET pg_trgm\./);
  });

  it("does not widen buildings.search_vector or add a building_credits trigger", () => {
    // The alternative design: it would write-amplify every one of 31k+ credit
    // rows and fan a company rename out across its whole portfolio. If this
    // ever changes, it needs its own migration and an ADR — not this one.
    expect(sql).not.toMatch(/CREATE OR REPLACE FUNCTION public\.update_building_search_vector/);
    expect(sql).not.toMatch(/CREATE TRIGGER.*ON public\.building_credits/s);
    expect(sql).not.toMatch(/UPDATE public\.buildings\s+SET search_vector/);
  });
});
