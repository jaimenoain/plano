import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import {
  architectIdRedirectLoader,
  architectEditRedirectLoader,
} from "./architectIdRedirect.loader";

const createSupabaseServerClient = vi.fn();

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServerClient: (...args: unknown[]) =>
    createSupabaseServerClient(...args),
}));

const VALID_PERSON_UUID = "00000000-0000-4000-8000-0000000000a1";
const VALID_COMPANY_UUID = "00000000-0000-4000-8000-0000000000b2";
const VALID_UNKNOWN_UUID = "ffffffff-ffff-4fff-8fff-ffffffffffff";

function mockChain(result: { data: unknown; error: Error | null }) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => result,
      }),
    }),
  };
}

function mockSupabase(
  people: { data: unknown; error: Error | null },
  company: { data: unknown; error: Error | null },
) {
  createSupabaseServerClient.mockImplementation(() => ({
    from: (table: string) => {
      if (table === "people") return mockChain(people);
      if (table === "companies") return mockChain(company);
      throw new Error(`unexpected table: ${table}`);
    },
  }));
}

function legacyProfileRequestUrl(id: string, pathSuffix = ""): string {
  return `https://plano.app${["/", "architect", "/", id].join("")}${pathSuffix}`;
}

function args(
  id: string,
  pathSuffix = "",
): LoaderFunctionArgs {
  return {
    request: new Request(legacyProfileRequestUrl(id, pathSuffix)),
    params: { id },
    context: undefined,
  } as LoaderFunctionArgs;
}

describe("architectIdRedirectLoader (QA 3.3)", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
  });

  it("returns 404 when id is missing", async () => {
    const caught = await architectIdRedirectLoader({
      request: new Request(legacyProfileRequestUrl("")),
      params: { id: "" },
      context: undefined,
    } as LoaderFunctionArgs).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(404);
  });

  it("returns 404 when id is not a valid UUID", async () => {
    const caught = await architectIdRedirectLoader(
      args("not-a-uuid"),
    ).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(404);
  });

  it("301 replace to /person/:slug when people.id matches (single hop, no /profile)", async () => {
    mockSupabase(
      { data: { slug: "jane-architect" }, error: null },
      { data: null, error: null },
    );

    // Use the `.data` single-fetch URL: the loader only sets Cache-Control on `.data`
    // requests (the cached client-navigation path), which this test asserts below.
    const caught = await architectIdRedirectLoader(
      args(VALID_PERSON_UUID, ".data"),
    ).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(Response);
    const res = caught as Response;
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("/person/jane-architect");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=600");
  });

  it("301 replace to /company/:slug when only companies.id matches", async () => {
    mockSupabase(
      { data: null, error: null },
      { data: { slug: "studio-one" }, error: null },
    );

    const caught = await architectIdRedirectLoader(
      args(VALID_COMPANY_UUID),
    ).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(301);
    expect((caught as Response).headers.get("Location")).toBe(
      "/company/studio-one",
    );
  });

  it("returns 404 when UUID is valid but no person or company row exists", async () => {
    mockSupabase(
      { data: null, error: null },
      { data: null, error: null },
    );

    const caught = await architectIdRedirectLoader(
      args(VALID_UNKNOWN_UUID),
    ).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(404);
  });

  it("rethrows when people query fails", async () => {
    const dbErr = new Error("rls");
    mockSupabase({ data: null, error: dbErr }, { data: null, error: null });

    await expect(architectIdRedirectLoader(args(VALID_PERSON_UUID))).rejects.toThrow(
      "rls",
    );
  });
});

describe("architectEditRedirectLoader (QA 3.3)", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
  });

  it("301 replace to /person/:slug?edit=1 when person exists", async () => {
    mockSupabase(
      { data: { slug: "claimed-person" }, error: null },
      { data: null, error: null },
    );

    const caught = await architectEditRedirectLoader(
      args(VALID_PERSON_UUID, "/edit"),
    ).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(301);
    expect((caught as Response).headers.get("Location")).toBe(
      "/person/claimed-person?edit=1",
    );
  });
});
