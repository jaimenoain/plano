import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCampaignProgress } from "./campaignProgress";
import { supabase } from "@/integrations/supabase/client";

// Chainable query stub: records filters, resolves to the canned result.
interface TableCall {
  table: string;
  selected?: string;
  filters: Array<{ op: string; args: unknown[] }>;
}

const calls: TableCall[] = [];
const results: Record<string, unknown> = {};

vi.mock("@/integrations/supabase/client", () => {
  const from = vi.fn((table: string) => {
    const call: TableCall = { table, filters: [] };
    calls.push(call);
    const builder: Record<string, unknown> = {
      select: vi.fn((cols: string) => {
        call.selected = cols;
        return builder;
      }),
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve(results[table] ?? { data: null, count: null }).then(resolve),
    };
    for (const op of ["eq", "in", "gte", "lte"]) {
      builder[op] = vi.fn((...args: unknown[]) => {
        call.filters.push({ op, args });
        return builder;
      });
    }
    return builder;
  });
  return { supabase: { from } };
});

const CAMPAIGN = { start_date: "2026-07-01", end_date: "2026-07-31", metric_type: "outreach" };

describe("fetchCampaignProgress (outreach)", () => {
  beforeEach(() => {
    calls.length = 0;
    for (const k of Object.keys(results)) delete results[k];
  });

  it("matches outreach_log.ambassador_id against member USER ids, not membership ids", async () => {
    results["ambassador_memberships"] = {
      data: [{ user_id: "user-a" }, { user_id: "user-b" }],
    };
    results["outreach_log"] = { count: 7 };

    const progress = await fetchCampaignProgress(CAMPAIGN, "chapter-1");

    expect(progress).toBe(7);

    const membershipCall = calls.find((c) => c.table === "ambassador_memberships");
    // The member lookup must fetch user ids — membership row ids never match
    // outreach_log.ambassador_id (it stores profile/user ids).
    expect(membershipCall?.selected).toBe("user_id");

    const outreachCall = calls.find((c) => c.table === "outreach_log");
    const inFilter = outreachCall?.filters.find((f) => f.op === "in");
    expect(inFilter?.args).toEqual(["ambassador_id", ["user-a", "user-b"]]);
  });

  it("returns 0 without querying outreach_log when the chapter has no active members", async () => {
    results["ambassador_memberships"] = { data: [] };

    const progress = await fetchCampaignProgress(CAMPAIGN, "chapter-1");

    expect(progress).toBe(0);
    expect(calls.some((c) => c.table === "outreach_log")).toBe(false);
  });
});

// Keep the import "used" for the mock factory's sake.
void supabase;
