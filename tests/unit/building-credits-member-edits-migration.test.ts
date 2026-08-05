import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guards on 20271202000000 (roadmap Task 2.2), which opened `building_credits`
 * UPDATE to any signed-in member. Widening a policy is easy to do by accident on
 * a later edit, so the boundaries that make the widening safe are pinned here:
 * the three original principals must survive, the open branch must stay confined
 * to `status = 'active'`, and the provenance guard must keep discriminating on
 * `current_user` rather than `auth.uid()`.
 *
 * The client-side mirror of the same rule is pinned by `canEditCredit` in
 * `src/features/buildings/components/BuildingCredits.test.tsx`.
 */

const repoRoot = resolve(__dirname, "../..");
const migration = readFileSync(
  resolve(repoRoot, "supabase/migrations/20271202000000_building_credits_member_edits.sql"),
  "utf8",
);

const sql = migration
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

describe("building_credits member edits migration", () => {
  it("keeps the three original principals on the UPDATE policy", () => {
    expect(sql).toContain("public.is_admin()");
    expect(sql).toContain("p.claimed_by_user_id = (SELECT auth.uid())");
    expect(sql).toContain("cs.user_id = (SELECT auth.uid())");
    // Both halves of the policy, USING and WITH CHECK, carry every branch.
    const adminBranches = sql.match(/public\.is_admin\(\)/g) ?? [];
    expect(adminBranches.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * The open branch is the whole point of the migration and also its only risk.
   * `verified` was confirmed by the credited party and `flagged`/`hidden` is under
   * moderation — a member must reach none of them.
   */
  it("confines the open branch to active credits, in USING and WITH CHECK alike", () => {
    const openBranches =
      sql.match(
        /\(SELECT auth\.uid\(\)\) IS NOT NULL\s*\n\s*AND building_credits\.status = 'active'::public\.credit_status_enum/g,
      ) ?? [];
    expect(openBranches, "the member branch must appear in USING and in WITH CHECK").toHaveLength(2);
  });

  it("stops a member blanking both entity columns", () => {
    expect(sql).toContain(
      "(building_credits.person_id IS NOT NULL OR building_credits.company_id IS NOT NULL)",
    );
  });

  /**
   * `auth.uid()` inside a SECURITY DEFINER RPC is still the member who called it,
   * so an auth.uid()-based guard would fire on `flag_building_credit`,
   * `redeem_credit_removal_token`, `merge_buildings` and the ambassador approval
   * batches — every moderation path this feature must not break.
   */
  it("discriminates on current_user, never auth.uid(), in the provenance guard", () => {
    const guard = sql.slice(
      sql.indexOf("FUNCTION public.building_credits_guard_protected_columns"),
      sql.indexOf("CREATE TRIGGER building_credits_guard_protected_columns"),
    );
    expect(guard).toContain("current_user NOT IN ('authenticated', 'anon')");
    expect(guard).not.toContain("auth.uid()");
    expect(guard).not.toMatch(/SECURITY\s+DEFINER/i);
  });

  it("pins building_id and added_by_user_id against direct client writes", () => {
    expect(sql).toContain("NEW.building_id IS DISTINCT FROM OLD.building_id");
    expect(sql).toContain("NEW.added_by_user_id IS DISTINCT FROM OLD.added_by_user_id");
    expect(sql).toContain("BEFORE UPDATE ON public.building_credits");
  });

  /**
   * `insertEntityAuditLog` writes the edit as `credit_edited`; the audit table's
   * own policy whitelists action types, so the credit would save and the audit
   * insert would then fail if this were left out.
   */
  it("adds credit_edited to the client-writable audit action types", () => {
    expect(sql).toContain("'credit_edited'");
    expect(sql).toContain("entity_audit_logs_actor_insert");
    for (const kept of ["'credit_added'", "'credit_status_changed'", "'steward_removed'"]) {
      expect(sql, `${kept} must survive the policy rewrite`).toContain(kept);
    }
  });
});
