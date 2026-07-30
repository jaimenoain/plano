import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guards on 20271196000000, which fixed a predicate that had silently matched nothing
 * since it was written: the ambassador approval markers live in
 * `building_audit_logs.operation`, never in `table_name`, so every Embassy moderation
 * count read 0 and every approval was tallied as a plain edit instead.
 *
 * These assert the shape rather than the numbers: a future edit that reintroduces
 * `table_name IN (...)` — or fixes one of the three functions and not the others — puts
 * the impact page, goal progress, and the weekly digest email back into disagreement.
 */

const repoRoot = resolve(__dirname, "../..");
const migration = readFileSync(
  resolve(repoRoot, "supabase/migrations/20271196000000_fix_moderation_metric_predicate.sql"),
  "utf8",
);

const sql = migration
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

const FUNCTIONS = [
  "get_my_ambassador_impact",
  "get_my_ambassador_goals",
  "compute_weekly_digest_payloads",
];

describe("moderation metric predicate fix", () => {
  it("fixes all three functions that carry the predicate, so they cannot disagree", () => {
    for (const fn of FUNCTIONS) {
      expect(sql, `${fn} is not replaced`).toContain(`FUNCTION public.${fn} `);
    }
  });

  it("never tests table_name against an approval marker again", () => {
    expect(sql).not.toMatch(/table_name\s+(NOT\s+)?IN\s*\(\s*'ambassador_approval'/);
  });

  it("matches approvals on operation, including video approvals", () => {
    const predicates = sql.match(/operation[^)]*'ambassador_approval'[^)]*\)/g) ?? [];
    expect(predicates.length).toBeGreaterThanOrEqual(5);
    for (const predicate of predicates) {
      expect(predicate, "video approvals must count as moderation too").toContain(
        "'ambassador_video_approval'",
      );
    }
  });

  /**
   * `NULL NOT IN (...)` is NULL, not true — without the COALESCE the digest's edits
   * bucket would silently drop every audit row with no operation recorded.
   */
  it("guards the digest's NOT IN legs against a null operation", () => {
    const notIn = sql.match(/[^\n]*NOT IN \('ambassador_approval'[^\n]*/g) ?? [];
    expect(notIn.length).toBeGreaterThan(0);
    for (const line of notIn) {
      expect(line).toContain("COALESCE(al.operation, '')");
    }
  });

  it("keeps the functions callable by the browser", () => {
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.get_my_ambassador_impact (integer) TO authenticated");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.get_my_ambassador_goals () TO authenticated");
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.compute_weekly_digest_payloads (date, integer) FROM PUBLIC, anon, authenticated",
    );
  });

  /** Blocking CI check: a migration touching no types must say why. */
  it("declares itself types-neutral", () => {
    expect(migration).toContain("types-neutral:");
  });
});
