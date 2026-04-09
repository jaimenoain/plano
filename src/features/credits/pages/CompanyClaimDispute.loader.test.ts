import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import { companyClaimDisputeLoader } from "./CompanyClaimDispute.loader";

const createSupabaseServerClient = vi.fn();

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServerClient: (...args: unknown[]) => createSupabaseServerClient(...args),
}));

function supabaseForLoader(opts: {
  companyRow: { id: string; name: string; claim_status: string } | null;
  companyError?: { message: string } | null;
  user: { id: string } | null;
  stewardRow: { id: string } | null;
}) {
  const companiesMaybeSingle = vi.fn().mockResolvedValue({
    data: opts.companyRow,
    error: opts.companyError ?? null,
  });
  const stewardMaybeSingle = vi.fn().mockResolvedValue({
    data: opts.stewardRow,
    error: null,
  });
  return {
    from: vi.fn((table: string) => {
      if (table === "companies") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: companiesMaybeSingle })),
          })),
        };
      }
      if (table === "company_stewards") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: stewardMaybeSingle })),
            })),
          })),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: opts.user }, error: null }),
    },
  };
}

function args(slug: string): LoaderFunctionArgs {
  return {
    request: new Request(`https://plano.app/company/${slug}/dispute`),
    params: { slug },
    context: undefined,
  } as LoaderFunctionArgs;
}

describe("companyClaimDisputeLoader (QA 7.4)", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
  });

  it("returns 404 when slug is missing", async () => {
    await expect(
      companyClaimDisputeLoader({
        request: new Request("https://plano.app/company//dispute"),
        params: { slug: "" },
        context: undefined,
      } as LoaderFunctionArgs),
    ).rejects.toMatchObject({ status: 404 });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns 404 when company row is missing", async () => {
    createSupabaseServerClient.mockReturnValue(
      supabaseForLoader({
        companyRow: null,
        user: null,
        stewardRow: null,
      }),
    );

    await expect(companyClaimDisputeLoader(args("unknown-co"))).rejects.toMatchObject({ status: 404 });
  });

  it("redirects to company page when claim_status is not claimed", async () => {
    createSupabaseServerClient.mockReturnValue(
      supabaseForLoader({
        companyRow: { id: "c1", name: "Open Co", claim_status: "unclaimed" },
        user: { id: "u1" },
        stewardRow: null,
      }),
    );

    const out = await companyClaimDisputeLoader(args("open-co"));
    expect(out).toBeInstanceOf(Response);
    expect((out as Response).status).toBe(302);
    expect((out as Response).headers.get("Location")).toBe("/company/open-co");
  });

  it("redirects to company page when the current user is already a steward", async () => {
    createSupabaseServerClient.mockReturnValue(
      supabaseForLoader({
        companyRow: { id: "c1", name: "Claimed Co", claim_status: "claimed" },
        user: { id: "owner-1" },
        stewardRow: { id: "st-1" },
      }),
    );

    const out = await companyClaimDisputeLoader(args("claimed-co"));
    expect(out).toBeInstanceOf(Response);
    expect((out as Response).status).toBe(302);
    expect((out as Response).headers.get("Location")).toBe("/company/claimed-co");
  });

  it("returns loader data for claimed company when user is not a steward", async () => {
    createSupabaseServerClient.mockReturnValue(
      supabaseForLoader({
        companyRow: { id: "c1", name: "Claimed Co", claim_status: "claimed" },
        user: { id: "stranger" },
        stewardRow: null,
      }),
    );

    const out = await companyClaimDisputeLoader(args("claimed-co"));
    expect(out).toMatchObject({ type: "DataWithResponseInit" });
    expect((out as { data: unknown }).data).toEqual({
      companyId: "c1",
      companyName: "Claimed Co",
      slug: "claimed-co",
    });
  });

  it("returns loader data when not signed in (form shows log-in CTA)", async () => {
    createSupabaseServerClient.mockReturnValue(
      supabaseForLoader({
        companyRow: { id: "c1", name: "Claimed Co", claim_status: "claimed" },
        user: null,
        stewardRow: null,
      }),
    );

    const out = await companyClaimDisputeLoader(args("claimed-co"));
    expect(out).toMatchObject({ type: "DataWithResponseInit" });
    expect((out as { data: unknown }).data).toEqual({
      companyId: "c1",
      companyName: "Claimed Co",
      slug: "claimed-co",
    });
  });
});
