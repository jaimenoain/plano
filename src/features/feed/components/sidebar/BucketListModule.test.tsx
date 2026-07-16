import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BucketListModule } from "./BucketListModule";

const mocks = vi.hoisted(() => ({
  rows: [] as unknown[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BucketListModule userId={userId ?? undefined} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const bucketRow = (
  id: string,
  name: string,
  overrides: Record<string, unknown> = {},
) => ({
  id,
  created_at: "2026-07-01T00:00:00.000Z",
  building: {
    id: `building-${id}`,
    slug: `slug-${id}`,
    name,
    city: "Helsinki",
    country: "Finland",
    year_completed: 1939,
    hero_image_url: null,
    community_preview_url: null,
    is_deleted: false,
    ...overrides,
  },
});

describe("BucketListModule", () => {
  it("renders pending saves with name, location and building link", async () => {
    mocks.rows = [
      bucketRow("1", "Villa Mairea"),
      bucketRow("2", "Säynätsalo Town Hall", { city: "Jyväskylä", year_completed: 1951 }),
    ];
    renderModule();

    const name = await screen.findByText("Villa Mairea");
    expect(name.closest("a")).toHaveAttribute("href", "/building/building-1/slug-1");
    expect(screen.getByText("Helsinki, Finland · 1939")).toBeInTheDocument();
    expect(screen.getByText("All saved buildings")).toBeInTheDocument();
  });

  it("filters out deleted buildings", async () => {
    mocks.rows = [
      bucketRow("1", "Villa Mairea"),
      bucketRow("2", "Demolished Hall", { is_deleted: true }),
    ];
    renderModule();

    await screen.findByText("Villa Mairea");
    expect(screen.queryByText("Demolished Hall")).toBeNull();
  });

  it("renders the quiet empty state with a single Explore CTA when nothing is saved", async () => {
    mocks.rows = [];
    renderModule();

    expect(await screen.findByText("Nothing saved yet")).toBeInTheDocument();
    expect(screen.getByText("Explore buildings")).toBeInTheDocument();
    expect(screen.queryByText("All saved buildings")).toBeNull();
  });

  it("renders nothing when logged out", () => {
    const { container } = renderModule(null);
    expect(container.firstChild).toBeNull();
  });
});
