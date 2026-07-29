import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { MyLibraryModule } from "./MyLibraryModule";

const mocks = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        limit: () => Promise.resolve({ data: mocks.rows, error: null }),
      };
      return chain;
    }),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.rows = [];
});

function renderModule(userId: string | null = "u1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MyLibraryModule userId={userId ?? undefined} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const libraryRow = (
  city: string | null,
  coords: [number, number] | null,
  overrides: Record<string, unknown> = {},
) => ({
  building: {
    city,
    country: "Spain",
    location: coords ? { type: "Point", coordinates: coords } : null,
    is_deleted: false,
    ...overrides,
  },
});

const londonEwkb = {
  city: "London",
  country: "United Kingdom",
  location: "0101000020E61000005B069CA56439B9BFDA5548F949C14940",
  is_deleted: false,
};

describe("MyLibraryModule", () => {
  it("renders the library total, its busiest cities and the map CTA", async () => {
    mocks.rows = [
      libraryRow("Madrid", [-3.7038, 40.4168]),
      libraryRow("Madrid", [-3.7, 40.42]),
      libraryRow("Barcelona", [2.1686, 41.3874]),
      libraryRow("London", [-0.1276, 51.5072]),
      libraryRow("Paris", [2.3522, 48.8566]),
    ];
    renderModule();

    expect(await screen.findByText("Madrid")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Barcelona")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();

    // Only the top three places get a row; the rest are counted off.
    expect(screen.queryByText("Paris")).toBeNull();
    expect(screen.getByText("+ 1 more city")).toBeInTheDocument();

    expect(screen.getByText("Open My Library").closest("a")).toHaveAttribute(
      "href",
      "/search?mode=library",
    );
  });

  it("plots only the buildings that have coordinates, but counts them all", async () => {
    mocks.rows = [
      libraryRow("Madrid", [-3.7038, 40.4168]),
      libraryRow("Madrid", null),
      libraryRow("Tokyo", [139.6503, 35.6762]),
    ];
    renderModule();

    expect(await screen.findByText("Tokyo")).toBeInTheDocument();
    // The header counts the whole library...
    expect(screen.getByText("3")).toBeInTheDocument();
    // ...while the plate only draws what it can place.
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "Density map of 2 buildings in your library, concentrated around Madrid.",
    );
  });

  it("drops the plate but keeps the cities when nothing has coordinates", async () => {
    mocks.rows = [libraryRow("Madrid", null), libraryRow("Barcelona", null)];
    renderModule();

    expect(await screen.findByText("Madrid")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Open My Library")).toBeInTheDocument();
  });

  it("plots the EWKB hex PostgREST actually sends for a geography column", async () => {
    // Verbatim wire values from the catalogue: London 51.51007,-0.098532 and
    // Milan 45.4754495,9.2215154. PostgREST hands `location` back as an EWKB
    // hex string, not GeoJSON — the plate has to survive the real format.
    mocks.rows = [
      { building: londonEwkb },
      { building: { ...londonEwkb, city: "Milan", location: "0101000020E6100000E71E6D776A71224025B37A87DBBC4640" } },
    ];
    renderModule();

    expect(await screen.findByText("London")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "Density map of 2 buildings in your library, concentrated around London.",
    );
  });

  it("skips deleted buildings", async () => {
    mocks.rows = [
      libraryRow("Madrid", [-3.7038, 40.4168]),
      libraryRow("Atlantis", [-30, 30], { is_deleted: true }),
    ];
    renderModule();

    expect(await screen.findByText("Madrid")).toBeInTheDocument();
    expect(screen.queryByText("Atlantis")).toBeNull();
  });

  it("renders the quiet empty state with a single Explore CTA when the library is empty", async () => {
    mocks.rows = [];
    renderModule();

    expect(await screen.findByText("Your library is empty")).toBeInTheDocument();
    expect(screen.getByText("Explore buildings")).toBeInTheDocument();
    expect(screen.queryByText("Open My Library")).toBeNull();
  });

  it("renders nothing when logged out", () => {
    const { container } = renderModule(null);
    expect(container.firstChild).toBeNull();
  });
});
