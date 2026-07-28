import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { AddBuildingsToCollectionDialog } from "./AddBuildingsToCollectionDialog";

type DialogProps = ComponentProps<typeof AddBuildingsToCollectionDialog>;
// Taken off the props rather than imported from @/features/search — the deep
// cross-feature import is lint-restricted.
type DiscoveryBuilding = NonNullable<DialogProps["existingBuildings"]>[number];

// Per-table results: the list read hits `user_buildings`, the auto-add hits
// `collection_items`. One chainable builder serves both.
let tableResults: Record<string, { data: unknown; error: unknown }> = {};

const { mockFrom, mockToast, mockNavigate } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  mockNavigate: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom, functions: { invoke: vi.fn() } },
}));

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("react-router", () => ({ useNavigate: () => mockNavigate }));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "u@example.com" }, loading: false }),
}));

// Passthrough shells so the test exercises the dialog's data flow, not Radix internals.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
// Only the Architecture tab body is under test; the Other-markers panel pulls in
// Google Places and is out of scope here.
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ value, children }: { value: string; children: ReactNode }) =>
    value === "architecture" ? <div>{children}</div> : null,
}));

// Minimal stand-ins: the assertions are about *which* buildings reach the list and
// the detail panel, not how either renders them.
vi.mock("@/features/search/components/DiscoveryList", () => ({
  DiscoveryList: ({ buildings, emptyState }: { buildings: DiscoveryBuilding[]; emptyState?: ReactNode }) =>
    buildings.length === 0 ? <div>{emptyState}</div> : (
      <ul>{buildings.map((b) => <li key={b.id}>{b.name}</li>)}</ul>
    ),
}));
vi.mock("@/features/collections/components/BuildingDetailPanel", () => ({
  BuildingDetailPanel: ({ building }: { building: DiscoveryBuilding }) => <div>detail:{building.name}</div>,
}));

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "insert", "delete", "eq", "neq", "in", "limit", "order", "single", "maybeSingle"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => unknown) =>
    resolve(tableResults[table] ?? { data: [], error: null });
  return builder;
}

function userBuildingRow(id: string, name: string) {
  return {
    building_id: id,
    status: "visited",
    rating: null,
    building: {
      id,
      name,
      city: "Madrid",
      country: "Spain",
      address: null,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      location: null,
      // Set so the list query short-circuits its review_images thumbnail backfill.
      hero_image_url: "buildings/hero.jpg",
      community_preview_url: null,
      year_completed: null,
      building_credits: [],
    },
  };
}

/** The list entry React Query already holds from before the building was created. */
const cachedOldBuilding = {
  id: "old-1",
  name: "Old Building",
  city: "Madrid",
  country: "Spain",
  slug: "old-building",
  main_image_url: null,
  credits: [],
  styles: [],
  year_completed: null,
  location_lat: 0,
  location_lng: 0,
} as unknown as DiscoveryBuilding;

function renderDialog(overrides: Partial<DialogProps> = {}) {
  const queryClient = new QueryClient({
    // Mirror the app defaults (src/root.tsx): a 5-minute staleTime is what makes
    // the pre-creation cache survive the return trip from /add-building.
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: false } },
  });
  queryClient.setQueryData(["add-buildings-dialog", "user-1", ""], [cachedOldBuilding]);

  render(
    <QueryClientProvider client={queryClient}>
      <AddBuildingsToCollectionDialog
        collectionId="col-1"
        existingBuildingIds={new Set<string>()}
        open
        onOpenChange={vi.fn()}
        returnTo="/jaime/map/my-collection"
        {...overrides}
      />
    </QueryClientProvider>,
  );
  return { queryClient };
}

describe("AddBuildingsToCollectionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableResults = {
      user_buildings: {
        data: [userBuildingRow("old-1", "Old Building"), userBuildingRow("new-1", "New Building")],
        error: null,
      },
      collection_items: { data: [], error: null },
    };
    mockFrom.mockImplementation((table: string) => makeBuilder(table));
  });

  afterEach(() => cleanup());

  it("refetches the list when returning from the create flow so the new building shows", async () => {
    renderDialog({ justCreatedBuildingId: "new-1" });

    // Without the invalidation the seeded cache is still fresh, so this never arrives.
    expect(await screen.findByText("New Building")).toBeTruthy();
    // And the pre-selected detail panel can now resolve the created building.
    expect(await screen.findByText("detail:New Building")).toBeTruthy();
  });

  it("auto-adds the created building to the collection", async () => {
    renderDialog({ justCreatedBuildingId: "new-1" });

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("collection_items"));
    expect(mockToast.success).toHaveBeenCalledWith("Building added to collection");
  });

  it("serves the cached list untouched when nothing was just created", async () => {
    renderDialog();

    expect(await screen.findByText("Old Building")).toBeTruthy();
    // The refresh is scoped to the created-building signal, not a blanket staleTime:0.
    await waitFor(() => expect(mockFrom).not.toHaveBeenCalledWith("user_buildings"));
    expect(screen.queryByText("New Building")).toBeNull();
  });
});
