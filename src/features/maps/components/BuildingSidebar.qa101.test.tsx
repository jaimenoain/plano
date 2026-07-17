// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuildingSidebar } from "./BuildingSidebar";
import { MemoryRouter } from "react-router";
import * as ReactQuery from "@tanstack/react-query";
import * as MapContext from "../providers/MapContext";
import type { CompanySummary, PersonSummary } from "@/features/credits/types";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useInfiniteQuery: vi.fn(),
    keepPreviousData: vi.fn(),
  };
});

vi.mock("../providers/MapContext", () => ({
  useMapContext: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

function mockMapContext() {
  (MapContext.useMapContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    state: { bounds: { north: 10, south: 0, east: 10, west: 0 }, filters: {} },
    methods: { setHighlightedId: vi.fn(), fitMapBounds: vi.fn() },
  });
}

function mockEmptyBuildings() {
  (ReactQuery.useInfiniteQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { pages: [[]], pageParams: [1] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  });
}

afterEach(() => cleanup());

describe("BuildingSidebar (QA 10.1 — global entity tabs)", () => {
  it("People tab lists name, credit count, and nationality (or avatar affordance)", async () => {
    mockMapContext();
    mockEmptyBuildings();

    const people: PersonSummary[] = [
      {
        id: "p1",
        name: "Maya Lin",
        slug: "maya-lin",
        claimStatus: "unclaimed",
        associatedCompanies: [],
        knownBuilding: null,
        nationality: "US",
        creditCount: 7,
      },
    ];

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BuildingSidebar people={people} companies={[]} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("tab", { name: /people \(1\)/i }));
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Maya Lin/i })).toHaveAttribute("href", "/person/maya-lin");
    });
    expect(screen.getByText(/US/)).toBeInTheDocument();
    expect(screen.getByText(/7 credits/)).toBeInTheDocument();
  });

  it("Companies tab lists name, country, and credit count", async () => {
    mockMapContext();
    mockEmptyBuildings();

    const companies: CompanySummary[] = [
      {
        id: "c1",
        name: "Arup Group",
        slug: "arup",
        claimStatus: "unclaimed",
        country: "GB",
        logoUrl: null,
        creditCount: 42,
      },
    ];

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BuildingSidebar people={[]} companies={companies} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("tab", { name: /companies \(1\)/i }));
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Arup Group/i })).toHaveAttribute("href", "/company/arup");
    });
    expect(screen.getByText(/GB/)).toBeInTheDocument();
    expect(screen.getByText(/42 credits/)).toBeInTheDocument();
  });

  it("People tab shows a spinner while loading instead of the empty state", async () => {
    mockMapContext();
    mockEmptyBuildings();

    const { container } = render(
      <MemoryRouter>
        <BuildingSidebar people={[]} companies={[]} peopleLoading resultTab="people" onResultTabChange={vi.fn()} />
      </MemoryRouter>,
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText(/No architects credited in this area yet/i)).not.toBeInTheDocument();
  });

  it("People tab shows an error message when loading fails", async () => {
    mockMapContext();
    mockEmptyBuildings();

    render(
      <MemoryRouter>
        <BuildingSidebar people={[]} companies={[]} peopleError resultTab="people" onResultTabChange={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Failed to load people/i)).toBeInTheDocument();
    expect(screen.queryByText(/No architects credited in this area yet/i)).not.toBeInTheDocument();
  });

  it("Companies tab shows an error message when loading fails", async () => {
    mockMapContext();
    mockEmptyBuildings();

    render(
      <MemoryRouter>
        <BuildingSidebar people={[]} companies={[]} companiesError resultTab="companies" onResultTabChange={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Failed to load companies/i)).toBeInTheDocument();
  });

  it("is controlled by resultTab / onResultTabChange when both are provided", async () => {
    mockMapContext();
    mockEmptyBuildings();

    const onResultTabChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BuildingSidebar people={[]} companies={[]} resultTab="people" onResultTabChange={onResultTabChange} />
      </MemoryRouter>,
    );

    // People tab is active from the prop, without any click.
    expect(screen.getByRole("tab", { name: /people/i })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: /companies/i }));
    expect(onResultTabChange).toHaveBeenCalledWith("companies");
  });
});
