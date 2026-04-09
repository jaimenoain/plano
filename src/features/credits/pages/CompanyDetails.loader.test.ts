import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import {
  companyDetailsLoader,
  type CompanyDetailsLoaderData,
} from "./CompanyDetails.loader";
import { getCompanyWithClient } from "@/features/credits/api/companies";
import type { CompanyWithCredits } from "@/features/credits/types";

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServerClient: vi.fn(() => ({})),
}));

vi.mock("@/features/credits/api/companies", () => ({
  getCompanyWithClient: vi.fn(),
}));

const getCompanyWithClientMock = vi.mocked(getCompanyWithClient);

function args(slug: string): LoaderFunctionArgs {
  return {
    request: new Request(`https://plano.app/company/${slug}`),
    params: { slug },
    context: undefined,
  } as LoaderFunctionArgs;
}

const baseCompany = {
  id: "co1",
  name: "StructCo GmbH",
  slug: "structco",
  bio: "Structural engineering practice.",
  country: "Germany",
  foundedYear: 1990,
  dissolvedYear: null,
  logoUrl: null,
  website: "structco.example",
  verifiedDomain: null,
  claimStatus: "unclaimed" as const,
  createdAt: "t0",
  updatedAt: "t0",
};

describe("companyDetailsLoader (QA 4.1)", () => {
  beforeEach(() => {
    getCompanyWithClientMock.mockReset();
  });

  it("throws Response 404 when slug is missing", async () => {
    const res = await companyDetailsLoader({
      request: new Request("https://plano.app/company/"),
      params: { slug: "" },
      context: undefined,
    } as LoaderFunctionArgs).catch((e: unknown) => e);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(404);
  });

  it("throws Response 404 when company is not found", async () => {
    getCompanyWithClientMock.mockResolvedValue(null);
    const res = await companyDetailsLoader(args("nope")).catch((e: unknown) => e);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(404);
  });

  it("returns loader data with meta, canonical, and Organization JSON-LD", async () => {
    const payload: CompanyWithCredits = {
      company: baseCompany,
      credits: [],
    };
    getCompanyWithClientMock.mockResolvedValue(payload);

    const wrapped = await companyDetailsLoader(args("structco"));
    const body = (wrapped as { data: CompanyDetailsLoaderData }).data;

    expect(body.metaTitle).toBe(
      "StructCo GmbH — architecture and engineering projects on Plano",
    );
    expect(body.canonical).toBe("https://plano.app/company/structco");
    expect(body.description).toContain("Structural engineering practice.");

    const ld = body.structuredData as Record<string, unknown>;
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe("StructCo GmbH");
    expect(ld.url).toBe("https://plano.app/company/structco");
    expect(ld.sameAs).toBe("https://structco.example");
    const addr = ld.address as Record<string, unknown> | undefined;
    expect(addr?.["@type"]).toBe("PostalAddress");
    expect(addr?.addressCountry).toBe("Germany");
  });
});
