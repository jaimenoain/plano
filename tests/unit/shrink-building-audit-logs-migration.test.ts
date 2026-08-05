import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guards on 20271198000000, which cut building_audit_logs from full-row snapshots
 * to per-column deltas after the table pushed the project past its Supabase
 * storage quota.
 *
 * The dangerous edit these tests exist to catch is someone widening the denylist.
 * `building_audit_logs` is not just an audit trail — six Embassy leaderboard RPCs
 * detect a photo contribution by diffing `hero_image_url` across old_data/new_data.
 * Dropping that column from the payload would silently zero out every ambassador's
 * photo stat with no error anywhere, which is exactly the class of bug that
 * 20271196000000 already had to fix once.
 */

const repoRoot = resolve(__dirname, "../..");

const migrationPath = resolve(
  repoRoot,
  "supabase/migrations/20271198000000_shrink_building_audit_logs.sql",
);
const migration = readFileSync(migrationPath, "utf8");
const backfill = readFileSync(resolve(repoRoot, "scripts/shrink-building-audit-logs.sh"), "utf8");

/**
 * The script's own header quotes the `DO $$ ... COMMIT $$` pattern it exists to warn
 * against, so structural assertions must run against executable lines only.
 */
const backfillCode = backfill
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("#"))
  .join("\n");

/** Strip comments — every invariant below is about executable SQL, not prose. */
const stripComments = (source: string) =>
  source
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

const sql = stripComments(migration);

/** The denylist is a single ARRAY[...] literal inside building_audit_ignored_columns(). */
const denylist = (() => {
  const body = sql.match(/building_audit_ignored_columns[\s\S]*?ARRAY\[([\s\S]*?)\]::text\[\]/);
  if (!body) throw new Error("could not locate the denylist array");
  return [...body[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
})();

describe("building_audit_logs delta migration", () => {
  it("drops the columns that made the table huge", () => {
    // search_vector is the whole point: a weighted tsvector, stored twice per row.
    expect(denylist).toContain("search_vector");
    // Machine-maintained churn — the nightly tier job is what kept the table growing.
    expect(denylist).toContain("tier_rank");
    expect(denylist).toContain("updated_at");
    expect(denylist).toContain("popularity_score");
  });

  /** The regression this file mainly exists for. */
  it("never drops a column the Embassy leaderboards read back out of the payload", () => {
    expect(
      denylist,
      "hero_image_url is how six RPCs count photo contributions — dropping it zeroes them silently",
    ).not.toContain("hero_image_url");
    expect(denylist).not.toContain("operation");
    expect(denylist).not.toContain("table_name");
  });

  it("only ever denylists machine-maintained columns", () => {
    const MACHINE_MAINTAINED = new Set([
      "search_vector",
      "updated_at",
      "popularity_score",
      "tier_rank",
    ]);
    for (const column of denylist) {
      expect(
        MACHINE_MAINTAINED.has(column),
        `${column} is human-editable — denylisting it erases it from the edit history`,
      ).toBe(true);
    }
  });

  it("writes no audit row when only machines changed", () => {
    // Without this early return the nightly update_building_tiers() run keeps
    // generating history for edits nobody made.
    expect(sql).toMatch(/IF\s+v_changed\s+IS\s+NULL\s+THEN[\s\S]{0,40}RETURN NEW;/i);
  });

  it("logs only the differing keys, not the whole row", () => {
    expect(sql).not.toMatch(/VALUES\s*\([^)]*to_jsonb\(OLD\)\s*,\s*to_jsonb\(NEW\)/i);
    expect(sql).toContain("jsonb_object_agg(k, v_old -> k)");
    expect(sql).toContain("jsonb_object_agg(k, v_new -> k)");
  });
});

describe("revert_building_change against a partial payload", () => {
  /**
   * The old body assigned every column unconditionally from old_data. Against a
   * delta that is data loss: reverting a name typo would null out the building's
   * address, city, year and coordinates.
   */
  it("restores a column only when the payload carries that key", () => {
    const revert = sql.slice(sql.indexOf("FUNCTION public.revert_building_change"));
    const guarded = ["name", "address", "city", "country", "year_completed", "location"];
    for (const column of guarded) {
      expect(revert, `${column} is assigned without checking the key exists`).toContain(
        `r.old_data ? '${column}'`,
      );
    }
  });

  it("never assigns a bare cast that would null the column out", () => {
    const revert = sql.slice(sql.indexOf("FUNCTION public.revert_building_change"));
    expect(revert).not.toMatch(/location\s*=\s*\(r\.old_data\s*->>\s*'location'\)::geography\s*,/);
  });

  /** COALESCE cannot tell "key absent" from "value was legitimately NULL". */
  it("uses key-existence rather than COALESCE to decide", () => {
    const revert = sql.slice(sql.indexOf("FUNCTION public.revert_building_change"));
    expect(revert).not.toMatch(/coalesce\(\s*r\.old_data\s*->>/i);
  });

  it("refuses a log entry with nothing to restore", () => {
    expect(sql).toMatch(/old_data IS NULL OR r\.old_data = '\{\}'::jsonb/);
  });
});

describe("backfill script", () => {
  it("shares the migration's helpers so the two cannot drift apart", () => {
    expect(backfill).toContain("public.building_audit_ignored_columns()");
    expect(backfill).toContain("public.building_audit_reduce(");
  });

  it("reclaims the disk rather than only marking tuples dead", () => {
    // A plain UPDATE moves no bytes on Supabase's storage meter.
    expect(backfill).toMatch(/VACUUM \(FULL, ANALYZE\) public\.building_audit_logs/);
  });

  /**
   * The original implementation was a `DO $$ ... COMMIT ... $$` block and it failed
   * in production after 35 batches: Supabase enforces statement_timeout = 2min, the
   * whole DO block is ONE statement, and COMMITs inside a procedural block do not
   * reset the statement clock. The loop has to live in the client.
   */
  it("drives the batch loop from the client, not a DO block", () => {
    expect(backfillCode).not.toMatch(/DO\s+\$\$/);
    expect(backfillCode).toMatch(/for i in \$\(seq 1 "\$MAX_BATCHES"\)/);
    expect(backfillCode).toMatch(/LIMIT \$\{BATCH\}/);
  });

  it("lifts the timeout for VACUUM FULL in its own session", () => {
    // `-c` gets its own implicit transaction, so the SET would not persist and
    // VACUUM FULL cannot run inside a transaction block — it must go over stdin.
    expect(backfillCode).toMatch(/SET statement_timeout = 0;\s*\nVACUUM \(FULL, ANALYZE\)/);
  });

  it("checks the photo-contribution count survives the rewrite", () => {
    expect(backfill).toContain("hero_image_url");
  });
});

/** Blocking CI check: a migration touching no types must say why. */
describe("CI contract", () => {
  it("declares itself types-neutral", () => {
    expect(migration).toContain("types-neutral:");
  });
});
