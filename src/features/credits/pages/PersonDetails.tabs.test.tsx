// @vitest-environment happy-dom
// Person page profile-alignment (PR: person ↔ user page consistency):
// sticky tabs driven by ?section=, stats band, hero geometry.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import PersonDetails from "./PersonDetails";
import type { PersonDetailsLoaderData } from "./PersonDetails.loader";
import type { PersonCreditWithBuilding } from "../types";

vi.mock("@/utils/image", () => ({
  getBuildingImageUrl: (path: string | null | undefined) => (path ? `https://img.test/${path}` : null),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock("@/features/credits/components/EditPersonForm", () => ({
  EditPersonForm: () => null,
}));

vi.mock("@/features/credits/components/ClaimPersonDialog", () => ({
  ClaimPersonDialog: () => null,
}));

vi.mock("@/features/awards/hooks/useAwards", () => ({
  useAwardsByPerson: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/features/profile", () => ({
  FollowButton: () => <div data-testid="user-follow-button" />,
}));

vi.mock("@/features/credits/api/personFollows", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/personFollows")>();
  return {
    ...actual,
    getPersonFollowerCount: async () => 3,
    getPersonFollowState: async () => false,
    listPersonFollowers: async () => [],
  };
});

const mocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  loaderData: {} as unknown,
}));

vi.mock("@/features/credits/api/people", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/people")>();
  return {
    ...actual,
    getPerson: (...args: unknown[]) => mocks.getPerson(...args),
  };
});

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));

// useSearchParams stays REAL — tab state must round-trip through the URL.
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useLoaderData: () => mocks.loaderData,
    useRevalidator: () => ({ revalidate: vi.fn(), state: "idle" as const }),
  };
});

function mkCredit(overrides: Partial<PersonCreditWithBuilding> & { id: string }): PersonCreditWithBuilding {
  const base: PersonCreditWithBuilding = {
    id: overrides.id,
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
    createdAt: "t",
    updatedAt: "t",
    person: { id: "p1", name: "Jane Doe", slug: "jane-doe" },
    company: null,
    building: {
      id: "b1",
      name: "Primary Tower",
      slug: "primary-tower",
      shortId: 10,
      city: null,
      country: null,
      yearCompleted: null,
      heroImageUrl: null,
      mainImageUrl: null,
      communityPreviewUrl: null,
    },
    ...overrides,
  };
  return base;
}

function buildLoaderData(): PersonDetailsLoaderData {
  const credits: PersonCreditWithBuilding[] = [
    mkCredit({ id: "c1", buildingId: "b1" }),
    mkCredit({
      id: "c2",
      buildingId: "b2",
      role: "structural_engineering",
      building: {
        id: "b2",
        name: "Second Hall",
        slug: "second-hall",
        shortId: 11,
        city: null,
        country: null,
        yearCompleted: null,
        heroImageUrl: null,
        mainImageUrl: null,
        communityPreviewUrl: null,
      },
    }),
  ];
  return {
    person: {
      id: "p1",
      name: "Jane Doe",
      slug: "jane-doe",
      bio: "Architect and educator.",
      nationality: "British",
      birthYear: 1970,
      deathYear: null,
      avatarUrl: null,
      website: null,
      locationNote: "London",
      claimedByUserId: null,
      claimStatus: "unclaimed",
      createdAt: "t0",
      updatedAt: "t0",
    },
    credits,
    canonical: "https://plano.app/person/jane-doe",
    metaTitle: "Jane Doe — Plano",
    description: "Test",
    ogImage: "https://plano.app/cover.jpg",
    structuredData: { "@context": "https://schema.org", "@type": "Person", name: "Jane Doe" },
  };
}

function renderPage(initialEntry = "/person/jane-doe") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/person/:slug" element={<PersonDetails />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("PersonDetails profile-aligned layout", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mocks.loaderData = buildLoaderData();
    mocks.getPerson.mockImplementation(async () => {
      const d = mocks.loaderData as PersonDetailsLoaderData;
      return { person: d.person, credits: d.credits };
    });
  });

  it("renders the stats band with distinct buildings, awards, and roles", () => {
    renderPage();
    // 2 distinct buildings across 2 credits, 0 awards, 2 distinct roles.
    // "Awards" also appears as a tab label, so expect both occurrences.
    expect(screen.getByText("Buildings")).toBeInTheDocument();
    expect(screen.getAllByText("Awards")).toHaveLength(2);
    expect(screen.getByText("Roles")).toBeInTheDocument();
    // "2" renders as the buildings stat, roles stat, and Portfolio tab count;
    // "0" as the awards stat and Awards tab count.
    expect(screen.getAllByText("2")).toHaveLength(3);
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("defaults to the Portfolio tab and switches sections via the tab bar", () => {
    renderPage();

    // Portfolio is the default: tier sections render.
    expect(screen.getByRole("heading", { name: /Primary credits/i })).toBeInTheDocument();

    // Switch to Awards → canonical empty state.
    fireEvent.click(screen.getByRole("button", { name: /^Awards/ }));
    expect(screen.queryByRole("heading", { name: /Primary credits/i })).not.toBeInTheDocument();
    expect(screen.getByText("No awards yet")).toBeInTheDocument();

    // Switch to About → label/value rows.
    fireEvent.click(screen.getByRole("button", { name: /^About/ }));
    expect(screen.getByText("Nationality")).toBeInTheDocument();
    expect(screen.getByText("British")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
  });

  it("honours a ?section=about deep link", () => {
    renderPage("/person/jane-doe?section=about");
    expect(screen.getByText("Nationality")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Primary credits/i })).not.toBeInTheDocument();
  });

  it("falls back to Portfolio for an unknown ?section value", () => {
    renderPage("/person/jane-doe?section=bogus");
    expect(screen.getByRole("heading", { name: /Primary credits/i })).toBeInTheDocument();
  });

  it("marks the active tab with aria-current", () => {
    renderPage("/person/jane-doe?section=awards");
    expect(screen.getByRole("button", { name: /^Awards/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /^Portfolio/ })).not.toHaveAttribute("aria-current");
  });
});
