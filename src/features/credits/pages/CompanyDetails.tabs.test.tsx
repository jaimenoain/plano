// @vitest-environment happy-dom
// Company page profile-alignment (company ↔ person ↔ user page consistency):
// sticky tabs driven by ?section=, stats band, square hero mark.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import CompanyDetails from "./CompanyDetails";
import type { CompanyDetailsLoaderData } from "./CompanyDetails.loader";
import type { CompanyCreditWithBuilding, CompanyStewardWithProfile } from "../types";

vi.mock("@/utils/image", () => ({
  getBuildingImageUrl: (path: string | null | undefined) => (path ? `https://img.test/${path}` : null),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock("@/features/credits/components/EditCompanyForm", () => ({
  EditCompanyForm: () => <div data-testid="edit-company-form" />,
}));

vi.mock("@/features/credits/components/ClaimCompanyDialog", () => ({
  ClaimCompanyDialog: () => null,
}));

vi.mock("@/features/credits/components/RequestStewardAccessDialog", () => ({
  RequestStewardAccessDialog: () => null,
}));

// The barrel re-exports these, so mocking the hooks module covers both the page
// (tab count + stats cell) and the real awards tab body it renders.
vi.mock("@/features/awards/hooks/useAwards", () => ({
  useAwardsByCompany: () => ({ data: [], isLoading: false }),
  useAwardsByBody: () => ({ data: [], isLoading: false }),
}));

const mocks = vi.hoisted(() => ({
  getCompany: vi.fn(),
  stewards: [] as CompanyStewardWithProfile[],
  user: null as { id: string; email: string } | null,
  loaderData: {} as CompanyDetailsLoaderData,
}));

vi.mock("@/features/credits/api/companies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/companies")>();
  return {
    ...actual,
    getCompany: (...args: unknown[]) => mocks.getCompany(...args),
    getCompanyStewardsWithProfiles: vi.fn(() => Promise.resolve(mocks.stewards)),
    getMyPendingCompanyStewardRequestId: vi.fn(() => Promise.resolve(null)),
    getMyOpenCompanyClaimDisputeId: vi.fn(() => Promise.resolve(null)),
  };
});

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
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

function mkCredit(
  overrides: Partial<CompanyCreditWithBuilding> & { id: string },
): CompanyCreditWithBuilding {
  const base: CompanyCreditWithBuilding = {
    id: overrides.id,
    buildingId: "b1",
    personId: null,
    companyId: "co1",
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
    person: null,
    company: { id: "co1", name: "StructCo GmbH", slug: "structco" },
    building: {
      id: "b1",
      name: "Design Tower",
      slug: "design-tower",
      shortId: 10,
      city: "Berlin",
      country: "DE",
      yearCompleted: 2020,
      heroImageUrl: null,
      mainImageUrl: null,
      communityPreviewUrl: null,
    },
    ...overrides,
  };
  return base;
}

function buildLoaderData(claimStatus: "unclaimed" | "claimed" | "verified" = "verified"): CompanyDetailsLoaderData {
  const company = {
    id: "co1",
    name: "StructCo GmbH",
    slug: "structco",
    bio: "Structural engineering practice.",
    country: "Germany",
    foundedYear: 1990,
    dissolvedYear: null,
    logoUrl: null as string | null,
    website: "structco.example",
    verifiedDomain: "structco.example",
    claimStatus,
    createdAt: "t0",
    updatedAt: "t0",
  };

  const credits: CompanyCreditWithBuilding[] = [
    mkCredit({ id: "c1" }),
    mkCredit({
      id: "c2",
      buildingId: "b2",
      role: "structural_engineering",
      building: {
        id: "b2",
        name: "Bridge Hall",
        slug: "bridge-hall",
        shortId: 11,
        city: "Munich",
        country: "DE",
        yearCompleted: 2019,
        heroImageUrl: null,
        mainImageUrl: null,
        communityPreviewUrl: null,
      },
    }),
  ];

  return {
    company,
    credits,
    canonical: "https://plano.app/company/structco",
    metaTitle: "StructCo GmbH — architecture and engineering projects on Plano",
    description: "Structural engineering practice.",
    ogImage: "https://plano.app/cover.jpg",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: company.name,
    },
  };
}

function renderPage(initialEntry = "/company/structco") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/company/:slug" element={<CompanyDetails />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("CompanyDetails profile-aligned layout", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mocks.loaderData = buildLoaderData();
    mocks.stewards = [];
    mocks.user = null;
    mocks.getCompany.mockImplementation(async () => ({
      company: mocks.loaderData.company,
      credits: mocks.loaderData.credits,
    }));
  });

  it("renders the stats band with buildings, cities, awards, and roles", () => {
    renderPage();

    expect(screen.getByText("Buildings")).toBeInTheDocument();
    expect(screen.getByText("Cities")).toBeInTheDocument();
    expect(screen.getByText("Roles")).toBeInTheDocument();
    // "Awards" is both a stats label and a tab label.
    expect(screen.getAllByText("Awards")).toHaveLength(2);
    // 2 buildings, 2 cities, 2 roles + the Portfolio tab count; 0 awards twice.
    expect(screen.getAllByText("2")).toHaveLength(4);
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("draws the practice square, with the verified badge in the hero", () => {
    renderPage();
    expect(screen.getByLabelText("Verified company on Plano")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "StructCo GmbH" })).toBeInTheDocument();
  });

  it("defaults to Portfolio and switches sections via the tab bar", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: /Primary credits/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Awards/ }));
    expect(screen.queryByRole("heading", { name: /Primary credits/i })).not.toBeInTheDocument();
    expect(screen.getByText("No awards yet")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^About/ }));
    expect(screen.getByText("Country")).toBeInTheDocument();
    expect(screen.getByText("Germany")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("honours a ?section=about deep link", () => {
    renderPage("/company/structco?section=about");
    expect(screen.getByText("Country")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Primary credits/i })).not.toBeInTheDocument();
  });

  it("falls back to Portfolio for an unknown ?section value", () => {
    renderPage("/company/structco?section=bogus");
    expect(screen.getByRole("heading", { name: /Primary credits/i })).toBeInTheDocument();
  });

  it("marks the active tab with aria-current", () => {
    renderPage("/company/structco?section=awards");
    expect(screen.getByRole("button", { name: /^Awards/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /^Portfolio/ })).not.toHaveAttribute("aria-current");
  });

  it("gives stewards a Stewards tab holding the roster", async () => {
    mocks.user = { id: "stew-1", email: "s@test.com" };
    mocks.stewards = [
      {
        id: "row-1",
        companyId: "co1",
        userId: "stew-1",
        role: "owner",
        invitedBy: null,
        createdAt: "t",
        username: "owner_co",
        avatarUrl: null,
      },
    ];
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /^Stewards/ }));
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Company stewards/i })).toBeInTheDocument();
    });
    expect(screen.getByText("@owner_co")).toBeInTheDocument();
  });
});
