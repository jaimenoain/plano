// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import EditBuilding from "./EditBuilding";
import type { BuildingCreditWithEntities } from "@/features/credits";

const { getBuildingCreditsMock, profileMock } = vi.hoisted(() => ({
  getBuildingCreditsMock: vi.fn(),
  profileMock: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useParams: () => ({ id: "b1" }),
    useNavigate: () => vi.fn(),
  };
});

// Stable identity: the page's fetch effect depends on `user`, so a fresh object
// per render would loop forever.
const AUTH = { user: { id: "u1" }, loading: false };
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => AUTH,
}));

vi.mock("@/features/profile/hooks/useUserProfile", () => ({
  useUserProfile: () => profileMock(),
}));

vi.mock("@/features/credits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits")>();
  return {
    ...actual,
    getBuildingCredits: (...args: unknown[]) => getBuildingCreditsMock(...args),
  };
});

// The page is a client-side fetcher: every table read goes through this chain.
vi.mock("@/integrations/supabase/client", () => {
  const building = {
    id: "b1",
    name: "Casa Test",
    slug: "casa-test",
    short_id: 12,
    year_completed: 1960,
    location: null,
    location_precision: "exact",
    address: "1 Main St",
    city: "Lisbon",
    country: "Portugal",
    country_code: "PT",
    functional_category_id: null,
  };
  const table = (name: string) => {
    const rows = name === "buildings" ? [building] : [];
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    Object.assign(chain, {
      select: self,
      eq: self,
      in: self,
      order: () => Promise.resolve({ data: rows, error: null }),
      delete: self,
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null }),
    });
    return chain;
  };
  return {
    supabase: {
      from: (name: string) => table(name),
      rpc: () => Promise.resolve({ data: [], error: null }),
    },
  };
});

// `useBlocker` requires a data router; unsaved-changes blocking isn't under test.
vi.mock("@/components/common/NavigationBlocker", () => ({
  NavigationBlocker: () => null,
}));

// The app chrome needs auth/nav context this test doesn't provide.
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// The real picker pulls in Google Maps and maplibre. This stub keeps the two
// things the page actually depends on: what it feeds the picker, and the change
// callback the picker fires (address search, pin drag, precision toggle).
vi.mock("../components/BuildingLocationPicker", () => ({
  BuildingLocationPicker: ({
    initialLocation,
    onLocationChange,
  }: {
    initialLocation: { countryCode?: string | null };
    onLocationChange: (loc: {
      lat: number;
      lng: number;
      address: string;
      city: string | null;
      country: string | null;
      countryCode: string | null;
      precision: "exact" | "approximate";
    }) => void;
  }) => (
    <div data-testid="location-picker">
      <span data-testid="picker-country-code">{String(initialLocation.countryCode)}</span>
      <button
        type="button"
        onClick={() =>
          onLocationChange({
            lat: 38.7,
            lng: -9.1,
            address: "2 New St",
            city: "Lisbon",
            country: "Portugal",
            countryCode: "PT",
            precision: "approximate",
          })
        }
      >
        emit-location-change
      </button>
    </div>
  ),
}));

const credit = (over: Partial<BuildingCreditWithEntities> = {}): BuildingCreditWithEntities => ({
  id: "c1",
  buildingId: "b1",
  personId: "p1",
  companyId: null,
  role: "design_architecture",
  roleCustom: null,
  creditTier: "primary",
  isLead: true,
  contributionNotes: null,
  yearFrom: null,
  yearTo: null,
  projectUrl: null,
  status: "active",
  flagReason: null,
  flagNotes: null,
  flaggedAt: null,
  flaggedFromStatus: null,
  flaggedByUserId: null,
  addedByUserId: null,
  displayOrder: 0,
  createdAt: "2020-01-01T00:00:00Z",
  updatedAt: "2020-01-01T00:00:00Z",
  person: { id: "p1", name: "Ada Arch", slug: null, avatar_url: null },
  company: null,
  ...over,
});

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter>
          <EditBuilding />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("EditBuilding — credits section (Task 2.5)", () => {
  beforeEach(() => {
    getBuildingCreditsMock.mockReset();
    getBuildingCreditsMock.mockResolvedValue([credit()]);
    profileMock.mockReturnValue({
      profile: { id: "u1", role: "user", verified_architect_id: null },
      loading: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("lists the building's credits with an add entry point", async () => {
    renderPage();

    expect(await screen.findByText("Ada Arch")).toBeTruthy();
    expect(screen.getAllByText("Credits").length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Add a credit/i })).toBeTruthy();
    });
  });

  it("offers to add the first credit when the building has none", async () => {
    getBuildingCreditsMock.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Add a credit/i })).toBeTruthy();
    });
  });

  it("no longer shows the old design-credits picker", async () => {
    renderPage();

    await screen.findByText("Ada Arch");
    expect(screen.queryByText("Design credits")).toBeNull();
    expect(screen.queryByPlaceholderText(/Search people or companies/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Add design credits/i })).toBeNull();
  });

  // Task 3.2: the section wrapper and BuildingCredits each used to render their
  // own "Credits" h2, at 10px and 28px. `hideHeading` leaves exactly one.
  it("renders exactly one Credits heading", async () => {
    renderPage();

    await screen.findByText("Ada Arch");
    expect(screen.getAllByRole("heading", { name: "Credits" }).length).toBe(1);
  });

  it("gives every section a level-2 heading", async () => {
    renderPage();

    await screen.findByText("Ada Arch");
    for (const name of ["Location", "Credits", "Basics", "Access & entry", "Size"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeTruthy();
    }
  });

  it("still offers the architect statement to the credited verified architect", async () => {
    profileMock.mockReturnValue({
      profile: { id: "u1", role: "user", verified_architect_id: "p1" },
      loading: false,
      refetch: vi.fn(),
    });
    renderPage();

    expect(await screen.findByText("Architect statement")).toBeTruthy();
  });
});

describe("EditBuilding — address-only dirty state (Task 3.1)", () => {
  beforeEach(() => {
    getBuildingCreditsMock.mockReset();
    getBuildingCreditsMock.mockResolvedValue([]);
    profileMock.mockReturnValue({
      profile: { id: "u1", role: "user", verified_architect_id: null },
      loading: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  const submitButton = () => screen.getByRole("button", { name: /Update Building/i });

  it("keeps the submit button disabled while nothing has changed", async () => {
    renderPage();

    await waitFor(() => expect(submitButton().hasAttribute("disabled")).toBe(true));
    expect(screen.getByText("No changes to save")).toBeTruthy();
  });

  it("enables the submit button when only the location changed", async () => {
    renderPage();

    const emit = await screen.findByRole("button", { name: "emit-location-change" });
    await waitFor(() => expect(submitButton().hasAttribute("disabled")).toBe(true));

    fireEvent.click(emit);

    await waitFor(() => expect(submitButton().hasAttribute("disabled")).toBe(false));
    expect(screen.queryByText("No changes to save")).toBeNull();
  });

  it("passes the building's country code down to the location picker", async () => {
    renderPage();

    // Without it the picker re-emits a null code on its next change, which would
    // wipe `country_code` on save.
    expect((await screen.findByTestId("picker-country-code")).textContent).toBe("PT");
  });
});
