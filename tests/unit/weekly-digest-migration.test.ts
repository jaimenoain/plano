import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Static guards on the weekly digest migration (Roadmap 3.2). There is no pgTAP harness
 * in this repo, so these assert the properties whose failure modes are silent:
 * a dropped notification type, an unpinned search_path, a per-row scope helper that
 * reintroduces the leaderboard's statement-timeout bug, and the edge function's only
 * real auth gate.
 */

const repoRoot = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");

const migration = read("supabase/migrations/20271193000000_embassy_weekly_digest.sql");
const edgeFunction = read("supabase/functions/send-weekly-digest/index.ts");
const configToml = read("supabase/config.toml");

/**
 * notifications.type is a plain text column governed by a CHECK constraint that is
 * dropped and fully restated on every change. Restating a stale list silently breaks
 * every type omitted from it — this has been a live hazard four times.
 */
const NOTIFICATION_TYPES = [
  "follow", "like", "comment", "recommendation", "friend_joined", "suggest_follow",
  "visit_request", "architect_verification", "ambassador_application_received",
  "ambassador_application_approved", "ambassador_application_rejected",
  "ambassador_membership_review", "award_win", "feedback_status_updated",
  "feedback_notes_updated", "project_idea_submitted", "collection_collab_requested",
  "collection_collab_accepted", "collection_collab_rejected", "collection_collab_added",
  "contribution_approved", "contribution_flagged", "person_claimed", "weekly_digest",
];

const NEW_FUNCTIONS = [
  "_digest_chapter_backlog",
  "compute_weekly_digest_payloads",
  "get_pending_weekly_digest_emails",
  "run_weekly_digest",
];

describe("weekly digest migration", () => {
  it("restates every notification type, losing none", () => {
    const constraint = migration.slice(
      migration.indexOf("ADD CONSTRAINT notifications_type_check"),
    );
    const list = constraint.slice(0, constraint.indexOf("));"));

    for (const type of NOTIFICATION_TYPES) {
      expect(list, `notifications_type_check is missing '${type}'`).toContain(`'${type}'`);
    }
    expect(list.match(/'[a-z_]+'/g)).toHaveLength(NOTIFICATION_TYPES.length);
  });

  it("pins search_path and revokes PUBLIC on every new function", () => {
    for (const fn of NEW_FUNCTIONS) {
      expect(migration).toContain(`FUNCTION public.${fn} `);
      expect(
        migration,
        `${fn} must be REVOKEd from PUBLIC`,
      ).toContain(`REVOKE ALL ON FUNCTION public.${fn} `);
    }
    // One SET search_path per function definition.
    expect(migration.match(/SET search_path/g)?.length).toBeGreaterThanOrEqual(
      NEW_FUNCTIONS.length,
    );
  });

  it("grants execute only to service_role — nothing here is called from the browser", () => {
    const grants = migration
      .split("\n")
      .filter((line) => line.trimStart().startsWith("GRANT "));
    expect(grants.length).toBeGreaterThan(0);
    for (const grant of grants) {
      expect(grant).toContain("TO service_role");
      expect(grant).not.toMatch(/\bTO\b.*\b(anon|authenticated)\b/);
    }
  });

  /**
   * REVOKE ... FROM PUBLIC is not enough on Supabase: ALTER DEFAULT PRIVILEGES grants
   * EXECUTE to anon and authenticated DIRECTLY at creation, and revoking the PUBLIC
   * pseudo-role leaves those grants intact. Caught live — an anonymous
   * POST /rest/v1/rpc/run_weekly_digest returned 200 and ran the digest.
   */
  it("revokes anon and authenticated by name, not just PUBLIC", () => {
    for (const fn of NEW_FUNCTIONS) {
      const revoke = migration
        .split("\n")
        .find((line) => line.startsWith(`REVOKE ALL ON FUNCTION public.${fn} `));
      expect(revoke, `${fn} has no REVOKE line`).toBeDefined();
      expect(revoke, `${fn} must be revoked from anon`).toContain("anon");
      expect(revoke, `${fn} must be revoked from authenticated`).toContain("authenticated");
    }
  });

  /**
   * 20271151000000's header records that per-row _building_in_ambassador_chapter_scope()
   * calls blew the 8s statement timeout and returned HTTP 500s. The digest must use the
   * set-based scoped_buildings CTE instead.
   */
  it("never calls the per-row chapter scope helper", () => {
    // Comments are stripped: the header names the helper to explain why it is avoided.
    const sql = migration
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    expect(sql).not.toContain("_building_in_ambassador_chapter_scope");
    expect(sql).toContain("scoped_buildings");
  });

  it("keys the ledger by (user_id, week_start) with RLS enabled", () => {
    expect(migration).toContain("PRIMARY KEY (user_id, week_start)");
    expect(migration).toContain(
      "ALTER TABLE public.embassy_digest_deliveries ENABLE ROW LEVEL SECURITY",
    );
  });

  it("gates each delivery step on its own column so a retry cannot double-send", () => {
    expect(migration).toContain("ON CONFLICT (user_id, week_start) DO NOTHING");
    expect(migration).toContain("notified_at IS NULL");
    expect(migration).toContain("emailed_at IS NULL");
  });

  it("schedules the job for Monday 09:00 UTC", () => {
    expect(migration).toContain("'embassy-weekly-digest'");
    expect(migration).toContain("'0 9 * * 1'");
    expect(migration).toContain("cron.unschedule('embassy-weekly-digest')");
  });
});

describe("send-weekly-digest edge function", () => {
  /**
   * The platform's verify_jwt=true accepts ANY logged-in user's JWT, so the in-code
   * service-role comparison is the actual gate. Both halves are asserted because either
   * one alone leaves the mailer triggerable by any signed-in user.
   */
  it("compares the bearer token against the service role key", () => {
    expect(edgeFunction).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(edgeFunction).toMatch(/bearer\s*!==\s*serviceRoleKey/);
    expect(edgeFunction).toContain("403");
  });

  it("is absent from config.toml, so verify_jwt stays on", () => {
    expect(configToml).not.toContain("[functions.send-weekly-digest]");
  });

  it("marks each delivery individually so a mid-loop crash resumes", () => {
    expect(edgeFunction).toContain("embassy_digest_deliveries");
    expect(edgeFunction).toContain("emailed_at");
    expect(edgeFunction).toContain("email_error");
  });
});
