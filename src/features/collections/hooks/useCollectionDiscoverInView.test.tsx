import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { MAX_AUTOFILL_PAGES, useCollectionDiscoverInView } from "./useCollectionDiscoverInView";
import { DISCOVER_PAGE_SIZE } from "../api/discoverInView";

const { fetchBuildingsInViewMock, addBuildingMock } = vi.hoisted(() => ({
  fetchBuildingsInViewMock: vi.fn(),
  addBuildingMock: vi.fn(),
}));

vi.mock("../api/discoverInView", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/discoverInView")>();
  return { ...actual, fetchBuildingsInView: fetchBuildingsInViewMock };
});

vi.mock("../api/collectionItems", () => ({ addBuildingToCollection: addBuildingMock }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const row = (id: string) => ({
  id,
  name: `Building ${id}`,
  alt_name: null,
  city: "London",
  credit_names: ["Zaha Hadid"],
  image_url: null,
  rating: 0,
  status: null,
  construction_status: null,
  slug: `b-${id}`,
  short_id: Number(id),
  locality_country_code: "GB",
  locality_city_slug: "london",
  lat: 51.5,
  lng: -0.1,
});

/** A page the RPC would consider full, so another page is offered. */
const fullPage = (offset: number) =>
  Array.from({ length: DISCOVER_PAGE_SIZE }, (_, i) => row(String(offset + i)));

const bounds = { north: 51.6, south: 51.4, east: 0.1, west: -0.2 };

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const renderDiscover = (
  overrides: Partial<Parameters<typeof useCollectionDiscoverInView>[0]> = {},
) =>
  renderHook(
    () =>
      useCollectionDiscoverInView({
        collectionId: "collection-1",
        bounds,
        excludeBuildingIds: new Set<string>(),
        ...overrides,
      }),
    { wrapper },
  );

describe("useCollectionDiscoverInView", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    fetchBuildingsInViewMock.mockReset();
    fetchBuildingsInViewMock.mockResolvedValue([]);
    addBuildingMock.mockReset();
    addBuildingMock.mockResolvedValue(undefined);
  });

  it("does not fetch before the map has settled on a viewport", async () => {
    const { result } = renderDiscover({ bounds: null });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchBuildingsInViewMock).not.toHaveBeenCalled();
  });

  it("refuses a viewport too wide to rank, without fetching", async () => {
    const { result } = renderDiscover({
      bounds: { north: 60, south: 10, east: 40, west: -40 },
    });
    await waitFor(() => expect(result.current.isTooWide).toBe(true));
    expect(fetchBuildingsInViewMock).not.toHaveBeenCalled();
  });

  it("drops buildings the collection already holds", async () => {
    fetchBuildingsInViewMock.mockResolvedValue([row("1"), row("2"), row("3")]);
    const { result } = renderDiscover({ excludeBuildingIds: new Set(["2"]) });

    await waitFor(() => expect(result.current.buildings).toHaveLength(2));
    expect(result.current.buildings.map((b) => b.id)).toEqual(["1", "3"]);
  });

  it("offers another page only when the last one came back full", async () => {
    fetchBuildingsInViewMock.mockResolvedValue(fullPage(0));
    const { result } = renderDiscover();
    await waitFor(() => expect(result.current.buildings).toHaveLength(DISCOVER_PAGE_SIZE));
    expect(result.current.hasNextPage).toBe(true);
  });

  it("stops offering pages on a short page", async () => {
    fetchBuildingsInViewMock.mockResolvedValue([row("1")]);
    const { result } = renderDiscover();
    await waitFor(() => expect(result.current.buildings).toHaveLength(1));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("tops itself up when a whole page was already in the collection", async () => {
    // The shared sentinel's geometric probe can't see this: the rail scrolls for
    // reasons of its own, so an empty list would otherwise strand page 2.
    const owned = fullPage(0);
    fetchBuildingsInViewMock
      .mockResolvedValueOnce(owned)
      .mockResolvedValueOnce([row("99")]);

    const { result } = renderDiscover({
      excludeBuildingIds: new Set(owned.map((b) => b.id)),
    });

    await waitFor(() => expect(result.current.buildings.map((b) => b.id)).toEqual(["99"]));
    expect(fetchBuildingsInViewMock).toHaveBeenCalledTimes(2);
  });

  it("gives up topping up rather than paging the catalogue forever", async () => {
    // Every page is full and every row is already collected.
    fetchBuildingsInViewMock.mockImplementation((_b: unknown, page: number) =>
      Promise.resolve(fullPage((page - 1) * DISCOVER_PAGE_SIZE)),
    );
    const { result } = renderDiscover({
      excludeBuildingIds: {
        has: () => true,
        // Only `has` is read by the hook; this stands in for a large Set.
      } as unknown as Set<string>,
    });

    await waitFor(() =>
      expect(fetchBuildingsInViewMock).toHaveBeenCalledTimes(MAX_AUTOFILL_PAGES),
    );
    expect(result.current.buildings).toHaveLength(0);
  });

  it("adds a building and refreshes the collection so it moves tabs", async () => {
    fetchBuildingsInViewMock.mockResolvedValue([row("1")]);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderDiscover();
    await waitFor(() => expect(result.current.buildings).toHaveLength(1));

    result.current.addBuilding({ id: "1", name: "Building 1" });

    await waitFor(() => expect(addBuildingMock).toHaveBeenCalledWith("collection-1", "1"));
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["collection_items", "collection-1"] }),
    );
  });

  it("spins only the row being added, and stops spinning when it fails", async () => {
    fetchBuildingsInViewMock.mockResolvedValue([row("1"), row("2")]);
    // Hold the insert open so `addingId` can be observed mid-flight rather than
    // raced past by an already-settled promise.
    let rejectAdd: (reason: Error) => void = () => {};
    addBuildingMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectAdd = reject;
        }),
    );

    const { result } = renderDiscover();
    await waitFor(() => expect(result.current.buildings).toHaveLength(2));

    result.current.addBuilding({ id: "2", name: "Building 2" });

    await waitFor(() => expect(result.current.addingId).toBe("2"));

    rejectAdd(new Error("nope"));
    await waitFor(() => expect(result.current.addingId).toBeNull());
  });
});
