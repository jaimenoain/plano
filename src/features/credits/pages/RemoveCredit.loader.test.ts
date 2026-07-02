import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import { removeCreditLoader } from "./RemoveCredit.loader";

const removeCreditByTokenWithClient = vi.fn();

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServerClient: vi.fn(() => ({ tag: "mock-supabase" })),
}));

vi.mock("@/features/credits/api/credits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/credits")>();
  return {
    ...actual,
    removeCreditByTokenWithClient: (...args: unknown[]) =>
      removeCreditByTokenWithClient(...args) as ReturnType<
        typeof actual.removeCreditByTokenWithClient
      >,
  };
});

const HEX_64 = `${"a".repeat(64)}`;
const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

function args(token: string): LoaderFunctionArgs {
  return {
    request: new Request(`https://plano.app/remove-credit/${token}`),
    params: { token },
    context: undefined,
  } as LoaderFunctionArgs;
}

describe("removeCreditLoader (QA 6.4)", () => {
  beforeEach(() => {
    removeCreditByTokenWithClient.mockReset();
  });

  it("returns invalid_format for non-hex / wrong-length token without calling redeem", async () => {
    const out = await removeCreditLoader(args("completely-invalid-token"));
    expect(out).toMatchObject({ type: "DataWithResponseInit" });
    expect((out as { data: unknown }).data).toEqual({ outcome: "invalid_format" });
    expect(removeCreditByTokenWithClient).not.toHaveBeenCalled();
  });

  it("returns success with building link when RPC redeems", async () => {
    removeCreditByTokenWithClient.mockResolvedValue({
      ok: true,
      creditId: "c1",
      buildingId: BUILDING_ID,
      buildingName: "Test Tower",
      buildingSlug: "test-tower",
      buildingShortId: 42,
    });
    const out = await removeCreditLoader(args(HEX_64));
    expect((out as { data: unknown }).data).toEqual({
      outcome: "success",
      buildingName: "Test Tower",
      buildingHref: `/building/42/test-tower`,
    });
    expect(removeCreditByTokenWithClient).toHaveBeenCalledWith(
      { tag: "mock-supabase" },
      HEX_64,
    );
  });

  it("returns success with id-only building href when slug is absent", async () => {
    removeCreditByTokenWithClient.mockResolvedValue({
      ok: true,
      creditId: "c1",
      buildingId: BUILDING_ID,
      buildingName: "No Slug",
    });
    const out = await removeCreditLoader(args(HEX_64));
    expect((out as { data: unknown }).data).toEqual({
      outcome: "success",
      buildingName: "No Slug",
      buildingHref: `/building/${BUILDING_ID}`,
    });
  });

  it("maps already_used and expired RPC errors for the error view", async () => {
    removeCreditByTokenWithClient.mockResolvedValueOnce({ ok: false, error: "already_used" });
    const used = await removeCreditLoader(args(HEX_64));
    expect((used as { data: unknown }).data).toEqual({
      outcome: "error",
      error: "already_used",
    });

    removeCreditByTokenWithClient.mockResolvedValueOnce({ ok: false, error: "expired" });
    const exp = await removeCreditLoader(args(HEX_64));
    expect((exp as { data: unknown }).data).toEqual({ outcome: "error", error: "expired" });
  });

  it("maps unknown_token for invalid / unknown redeem responses", async () => {
    removeCreditByTokenWithClient.mockResolvedValue({ ok: false, error: "unknown_token" });
    const out = await removeCreditLoader(args(HEX_64));
    expect((out as { data: unknown }).data).toEqual({
      outcome: "error",
      error: "unknown_token",
    });
  });
});
