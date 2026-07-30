import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guards on 20271197000000 (roadmap 4.3). Two of these protect against silent failures that
 * have already happened once in this repo: a per-row chapter-scope helper that blew the
 * statement timeout (20271151000000), and a gap predicate that joined review_images to the
 * wrong table and therefore never excluded anything (design note 3 of this migration).
 */

const repoRoot = resolve(__dirname, "../..");
const migration = readFileSync(
  resolve(repoRoot, "supabase/migrations/20271197000000_embassy_field_mode.sql"),
  "utf8",
);

const sql = migration
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

describe("field mode migration", () => {
  /**
   * review_images.review_id is a FK to building_posts.id. Joining it to user_buildings.id
   * happened to work for 18009 legacy rows whose ids coincide, and silently missed every row
   * written by the current code path — including the uploads field mode itself makes.
   */
  it("joins review_images through building_posts in both functions", () => {
    expect(sql).not.toMatch(/review_images\s+ri\s+ON\s+ri\.review_id\s*=\s*ub\.id/);
    expect(sql).not.toContain("ri.review_id = ub.id");
    const joins = sql.match(/building_posts bp ON bp\.id = ri\.review_id/g) ?? [];
    expect(joins, "both the new RPC and the list RPC must use the corrected join").toHaveLength(2);
  });

  it("orders by real distance and bounds the query", () => {
    expect(sql).toContain("st_dwithin(b.location, v_origin, v_radius)");
    expect(sql).toContain("ORDER BY\n    dist_meters");
    expect(sql).toContain("LEAST(GREATEST(COALESCE(p_radius_meters, 2000), 100), 50000)");
    expect(sql).toContain("LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100)");
  });

  /**
   * 20271151000000's header records that per-row _building_in_ambassador_chapter_scope()
   * calls blew the statement timeout. The new function inlines the predicate instead — the
   * old list RPC still calls the helper, and is left alone here.
   */
  it("inlines chapter scope in the new function rather than calling the per-row helper", () => {
    const newFn = sql.slice(
      sql.indexOf("FUNCTION public.get_ambassador_nearby_photo_gaps"),
      sql.indexOf("FUNCTION public.get_ambassador_buildings_without_photos"),
    );
    expect(newFn).not.toContain("_building_in_ambassador_chapter_scope");
    expect(newFn).toContain("v_chapter.locality_id");
    expect(newFn).toContain("v_chapter.country_code");
    expect(newFn).toContain("_ambassador_can_access_chapter");
  });

  it("revokes anon and authenticated by name, then grants back only authenticated", () => {
    const revoke = sql
      .split("\n")
      .find((line) => line.startsWith("REVOKE ALL ON FUNCTION public.get_ambassador_nearby_photo_gaps"));
    expect(revoke, "the new RPC has no REVOKE line").toBeDefined();
    expect(revoke).toContain("PUBLIC");
    expect(revoke).toContain("anon");
    expect(revoke).toContain("authenticated");

    const grants = sql.split("\n").filter((line) => line.trimStart().startsWith("GRANT "));
    expect(grants.length).toBeGreaterThan(0);
    for (const grant of grants) {
      expect(grant).toContain("TO authenticated");
      expect(grant).not.toMatch(/\bTO\b.*\banon\b/);
    }
  });

  it("pins search_path on both functions", () => {
    expect(sql.match(/SET search_path = public/g)?.length).toBe(2);
  });
});
