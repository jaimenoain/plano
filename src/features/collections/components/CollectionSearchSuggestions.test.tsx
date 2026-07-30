import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import type { DiscoveryBuilding } from "@/features/search";
import { CollectionSearchSuggestions } from "./CollectionSearchSuggestions";

const { useSuggestionsMock, navigateMock } = vi.hoisted(() => ({
  useSuggestionsMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock("../hooks/useCollectionSearchSuggestions", () => ({
  useCollectionSearchSuggestions: useSuggestionsMock,
}));

// The SERP row reads the viewer's own visited/rated state; that needs the auth
// provider, which this component test deliberately does without.
vi.mock("@/features/profile/hooks/useUserBuildingStatuses", () => ({
  useUserBuildingStatuses: () => ({ statuses: {}, ratings: {} }),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => navigateMock };
});

afterEach(cleanup);

const building = (id: string, name: string): DiscoveryBuilding => ({
  id,
  name,
  slug: `b-${id}`,
  location_lat: 1,
  location_lng: 2,
  city: "London",
  country: "United Kingdom",
  year_completed: 2001,
  credits: [{ id: "Zaha Hadid", name: "Zaha Hadid" }],
  styles: [],
});

const suggestions = (overrides: Record<string, unknown> = {}) => ({
  buildings: [],
  isLoading: false,
  isEmpty: false,
  addBuilding: vi.fn(),
  addingId: null,
  ...overrides,
});

function renderSuggestions() {
  return render(
    <MemoryRouter initialEntries={["/ada/map/london"]}>
      <Routes>
        <Route
          path="/:username/map/:slug"
          element={
            <CollectionSearchSuggestions
              collectionId="collection-1"
              query="serpentine"
              excludeBuildingIds={new Set<string>()}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CollectionSearchSuggestions", () => {
  beforeEach(() => {
    useSuggestionsMock.mockReset();
    navigateMock.mockReset();
  });

  it("says plainly that the results are not in the collection", () => {
    useSuggestionsMock.mockReturnValue(
      suggestions({ buildings: [building("a", "Serpentine Pavilion")] }),
    );
    renderSuggestions();

    expect(screen.getByText("Not in this collection")).toBeInTheDocument();
    expect(
      screen.getByText(/Other buildings in Plano matching “serpentine”/),
    ).toBeInTheDocument();
    expect(screen.getByText("Serpentine Pavilion")).toBeInTheDocument();
  });

  it("adds the building behind the row's plus button", async () => {
    const addBuilding = vi.fn();
    const rows = [building("a", "Serpentine Pavilion")];
    useSuggestionsMock.mockReturnValue(suggestions({ buildings: rows, addBuilding }));
    const user = userEvent.setup();
    renderSuggestions();

    await user.click(
      screen.getByRole("button", { name: "Add Serpentine Pavilion to this collection" }),
    );

    expect(addBuilding).toHaveBeenCalledWith(rows[0]);
  });

  it("offers to create the building when the database has nothing either", async () => {
    useSuggestionsMock.mockReturnValue(suggestions({ isEmpty: true }));
    const user = userEvent.setup();
    renderSuggestions();

    expect(screen.getByText("Nothing by that name")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Create new building/ }));

    expect(navigateMock).toHaveBeenCalledWith(
      "/add-building?name=serpentine&returnTo=%2Fada%2Fmap%2Flondon",
    );
  });
});
