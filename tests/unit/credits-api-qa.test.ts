import { describe, expect, it, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addBuildingCredit,
  flagCredit,
  getBuildingCreditsWithClient,
  removeCreditByTokenWithClient,
  updateCreditStatus,
} from "@/features/credits/api/credits";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

function mkRow(overrides: Partial<Record<string, unknown>>) {
  return {
    id: "credit-id",
    building_id: BUILDING_ID,
    person_id: "22222222-2222-4222-8222-222222222222",
    company_id: null,
    role: "design_architect",
    role_custom: null,
    credit_tier: "primary",
    is_lead: false,
    contribution_notes: null,
    year_from: null,
    year_to: null,
    project_url: null,
    status: "active",
    flag_reason: null,
    flag_notes: null,
    flagged_at: null,
    flagged_by_user_id: null,
    added_by_user_id: null,
    display_order: 0,
    created_at: "t",
    updated_at: "t",
    person: { id: "p1", name: "P", slug: "p" },
    company: null,
    ...overrides,
  };
}

describe("QA 2.3 — getBuildingCreditsWithClient (injected client)", () => {
  it("orders by tier primary → contributor → ancillary, then display_order, then is_lead", async () => {
    const rows = [
      mkRow({ id: "a", credit_tier: "ancillary", display_order: 0, is_lead: true }),
      mkRow({ id: "c", credit_tier: "contributor", display_order: 0, is_lead: false }),
      mkRow({ id: "p-lo", credit_tier: "primary", display_order: 0, is_lead: false }),
      mkRow({ id: "p-hi", credit_tier: "primary", display_order: 0, is_lead: true }),
    ];

    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
        })),
      })),
    } as unknown as SupabaseClient;

    const out = await getBuildingCreditsWithClient(client, BUILDING_ID);
    expect(out.map((r) => r.id)).toEqual(["p-hi", "p-lo", "c", "a"]);
  });

  it("does not strip hidden rows — RLS decides which rows are returned", async () => {
    const rows = [
      mkRow({ id: "vis", status: "active" }),
      mkRow({ id: "hid", status: "hidden" }),
    ];
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
        })),
      })),
    } as unknown as SupabaseClient;

    const out = await getBuildingCreditsWithClient(client, BUILDING_ID);
    expect(out.map((r) => r.id).sort()).toEqual(["hid", "vis"]);
  });
});

vi.mock("@/features/credits/api/entity-audit-log", () => ({
  insertEntityAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const { mockFrom, mockRpc, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    functions: { invoke: vi.fn() },
  },
}));

const VALID_HEX_64 = `${"a".repeat(64)}`;

describe("QA 2.3 — credits API (mocked supabase)", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockGetUser.mockReset();
  });

  it("addBuildingCredit rejects both personId and companyId missing before auth or DB", async () => {
    await expect(
      addBuildingCredit({
        buildingId: BUILDING_ID,
        role: "design_architect",
      }),
    ).rejects.toBeInstanceOf(ZodError);

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("flagCredit calls RPC then returns row with flagged status and null flaggedByUserId when row has null", async () => {
    const creditId = "44444444-4444-4444-8444-444444444444";

    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });

    const flaggedRow = mkRow({
      id: creditId,
      status: "flagged",
      flag_reason: "wrong_role",
      flag_notes: null,
      flagged_at: "2026-01-01",
      flagged_by_user_id: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table !== "building_credits") throw new Error(`unexpected ${table}`);
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: flaggedRow, error: null }),
          })),
        })),
      };
    });

    const out = await flagCredit(creditId, "wrong_role", null);
    expect(mockRpc).toHaveBeenCalledWith("flag_building_credit", {
      p_credit_id: creditId,
      p_reason: "wrong_role",
      p_notes: "",
    });
    expect(out.status).toBe("flagged");
    expect(out.flagReason).toBe("wrong_role");
    expect(out.flaggedByUserId).toBeNull();
  });

  it("flagCredit maps flaggedByUserId from row when RPC ran under a signed-in session (QA 5.3)", async () => {
    const creditId = "66666666-6666-4666-8666-666666666666";
    const userId = "77777777-7777-4777-8777-777777777777";

    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });

    const flaggedRow = mkRow({
      id: creditId,
      status: "flagged",
      flag_reason: "wrong_role",
      flagged_by_user_id: userId,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table !== "building_credits") throw new Error(`unexpected ${table}`);
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: flaggedRow, error: null }),
          })),
        })),
      };
    });

    const out = await flagCredit(creditId, "wrong_role", null);
    expect(out.flaggedByUserId).toBe(userId);
  });

  it("updateCreditStatus throws when update returns RLS error", async () => {
    const creditId = "55555555-5555-4555-8555-555555555555";

    let fromCall = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table !== "building_credits") throw new Error(`unexpected ${table}`);
      fromCall += 1;
      if (fromCall === 1) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: creditId, building_id: BUILDING_ID, status: "flagged" },
                error: null,
              }),
            })),
          })),
        };
      }
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "RLS", code: "42501" },
              }),
            })),
          })),
        })),
      };
    });

    await expect(updateCreditStatus(creditId, { status: "verified" })).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("updateCreditStatus returns mapped credit when update succeeds", async () => {
    const creditId = "66666666-6666-4666-8666-666666666666";
    const updatedRow = mkRow({ id: creditId, status: "verified" });

    let fromCall = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table !== "building_credits") throw new Error(`unexpected ${table}`);
      fromCall += 1;
      if (fromCall === 1) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: creditId, building_id: BUILDING_ID, status: "flagged" },
                error: null,
              }),
            })),
          })),
        };
      }
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
            })),
          })),
        })),
      };
    });

    const out = await updateCreditStatus(creditId, { status: "verified" });
    expect(out.status).toBe("verified");
  });

  it("removeCreditByTokenWithClient returns success when RPC payload is ok", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: true, credit_id: "c1", building_id: "b1", building_name: "Tower", building_slug: "tower" },
      error: null,
    });
    const result = await removeCreditByTokenWithClient({ rpc } as Pick<SupabaseClient, "rpc">, VALID_HEX_64);
    expect(result).toEqual({
      ok: true,
      creditId: "c1",
      buildingId: "b1",
      buildingName: "Tower",
      buildingSlug: "tower",
    });
    expect(rpc).toHaveBeenCalledWith("redeem_credit_removal_token", {
      p_token_hex: VALID_HEX_64.toLowerCase(),
    });
  });

  it("removeCreditByTokenWithClient returns already_used without second RPC from this test", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ok: false, error: "already_used" }, error: null });
    const result = await removeCreditByTokenWithClient({ rpc } as Pick<SupabaseClient, "rpc">, VALID_HEX_64);
    expect(result).toEqual({ ok: false, error: "already_used" });
  });

  it("removeCreditByTokenWithClient returns expired when RPC says expired", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ok: false, error: "expired" }, error: null });
    const result = await removeCreditByTokenWithClient({ rpc } as Pick<SupabaseClient, "rpc">, VALID_HEX_64);
    expect(result).toEqual({ ok: false, error: "expired" });
  });
});
