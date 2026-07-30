import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Static guards on the milestone migration (Roadmap 3.3), same shape as
 * weekly-digest-migration.test.ts: there is no pgTAP harness here, so these assert the
 * properties whose failure modes are silent — a dropped notification type, a function
 * left executable by anon, a second copy of the counting SQL, or an award path that
 * could fire the same notification twice.
 */

const repoRoot = resolve(__dirname, "../..");
const migration = readFileSync(
  resolve(repoRoot, "supabase/migrations/20271195000000_embassy_milestones.sql"),
  "utf8",
);

/**
 * The 24 types that existed before this migration, plus the one it adds. The constraint
 * is dropped and fully restated on every change, so a stale list silently breaks every
 * type omitted from it — that has been a live hazard four times.
 */
const NOTIFICATION_TYPES = [
  "follow", "like", "comment", "recommendation", "friend_joined", "suggest_follow",
  "visit_request", "architect_verification", "ambassador_application_received",
  "ambassador_application_approved", "ambassador_application_rejected",
  "ambassador_membership_review", "award_win", "feedback_status_updated",
  "feedback_notes_updated", "project_idea_submitted", "collection_collab_requested",
  "collection_collab_accepted", "collection_collab_rejected", "collection_collab_added",
  "contribution_approved", "contribution_flagged", "person_claimed", "weekly_digest",
  "milestone_earned",
];

const MILESTONE_KEYS = ["first_contribution", "photos_10", "moderations_50", "streak_4"];

describe("milestone migration", () => {
  it("restates every notification type and adds milestone_earned", () => {
    const constraint = migration.slice(
      migration.indexOf("ADD CONSTRAINT notifications_type_check"),
    );
    const list = constraint.slice(0, constraint.indexOf("));"));

    for (const type of NOTIFICATION_TYPES) {
      expect(list, `notifications_type_check is missing '${type}'`).toContain(`'${type}'`);
    }
    expect(list.match(/'[a-z_]+'/g)).toHaveLength(NOTIFICATION_TYPES.length);
  });

  it("defines all four milestones the roadmap names, and no others", () => {
    const catalogue = migration.slice(
      migration.indexOf("WITH catalogue (key, label, target, progress) AS ("),
      migration.indexOf("awarded AS ("),
    );
    for (const key of MILESTONE_KEYS) {
      expect(catalogue, `catalogue is missing '${key}'`).toContain(`'${key}'::text`);
    }
    // Two ::text literals per row — the key and its label.
    expect(catalogue.match(/'[^']+'::text/g)).toHaveLength(MILESTONE_KEYS.length * 2);
  });

  /**
   * The whole safety argument for calling this from a query on every Embassy visit: the
   * ledger's primary key plus ON CONFLICT DO NOTHING, with the notification driven off
   * the INSERT's RETURNING so it can only fire on the statement that created the row.
   */
  it("awards through a conflict-guarded ledger and announces off its RETURNING", () => {
    expect(migration).toContain("PRIMARY KEY (user_id, key)");
    expect(migration).toContain("ON CONFLICT (user_id, key) DO NOTHING");
    expect(migration).toContain("FROM   awarded a");
    expect(migration).toContain(
      "ALTER TABLE public.ambassador_milestones ENABLE ROW LEVEL SECURITY",
    );
  });

  /**
   * Milestones must be judged on the same numbers /embassy/impact renders. Re-deriving
   * the counts here is how three surfaces end up disagreeing about one metric.
   */
  it("reuses get_my_ambassador_impact instead of re-counting", () => {
    expect(migration).toContain("public.get_my_ambassador_impact (0)");
    expect(migration).not.toContain("building_audit_logs");
  });

  /**
   * REVOKE ... FROM PUBLIC is not enough on Supabase: ALTER DEFAULT PRIVILEGES grants
   * EXECUTE to anon and authenticated DIRECTLY at creation (#1671 shipped that hole).
   */
  it("revokes anon and authenticated by name, then grants back only authenticated", () => {
    const revoke = migration
      .split("\n")
      .find((line) => line.startsWith("REVOKE ALL ON FUNCTION public.sync_my_ambassador_milestones"));
    expect(revoke, "the function has no REVOKE line").toBeDefined();
    expect(revoke).toContain("PUBLIC");
    expect(revoke).toContain("anon");
    expect(revoke).toContain("authenticated");

    const grants = migration
      .split("\n")
      .filter((line) => line.trimStart().startsWith("GRANT "));
    expect(grants).toHaveLength(1);
    expect(grants[0]).toContain("TO authenticated");
    expect(grants[0]).not.toMatch(/\bTO\b.*\banon\b/);
  });

  it("pins search_path on the new function", () => {
    expect(migration).toContain("SET search_path = public");
  });

  /** Self-actor convention (20271193000000 design note 4): no system profile exists. */
  it("self-actors the notification", () => {
    expect(migration).toContain("v_uid, -- self-actor");
  });
});
