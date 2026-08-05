import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guards on 20271199000000, which fixed the Embassy "photos added" metric on
 * the national overview and programme health admin pages.
 *
 * The metric read 0 from the day it shipped: ambassadors upload photos by
 * inserting directly into review_images (the "save note" flow), which never
 * fires the buildings audit trigger, so building_audit_logs never records a
 * hero_image_url transition from null to a value. Replaying the pre-backfill
 * restore point confirmed the predicate matched 0 rows both before and after
 * ADR 0028's delta-encoding migration — this was a pre-existing defect, not a
 * regression from that migration.
 *
 * get_chapter_metrics and get_chapter_ambassador_activity were already fixed
 * for this in 20271128000000 (and carried through their later set-based
 * rewrites) by counting review_images directly. This migration applies the
 * same fix to the two RPCs that were still on the dead predicate,
 * get_programme_health_summary and get_national_chapter_overview — confirmed
 * by querying pg_get_functiondef across every function in the live `public`
 * schema for the predicate text before writing this migration.
 *
 * These assert the shape rather than the numbers: a future edit that
 * reintroduces the old_data/new_data hero_image_url predicate, or fixes one
 * function and not the other, silently zeroes the metric again with no error
 * raised anywhere.
 */

const repoRoot = resolve(__dirname, "../..");
const migrationPath = resolve(
  repoRoot,
  "supabase/migrations/20271199000000_fix_ambassador_photos_added_predicate.sql",
);
const migration = readFileSync(migrationPath, "utf8");

const sql = migration
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

const FUNCTIONS = ["get_programme_health_summary", "get_national_chapter_overview"];

describe("ambassador photos-added predicate fix", () => {
  it("fixes both functions that carried the dead predicate, so they cannot disagree", () => {
    for (const fn of FUNCTIONS) {
      expect(sql, `${fn} is not replaced`).toContain(`FUNCTION public.${fn}`);
    }
  });

  /** The regression this file mainly exists for. */
  it("never tests old_data/new_data hero_image_url for a null->value transition again", () => {
    expect(sql).not.toMatch(/old_data\s*->>\s*'hero_image_url'/);
    expect(sql).not.toMatch(/new_data\s*->>\s*'hero_image_url'/);
  });

  it("counts photo uploads from review_images instead", () => {
    const photosBlock = sql.match(
      /SELECT\s+COUNT\(\*\)[\s\S]{0,400}?review_images[\s\S]{0,400}?photos/i,
    );
    expect(photosBlock, "no review_images-based photo count found").not.toBeNull();
  });

  it("still scopes national-chapter photo counts to the chapter", () => {
    const fn = sql.slice(sql.indexOf("FUNCTION public.get_national_chapter_overview"));
    const reviewImagesIndex = fn.indexOf("review_images");
    const photosSubquery = fn.slice(
      reviewImagesIndex,
      fn.indexOf("photos_last_30d", reviewImagesIndex),
    );
    expect(photosSubquery).toContain("_building_in_ambassador_chapter_scope");
    expect(photosSubquery).toContain("building_posts");
  });

  /** Grants reset on every CREATE OR REPLACE — re-assert them, naming the roles. */
  it("re-asserts grants naming anon and authenticated, not just PUBLIC", () => {
    for (const fn of FUNCTIONS) {
      const revokeLine = sql
        .split("\n")
        .find((line) => line.includes("REVOKE") && line.includes(fn));
      expect(revokeLine, `${fn} has no REVOKE line`).toBeDefined();
      expect(revokeLine).toMatch(/FROM PUBLIC,\s*anon,\s*authenticated/);
    }
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.get_programme_health_summary() TO authenticated",
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.get_national_chapter_overview (uuid) TO authenticated",
    );
  });

  /** Blocking CI check: a migration touching no types must say why. */
  it("declares itself types-neutral", () => {
    expect(migration).toContain("types-neutral:");
  });
});
