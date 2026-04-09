import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import { verifyCompanyClaimLoader } from "./VerifyCompanyClaim.loader";

const createSupabaseServerClient = vi.fn();
const redeemCompanyClaimTokenWithClient = vi.fn();

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServerClient: (...args: unknown[]) => createSupabaseServerClient(...args),
}));

vi.mock("@/features/credits/api/companies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/companies")>();
  return {
    ...actual,
    redeemCompanyClaimTokenWithClient: (...args: unknown[]) =>
      redeemCompanyClaimTokenWithClient(...args) as ReturnType<
        typeof actual.redeemCompanyClaimTokenWithClient
      >,
  };
});

const HEX_64 = `${"b".repeat(64)}`;

function args(token: string): LoaderFunctionArgs {
  return {
    request: new Request(`https://plano.app/verify-company-claim/${token}`),
    params: { token },
    context: undefined,
  } as LoaderFunctionArgs;
}

describe("verifyCompanyClaimLoader (QA 7.2)", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
    redeemCompanyClaimTokenWithClient.mockReset();
    createSupabaseServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn(),
      },
    });
  });

  it("returns invalid_format for malformed token without touching Supabase", async () => {
    const out = await verifyCompanyClaimLoader(args("not-sixty-four-hex-characters-here-at-all"));
    expect(out).toMatchObject({ type: "DataWithResponseInit" });
    expect((out as { data: unknown }).data).toEqual({ outcome: "invalid_format" });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns needs_auth when there is no session", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    createSupabaseServerClient.mockReturnValue(client);

    const out = await verifyCompanyClaimLoader(args(HEX_64));
    expect((out as { data: unknown }).data).toEqual({
      outcome: "needs_auth",
      returnPath: `/verify-company-claim/${HEX_64}`,
    });
    expect(redeemCompanyClaimTokenWithClient).not.toHaveBeenCalled();
  });

  it("throws redirect to company page with claimVerified when redeem succeeds", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    };
    createSupabaseServerClient.mockReturnValue(client);
    redeemCompanyClaimTokenWithClient.mockResolvedValue({ ok: true, companySlug: "acme-co" });

    try {
      await verifyCompanyClaimLoader(args(HEX_64));
      expect.fail("expected redirect Response to be thrown");
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(Response);
      const res = e as Response;
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/company/acme-co?claimVerified=1");
    }

    expect(redeemCompanyClaimTokenWithClient).toHaveBeenCalledWith(client, HEX_64);
  });

  it("returns error outcome for expired token (company stays unclaimed)", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    };
    createSupabaseServerClient.mockReturnValue(client);
    redeemCompanyClaimTokenWithClient.mockResolvedValue({ ok: false, error: "expired" });

    const out = await verifyCompanyClaimLoader(args(HEX_64));
    expect((out as { data: unknown }).data).toEqual({ outcome: "error", error: "expired" });
  });
});
