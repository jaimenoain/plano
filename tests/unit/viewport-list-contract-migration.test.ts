/**
 * Roadmap Task 4.1 — the viewport↔list contract, asserted at the SQL level.
 *
 * The contract: when the map is at rest, the SERP list's universe is exactly the
 * set of buildings inside `map.getBounds()` — the same set the pins aggregate.
 * Four separate regressions would silently break it, and all four are cheap to
 * reintroduce, so each gets a test that reads the LATEST migration defining the
 * function (definitions are recreated wholesale, so the newest file wins).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase/migrations");

/** Body of the newest migration that (re)defines `fnName`. */
function latestMigrationDefining(fnName: string): string {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .reverse();
  for (const f of files) {
    const body = readFileSync(join(migrationsDir, f), "utf8");
    if (body.includes(`FUNCTION public.${fnName}(`)) return body;
  }
  return "";
}

describe("get_buildings_list — the viewport always applies", () => {
  it("has no query short-circuit guarding the bbox predicate", () => {
    const sql = latestMigrationDefining("get_buildings_list");
    expect(sql.length).toBeGreaterThan(0);

    // The old shape was:
    //   AND ((v_query IS NOT NULL AND trim(v_query) <> '') OR (<bbox>))
    // which made the list GLOBAL on any text query while the pins stayed
    // viewport-bound and ignored the query entirely.
    expect(sql).not.toMatch(/v_query IS NOT NULL AND trim\(v_query\) <> ''\s*\)\s*OR/);
  });

  it("still applies the bbox, with the antimeridian branch the cluster RPC uses", () => {
    const sql = latestMigrationDefining("get_buildings_list");
    expect(sql).toMatch(/st_makeenvelope\(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326\)/);
    expect(sql).toMatch(/\(v_safe_max_lng - v_safe_min_lng\) > 179/);
  });

  it("excludes buildings the user hid, matching get_map_clusters_v3", () => {
    const sql = latestMigrationDefining("get_buildings_list");
    expect(sql).toMatch(/ub\.status::text IS DISTINCT FROM 'ignored'/);
    // ...and the 'none' status filter must not smuggle them back in.
    expect(sql).not.toMatch(/ub\.status IS NULL OR ub\.status = 'ignored'/);
  });
});

describe("get_map_clusters_v3 — aggregates the exact viewport", () => {
  it("does not inflate the caller's bbox", () => {
    const sql = latestMigrationDefining("get_map_clusters_v3");
    expect(sql.length).toBeGreaterThan(0);

    // The old shape padded 10% of the span onto every edge, e.g.
    //   v_safe_min_lat := GREATEST(-90.0, min_lat - (v_lat_span * 0.1));
    // On top of the client's own (now removed) 30% buffer that made the pins
    // aggregate ~1.9x the linear span the list paged over.
    expect(sql).not.toMatch(/v_(lat|lng)_span \* 0\.1/);
    expect(sql).toMatch(/v_safe_min_lat := GREATEST\(-90\.0, min_lat\);/);
    expect(sql).toMatch(/v_safe_max_lng := LEAST\(180\.0, max_lng\);/);
  });

  it("keeps its grants explicit for anon and authenticated", () => {
    const sql = latestMigrationDefining("get_map_clusters_v3");
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_map_clusters_v3\([^)]*\) TO anon, authenticated, service_role;/);
  });
});
