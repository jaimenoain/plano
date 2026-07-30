import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import { buildingLoader } from "./BuildingDetails.loader";

const createSupabaseServerClient = vi.fn();
const fetchBuildingDetails = vi.fn();
const getBuildingWithLocality = vi.fn();

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServerClient: (...args: unknown[]) =>
    createSupabaseServerClient(...args),
}));

vi.mock("@/utils/supabaseFallback", () => ({
  fetchBuildingDetails: (...args: unknown[]) => fetchBuildingDetails(...args),
}));

vi.mock("@/features/buildings/api/buildingsApi", () => ({
  getBuildingWithLocality: (...args: unknown[]) => getBuildingWithLocality(...args),
}));

vi.mock("@/features/credits/api/credits", () => ({
  getBuildingCreditsWithClient: async () => [],
}));

const DUPLICATE_ID = "00000000-0000-4000-8000-00000000d0d0";
const SURVIVOR_ID = "00000000-0000-4000-8000-0000000051f0";

/** The live render path only queries `building_posts`; no posts means no images. */
function mockSupabase() {
  createSupabaseServerClient.mockImplementation(() => ({
    from: (table: string) => {
      if (table === "building_posts") {
        return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }));
}

/** A minimal `buildings` row as `fetchBuildingDetails` (select "*") returns it. */
function buildingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: DUPLICATE_ID,
    slug: "farnsworth-house-3342",
    short_id: 3342,
    locality_id: null,
    hero_image_id: null,
    community_preview_url: null,
    merged_into_id: null,
    ...overrides,
  };
}

function args(id: string, slug?: string): LoaderFunctionArgs {
  const path = slug ? `/building/${id}/${slug}` : `/building/${id}`;
  return {
    request: new Request(`https://plano.app${path}`),
    params: slug ? { id, slug } : { id },
    context: undefined,
  } as LoaderFunctionArgs;
}

describe("buildingLoader — merged duplicates redirect to their survivor", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
    fetchBuildingDetails.mockReset();
    getBuildingWithLocality.mockReset();
    mockSupabase();
  });

  it("301s a merged building to the survivor's locality URL", async () => {
    fetchBuildingDetails.mockResolvedValue(
      buildingRow({ merged_into_id: SURVIVOR_ID }),
    );
    getBuildingWithLocality.mockResolvedValue({
      id: SURVIVOR_ID,
      slug: "farnsworth-house-3745",
      short_id: 3745,
      locality: { country_code: "US", city_slug: "plano" },
    });

    const caught = await buildingLoader(
      args("3342", "farnsworth-house-3342"),
    ).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(Response);
    const res = caught as Response;
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe(
      "/architecture/us/plano/3745/farnsworth-house-3745",
    );
    expect(getBuildingWithLocality).toHaveBeenCalledWith(
      expect.anything(),
      SURVIVOR_ID,
    );
  });

  it("301s to the legacy /building URL when the survivor has no locality", async () => {
    fetchBuildingDetails.mockResolvedValue(
      buildingRow({ merged_into_id: SURVIVOR_ID }),
    );
    getBuildingWithLocality.mockResolvedValue({
      id: SURVIVOR_ID,
      slug: "farnsworth-house-3745",
      short_id: 3745,
      locality: null,
    });

    const caught = await buildingLoader(args("3342")).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(301);
    expect((caught as Response).headers.get("Location")).toBe(
      "/building/3745/farnsworth-house-3745",
    );
  });

  it("does not redirect a live building, and never looks up a survivor", async () => {
    fetchBuildingDetails.mockResolvedValue(
      buildingRow({ id: SURVIVOR_ID, slug: null, short_id: null }),
    );

    const result = await buildingLoader(args(SURVIVOR_ID));

    expect(result).not.toBeInstanceOf(Response);
    expect(getBuildingWithLocality).not.toHaveBeenCalled();
  });

  it("renders instead of looping when the survivor cannot be resolved", async () => {
    fetchBuildingDetails.mockResolvedValue(
      buildingRow({ id: SURVIVOR_ID, slug: null, short_id: null, merged_into_id: DUPLICATE_ID }),
    );
    getBuildingWithLocality.mockResolvedValue(null);

    const result = await buildingLoader(args(SURVIVOR_ID));

    expect(result).not.toBeInstanceOf(Response);
  });

  it("ignores a self-referential pointer without querying for a survivor", async () => {
    fetchBuildingDetails.mockResolvedValue(
      buildingRow({ id: SURVIVOR_ID, slug: null, short_id: null, merged_into_id: SURVIVOR_ID }),
    );

    const result = await buildingLoader(args(SURVIVOR_ID));

    expect(result).not.toBeInstanceOf(Response);
    expect(getBuildingWithLocality).not.toHaveBeenCalled();
  });

  it("404s when the building does not exist", async () => {
    fetchBuildingDetails.mockRejectedValue(new Error("Building not found"));

    const caught = await buildingLoader(args("nope")).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(Response);
    expect((caught as Response).status).toBe(404);
  });
});
