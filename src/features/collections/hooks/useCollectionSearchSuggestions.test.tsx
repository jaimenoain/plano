import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useCollectionSearchSuggestions } from "./useCollectionSearchSuggestions";

const { searchBuildingsV2Mock, addBuildingMock } = vi.hoisted(() => ({
  searchBuildingsV2Mock: vi.fn(),
  addBuildingMock: vi.fn(),
}));

vi.mock("@/features/search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/search")>();
  return { ...actual, searchBuildingsV2: searchBuildingsV2Mock };
});

vi.mock("../api/collectionItems", () => ({ addBuildingToCollection: addBuildingMock }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const hit = (id: string, name = `Building ${id}`, rank_score = 0.8) => ({
  id,
  name,
  slug: `b-${id}`,
  alt_name: null,
  hero_image_url: null,
  lat: 1,
  lng: 2,
  city: "London",
  country: "United Kingdom",
  year_completed: 2001,
  popularity_score: 0,
  tier_rank: null,
  credit_names: ["Zaha Hadid"],
  rank_score,
});

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const renderSuggestions = (
  overrides: Partial<Parameters<typeof useCollectionSearchSuggestions>[0]> = {},
) =>
  renderHook(
    () =>
      useCollectionSearchSuggestions({
        collectionId: "collection-1",
        query: "zaha",
        enabled: true,
        excludeBuildingIds: new Set<string>(),
        ...overrides,
      }),
    { wrapper },
  );

describe("useCollectionSearchSuggestions", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    searchBuildingsV2Mock.mockReset();
    searchBuildingsV2Mock.mockResolvedValue([]);
    addBuildingMock.mockReset();
    addBuildingMock.mockResolvedValue(undefined);
  });

  it("does not search for viewers who may not edit, or when the collection had matches", async () => {
    const { result } = renderSuggestions({ enabled: false });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(searchBuildingsV2Mock).not.toHaveBeenCalled();
  });

  it("does not search on a single character", async () => {
    const { result } = renderSuggestions({ query: "z" });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(searchBuildingsV2Mock).not.toHaveBeenCalled();
  });

  it("drops buildings already in the collection and caps the list at six", async () => {
    searchBuildingsV2Mock.mockResolvedValue(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => hit(id)),
    );

    const { result } = renderSuggestions({ excludeBuildingIds: new Set(["a", "b"]) });

    await waitFor(() => expect(result.current.buildings).toHaveLength(6));
    expect(searchBuildingsV2Mock).toHaveBeenCalledWith("zaha", { limit: 12 });
    expect(result.current.buildings.map((b) => b.id)).toEqual(["c", "d", "e", "f", "g", "h"]);
    // The rows carry through the fields the compact SERP row draws.
    expect(result.current.buildings[0]).toMatchObject({
      name: "Building c",
      city: "London",
      credits: [{ id: "Zaha Hadid", name: "Zaha Hadid" }],
    });
  });

  it("drops loose trigram neighbours rather than pass them off as matches", async () => {
    searchBuildingsV2Mock.mockResolvedValue([
      hit("real", "Casa da Música", 0.268),
      hit("noise-a", "Hanaha", 0.126),
      hit("noise-b", "Casa da Severa", 0.175),
    ]);

    const { result } = renderSuggestions();

    await waitFor(() => expect(result.current.buildings).toHaveLength(1));
    expect(result.current.buildings[0].name).toBe("Casa da Música");
  });

  it("reports emptiness only once a search has settled", async () => {
    searchBuildingsV2Mock.mockResolvedValue([]);
    const { result } = renderSuggestions();

    await waitFor(() => expect(result.current.isEmpty).toBe(true));
    expect(result.current.buildings).toEqual([]);
  });

  it("adds a building and refreshes the collection's items", async () => {
    searchBuildingsV2Mock.mockResolvedValue([hit("a", "Serpentine Pavilion")]);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderSuggestions();

    await waitFor(() => expect(result.current.buildings).toHaveLength(1));
    result.current.addBuilding(result.current.buildings[0]);

    await waitFor(() => expect(addBuildingMock).toHaveBeenCalledWith("collection-1", "a"));
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["collection_items", "collection-1"] }),
    );
    await waitFor(() => expect(result.current.addingId).toBeNull());
  });
});
