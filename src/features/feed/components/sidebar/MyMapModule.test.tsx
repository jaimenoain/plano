import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { MyMapModule } from "./MyMapModule";

const mocks = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ data: mocks.rows, error: null })),
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
        <MyMapModule userId={userId ?? undefined} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const totals = (library: number, plottable: number, places: number) => [
  { kind: "total", label: "library", lat: null, lng: null, weight: library },
  { kind: "total", label: "plottable", lat: null, lng: null, weight: plottable },
  { kind: "total", label: "places", lat: null, lng: null, weight: places },
];
const city = (name: string, count: number) => ({
  kind: "city",
  label: name,
  lat: null,
  lng: null,
  weight: count,
});
const cell = (lat: number, lng: number, weight: number) => ({
  kind: "cell",
  label: null,
  lat,
  lng,
  weight,
});

describe("MyMapModule", () => {
  it("renders the library total, its busiest cities and the map CTA", async () => {
    mocks.rows = [
      ...totals(5, 5, 4),
      city("Madrid", 2),
      city("Barcelona", 1),
      city("London", 1),
      cell(40.4168, -3.7038, 2),
      cell(41.3874, 2.1686, 1),
      cell(51.5072, -0.1276, 1),
      cell(48.8566, 2.3522, 1),
    ];
    renderModule();

    expect(await screen.findByText("Madrid")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Barcelona")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();

    // Only the top three places get a row; the rest are counted off.
    expect(screen.queryByText("Paris")).toBeNull();
    expect(screen.getByText("+ 1 more city")).toBeInTheDocument();

    expect(screen.getByText("Open My Map").closest("a")).toHaveAttribute(
      "href",
      "/map",
    );
  });

  it("plots only the buildings that have coordinates, but counts them all", async () => {
    mocks.rows = [
      ...totals(3, 2, 2),
      city("Madrid", 2),
      city("Tokyo", 1),
      cell(40.4168, -3.7038, 1),
      cell(35.6762, 139.6503, 1),
    ];
    renderModule();

    expect(await screen.findByText("Tokyo")).toBeInTheDocument();
    // The header counts the whole library...
    expect(screen.getByText("3")).toBeInTheDocument();
    // ...while the plate only draws what it can place.
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "World map of 3 buildings in your library, concentrated around Madrid.",
    );
  });

  it("drops the plate but keeps the cities when nothing has coordinates", async () => {
    mocks.rows = [...totals(2, 0, 2), city("Madrid", 1), city("Barcelona", 1)];
    renderModule();

    expect(await screen.findByText("Madrid")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Open My Map")).toBeInTheDocument();
  });

  it("renders the quiet empty state with a single Explore CTA when the library is empty", async () => {
    mocks.rows = totals(0, 0, 0);
    renderModule();

    expect(await screen.findByText("Your map is empty")).toBeInTheDocument();
    expect(screen.getByText("Explore buildings")).toBeInTheDocument();
    expect(screen.queryByText("Open My Map")).toBeNull();
  });

  it("renders nothing when logged out", () => {
    const { container } = renderModule(null);
    expect(container.firstChild).toBeNull();
  });
});
