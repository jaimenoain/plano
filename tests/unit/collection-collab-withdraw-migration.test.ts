import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guards on 20271205000000 (roadmap Task 5.2), which adds
 * withdraw_collection_collaboration: lets a requester undo their own still-pending
 * collaboration request. The RPC must delete the owner's already-inserted
 * `collection_collab_requested` notification (found by `request_id` in its metadata)
 * before the request row, so an undone request never surfaces to the owner, and it
 * must raise the same four error vocabularies the sibling RPCs in
 * 20271177000000_collection_collaboration_requests.sql use.
 */

const repoRoot = resolve(__dirname, "..", "..");
const migration = readFileSync(
  resolve(repoRoot, "supabase/migrations/20271205000000_collection_collab_withdraw.sql"),
  "utf8",
);

const sql = migration
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

describe("withdraw_collection_collaboration migration", () => {
  it("is a SECURITY DEFINER function with search_path pinned", () => {
    expect(sql).toMatch(/SECURITY\s+DEFINER/i);
    expect(sql).toContain("SET search_path = public");
  });

  it("grants execute to authenticated only", () => {
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.withdraw_collection_collaboration (uuid) TO authenticated;",
    );
  });

  /**
   * `revoke ... from public` alone leaves anon/authenticated's direct grants from
   * ALTER DEFAULT PRIVILEGES untouched — the function stays callable with the anon
   * key. See _TEMPLATE_rpc.sql.txt and the `run_weekly_digest` incident it documents.
   */
  it("revokes from anon and authenticated by name, not just PUBLIC", () => {
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.withdraw_collection_collaboration (uuid) FROM PUBLIC, anon, authenticated;",
    );
  });

  it("raises the full error vocabulary", () => {
    expect(sql).toContain("RAISE EXCEPTION 'not_authenticated'");
    expect(sql).toContain("RAISE EXCEPTION 'request_not_found'");
    expect(sql).toContain("RAISE EXCEPTION 'not_authorized'");
    expect(sql).toContain("RAISE EXCEPTION 'already_reviewed'");
  });

  it("only lets the requester withdraw their own request", () => {
    expect(sql).toContain("v_req.requester_id <> v_uid");
  });

  it("only allows withdrawing a still-pending request", () => {
    expect(sql).toContain("v_req.status <> 'pending'");
  });

  /**
   * The owner already saw a notification inserted by request_collection_collaboration
   * before the requester could undo; that notification must be cleaned up so the
   * owner never has to see an undone request.
   */
  it("deletes the owner's request notification before the request row", () => {
    const notifDelete = sql.indexOf("DELETE FROM public.notifications");
    const reqDelete = sql.indexOf("DELETE FROM public.collection_collaboration_requests");
    expect(notifDelete, "must delete the notification").toBeGreaterThan(-1);
    expect(reqDelete, "must delete the request row").toBeGreaterThan(-1);
    expect(notifDelete).toBeLessThan(reqDelete);

    const notifBlock = sql.slice(notifDelete, reqDelete);
    expect(notifBlock).toContain("type = 'collection_collab_requested'");
    expect(notifBlock).toContain("metadata ->> 'request_id' = p_request_id::text");
  });

  it("deletes the row outright rather than introducing a new status or notification type", () => {
    expect(sql).not.toContain("'withdrawn'");
    expect(sql).not.toMatch(/notifications_type_check/);
  });
});
