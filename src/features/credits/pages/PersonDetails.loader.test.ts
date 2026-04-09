import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import { personDetailsLoader, type PersonDetailsLoaderData } from "./PersonDetails.loader";
import { getPersonWithClient } from "@/features/credits/api/people";
import type { PersonWithCredits } from "@/features/credits/types";

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServerClient: vi.fn(() => ({})),
}));

vi.mock("@/features/credits/api/people", () => ({
  getPersonWithClient: vi.fn(),
}));

const getPersonWithClientMock = vi.mocked(getPersonWithClient);

function args(slug: string): LoaderFunctionArgs {
  return {
    request: new Request(`https://plano.app/person/${slug}`),
    params: { slug },
    context: undefined,
  } as LoaderFunctionArgs;
}

const basePerson = {
  id: "p1",
  name: "Jane Doe",
  slug: "jane-doe",
  bio: "Architect and educator.",
  nationality: "British",
  birthYear: 1970,
  deathYear: null,
  avatarUrl: null,
  website: "example.com",
  locationNote: "London",
  claimedByUserId: null,
  claimStatus: "unclaimed" as const,
  createdAt: "t0",
  updatedAt: "t0",
};

describe("personDetailsLoader (QA 3.1)", () => {
  beforeEach(() => {
    getPersonWithClientMock.mockReset();
  });

  it("throws Response 404 when slug is missing", async () => {
    const res = await personDetailsLoader({
      request: new Request("https://plano.app/person/"),
      params: { slug: "" },
      context: undefined,
    } as LoaderFunctionArgs).catch((e: unknown) => e);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(404);
  });

  it("throws Response 404 when person is not found", async () => {
    getPersonWithClientMock.mockResolvedValue(null);
    const res = await personDetailsLoader(args("nope")).catch((e: unknown) => e);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(404);
  });

  it("returns JSON body with meta title and Person JSON-LD", async () => {
    const payload: PersonWithCredits = {
      person: basePerson,
      credits: [],
    };
    getPersonWithClientMock.mockResolvedValue(payload);

    const wrapped = await personDetailsLoader(args("jane-doe"));
    const body = (wrapped as { data: PersonDetailsLoaderData }).data;

    expect(body.metaTitle).toBe("Jane Doe — buildings, projects and credits on Plano");
    expect(body.canonical).toBe("https://plano.app/person/jane-doe");

    const ld = body.structuredData as Record<string, unknown>;
    expect(ld["@type"]).toBe("Person");
    expect(ld.name).toBe("Jane Doe");
    expect(ld.url).toBe("https://plano.app/person/jane-doe");
    expect(ld.nationality).toBe("British");
  });
});
