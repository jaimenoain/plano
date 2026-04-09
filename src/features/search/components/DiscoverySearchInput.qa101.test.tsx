// @vitest-environment happy-dom
import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DiscoverySearchInput } from "./DiscoverySearchInput";

vi.mock("@/components/common/ClientOnly", () => ({
  ClientOnly: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/config", () => ({
  config: { googleMaps: { apiKey: "test-key" } },
}));

const clearSuggestions = vi.fn();
vi.mock("use-places-autocomplete", () => ({
  __esModule: true,
  default: () => ({
    ready: true,
    value: "",
    setValue: vi.fn(),
    suggestions: { status: "ZERO_RESULTS", data: [] },
    clearSuggestions,
    init: vi.fn(),
  }),
  getGeocode: vi.fn(),
  getLatLng: vi.fn(),
}));

vi.mock("@googlemaps/js-api-loader", () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(() =>
      Promise.resolve({
        data: [{ id: "b1", name: "Seagram Building", city: "NYC", country: "US" }],
        error: null,
      }),
    ),
  },
}));

vi.mock("@/features/credits/api/people", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/people")>();
  return {
    ...actual,
    searchPeople: vi.fn(() =>
      Promise.resolve([
        {
          id: "p1",
          name: "Mies Person",
          slug: "mies-person",
          claimStatus: "unclaimed" as const,
          associatedCompanies: [],
          knownBuilding: null,
        },
      ]),
    ),
  };
});

vi.mock("@/features/credits/api/companies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/companies")>();
  return {
    ...actual,
    searchCompanies: vi.fn(() =>
      Promise.resolve([
        {
          id: "co1",
          name: "Acme Atelier",
          slug: "acme-atelier",
          claimStatus: "unclaimed" as const,
          country: "DE",
          logoUrl: null,
          creditCount: 3,
        },
      ]),
    ),
  };
});

describe("DiscoverySearchInput (QA 10.1 — mixed entity autocomplete)", () => {
  let queryClient: QueryClient;
  let googleSnapshot: unknown;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    googleSnapshot = (globalThis as { google?: unknown }).google;
    (globalThis as { google?: unknown }).google = { maps: { places: {} } };
  });

  afterEach(() => {
    (globalThis as { google?: unknown }).google = googleSnapshot;
  });

  it("source uses searchPeople / searchCompanies / search_buildings RPC — not legacy architect tables", () => {
    const path = join(process.cwd(), "src/features/search/components/DiscoverySearchInput.tsx");
    const src = readFileSync(path, "utf8");
    expect(src).toContain("searchPeople");
    expect(src).toContain("searchCompanies");
    expect(src).toContain("search_buildings");
    const architectsTable = ["arch", "itects"].join("");
    expect(src).not.toMatch(
      new RegExp("from" + "\\(" + "['\"]" + architectsTable + "['\"]" + "\\)"),
    );
    const legacyJoinTable = ["building", ["arch", "itects"].join("")].join("_");
    expect(src).not.toMatch(new RegExp(legacyJoinTable));
  });

  it("with mixed entity mode, shows Buildings, People, and Companies hits with distinct row content", async () => {
    function Harness() {
      const [v, setV] = useState("");
      return (
        <DiscoverySearchInput
          value={v}
          onSearchChange={setV}
          onLocationSelect={vi.fn()}
          disableDropdown={false}
          showMixedEntitySuggestions
          placeholder="Search mixed…"
        />
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    );

    const input = screen.getByPlaceholderText("Search mixed…");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "mi" } });

    await waitFor(() => {
      expect(screen.getByText("Seagram Building")).toBeInTheDocument();
    });
    expect(screen.getByText("Mies Person")).toBeInTheDocument();
    expect(screen.getByText("Acme Atelier")).toBeInTheDocument();
    expect(screen.getByText("Buildings")).toBeInTheDocument();
    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByText("Companies")).toBeInTheDocument();
  });
});
