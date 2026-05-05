// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  CompanyCreditWithBuilding,
  CompanyPortfolioItem,
  CompanyPortfolioPayload,
  CreditRole,
} from "@/features/credits/types";
import CompanyDashboard from "./CompanyDashboard";

vi.mock("@/utils/image", () => ({
  getBuildingImageUrl: (path: string | null | undefined) => (path ? `https://img.test/${path}` : null),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children, title }: { children: ReactNode; title?: string }) => (
    <div data-testid="app-layout" data-title={title}>
      {children}
    </div>
  ),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  stewardList: [] as {
    companyId: string;
    name: string;
    slug: string;
    stewardRole: "owner" | "steward";
  }[],
  portfolioByTier: {
    primary: [] as CompanyPortfolioItem[],
    contributor: [] as CompanyPortfolioItem[],
    ancillary: [] as CompanyPortfolioItem[],
  },
  pending: [] as {
    id: string;
    companyId: string;
    requesterUserId: string;
    message: string;
    createdAt: string;
    requesterUsername: string | null;
    requesterAvatarUrl: string | null;
  }[],
  approveCompanyStewardRequestById: vi.fn(),
  rejectCompanyStewardRequestById: vi.fn(),
  notifyStewardRequestApprovedWithClient: vi.fn(),
  getCompanyPortfolio: vi.fn(),
  listPendingStewardRequestsForCompany: vi.fn(),
  getMyStewardCompaniesForNav: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "u@example.com" },
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("@/features/credits/api/companies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/companies")>();
  return {
    ...actual,
    getMyStewardCompaniesForNav: () => mocks.getMyStewardCompaniesForNav(),
    getCompanyPortfolio: (companyId: string, roleFilter?: CreditRole) =>
      mocks.getCompanyPortfolio(companyId, roleFilter),
    listPendingStewardRequestsForCompany: (companyId: string) =>
      mocks.listPendingStewardRequestsForCompany(companyId),
    approveCompanyStewardRequestById: (id: string) => mocks.approveCompanyStewardRequestById(id),
    rejectCompanyStewardRequestById: (id: string) => mocks.rejectCompanyStewardRequestById(id),
    notifyStewardRequestApprovedWithClient: (...args: unknown[]) =>
      mocks.notifyStewardRequestApprovedWithClient(...args),
  };
});

function baseBuilding(id: string, name: string): CompanyPortfolioItem["building"] {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    shortId: 1,
    city: null,
    country: null,
    yearCompleted: null,
    heroImageUrl: null,
    mainImageUrl: null,
    communityPreviewUrl: null,
  };
}

function baseCredit(
  overrides: Partial<CompanyCreditWithBuilding> & { id: string; role: CreditRole },
): CompanyCreditWithBuilding {
  const company = { id: "co-1", name: "Acme Co", slug: "acme-co" };
  return {
    id: overrides.id,
    buildingId: overrides.buildingId ?? "b1",
    personId: null,
    companyId: company.id,
    role: overrides.role,
    roleCustom: null,
    creditTier: "primary",
    isLead: false,
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
    displayOrder: overrides.displayOrder ?? 0,
    companyPortfolioRank: overrides.companyPortfolioRank ?? null,
    createdAt: "t",
    updatedAt: "t",
    person: overrides.person ?? null,
    company,
    building: overrides.building ?? baseBuilding("b1", "Building One"),
    ...overrides,
  };
}

function mkItem(credit: CompanyCreditWithBuilding): CompanyPortfolioItem {
  const { building, ...rest } = credit;
  return { credit: rest as CompanyPortfolioItem["credit"], building };
}

function wrapPortfolioPayload(byTier: CompanyPortfolioPayload["byTier"]): CompanyPortfolioPayload {
  const orderedFlat = [...byTier.primary, ...byTier.contributor, ...byTier.ancillary];
  return { byTier, orderedFlat };
}

describe("CompanyDashboard (QA 9.2)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mocks.stewardList = [
      { companyId: "co-1", name: "Acme Co", slug: "acme-co", stewardRole: "owner" },
    ];
    mocks.portfolioByTier = { primary: [], contributor: [], ancillary: [] };
    mocks.pending = [];
    mocks.getMyStewardCompaniesForNav.mockImplementation(() => Promise.resolve(mocks.stewardList));
    mocks.getCompanyPortfolio.mockImplementation(async (_companyId: string, roleFilter?: CreditRole) => {
      const tier = mocks.portfolioByTier;
      if (!roleFilter) {
        return wrapPortfolioPayload(tier);
      }
      const filterItems = (items: CompanyPortfolioItem[]) => items.filter((i) => i.credit.role === roleFilter);
      return wrapPortfolioPayload({
        primary: filterItems(tier.primary),
        contributor: filterItems(tier.contributor),
        ancillary: filterItems(tier.ancillary),
      });
    });
    mocks.listPendingStewardRequestsForCompany.mockImplementation(() => Promise.resolve(mocks.pending));
    mocks.approveCompanyStewardRequestById.mockResolvedValue({
      ok: true,
      companySlug: "acme-co",
      requestId: "req-approved",
      alreadyProcessed: false,
    });
    mocks.rejectCompanyStewardRequestById.mockResolvedValue({
      ok: true,
      companySlug: "acme-co",
      requestId: "req-rejected",
      alreadyProcessed: false,
    });
    mocks.notifyStewardRequestApprovedWithClient.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  function renderDashboard(initialPath = "/company-portfolio?company=acme-co") {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/company-portfolio" element={<CompanyDashboard />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("lists portfolio credits with person link on cards when present", async () => {
    mocks.portfolioByTier = {
      primary: [
        mkItem(
          baseCredit({
            id: "c1",
            role: "structural_engineering",
            displayOrder: 1,
            buildingId: "b1",
            building: baseBuilding("b1", "Bridge Hall"),
            person: { id: "p1", name: "Sam Person", slug: "sam-person" },
          }),
        ),
        mkItem(
          baseCredit({
            id: "c2",
            role: "design_architecture",
            displayOrder: 0,
            buildingId: "b2",
            building: baseBuilding("b2", "Glass Tower"),
          }),
        ),
      ],
      contributor: [],
      ancillary: [],
    };

    renderDashboard();

    expect(await screen.findByRole("heading", { name: /^portfolio$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Glass Tower" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bridge Hall" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sam Person" })).toHaveAttribute("href", "/person/sam-person");
    expect(screen.getByRole("button", { name: /add credit/i })).toBeInTheDocument();
  });

  it("shows pending access requests with approve/decline for owners only", async () => {
    mocks.pending = [
      {
        id: "req-1",
        companyId: "co-1",
        requesterUserId: "u2",
        message: "Please add me",
        createdAt: "2026-01-15T12:00:00.000Z",
        requesterUsername: "requester",
        requesterAvatarUrl: null,
      },
    ];
    mocks.portfolioByTier = {
      primary: [mkItem(baseCredit({ id: "c1", role: "design_architecture" }))],
      contributor: [],
      ancillary: [],
    };

    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByRole("heading", { name: /pending access requests/i })).toBeInTheDocument();
    expect(screen.getByText("requester")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(mocks.approveCompanyStewardRequestById).toHaveBeenCalledWith("req-1");
    });
    expect(mocks.notifyStewardRequestApprovedWithClient).toHaveBeenCalled();
  });

  it("does not load or show pending requests for non-owner stewards", async () => {
    mocks.stewardList = [
      { companyId: "co-1", name: "Acme Co", slug: "acme-co", stewardRole: "steward" },
    ];
    mocks.pending = [
      {
        id: "req-hidden",
        companyId: "co-1",
        requesterUserId: "u2",
        message: "Hi",
        createdAt: "2026-01-15T12:00:00.000Z",
        requesterUsername: "x",
        requesterAvatarUrl: null,
      },
    ];
    mocks.portfolioByTier = {
      primary: [mkItem(baseCredit({ id: "c1", role: "design_architecture" }))],
      contributor: [],
      ancillary: [],
    };

    renderDashboard();
    await screen.findByRole("heading", { name: /^portfolio$/i });

    expect(screen.queryByRole("heading", { name: /pending access requests/i })).toBeNull();
    expect(mocks.listPendingStewardRequestsForCompany).not.toHaveBeenCalled();
  });

  it("refetches portfolio with role filter when user picks a role", async () => {
    mocks.portfolioByTier = {
      primary: [
        mkItem(baseCredit({ id: "c1", role: "design_architecture", buildingId: "b1", building: baseBuilding("b1", "Only Design") })),
        mkItem(
          baseCredit({
            id: "c2",
            role: "structural_engineering",
            buildingId: "b2",
            building: baseBuilding("b2", "Only Structural"),
          }),
        ),
      ],
      contributor: [],
      ancillary: [],
    };

    const user = userEvent.setup();
    renderDashboard();

    await screen.findByRole("link", { name: "Only Design" });
    expect(screen.getByRole("link", { name: "Only Structural" })).toBeInTheDocument();

    const roleCombo = screen.getByRole("combobox", { name: /filter by credit role/i });
    await user.click(roleCombo);
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByRole("option", { name: "Structural Engineer" }));

    await waitFor(() => {
      expect(mocks.getCompanyPortfolio).toHaveBeenCalledWith("co-1", "structural_engineering");
    });
    expect(screen.queryByRole("link", { name: "Only Design" })).toBeNull();
    expect(screen.getByRole("link", { name: "Only Structural" })).toBeInTheDocument();
  });

  it("renders company picker when user stewards multiple companies", async () => {
    mocks.stewardList = [
      { companyId: "co-a", name: "Alpha Ltd", slug: "alpha-ltd", stewardRole: "owner" },
      { companyId: "co-b", name: "Beta GmbH", slug: "beta-gmbh", stewardRole: "owner" },
    ];
    mocks.getCompanyPortfolio.mockImplementation(async (companyId: string) => {
      const name = companyId === "co-a" ? "Alpha Building" : "Beta Building";
      return wrapPortfolioPayload({
        primary: [
          mkItem(
            baseCredit({
              id: companyId === "co-a" ? "ca1" : "cb1",
              role: "design_architecture",
              buildingId: companyId === "co-a" ? "ba1" : "bb1",
              companyId,
              company: {
                id: companyId,
                name: companyId === "co-a" ? "Alpha Ltd" : "Beta GmbH",
                slug: companyId === "co-a" ? "alpha-ltd" : "beta-gmbh",
              },
              building: baseBuilding(companyId === "co-a" ? "ba1" : "bb1", name),
            }),
          ),
        ],
        contributor: [],
        ancillary: [],
      });
    });

    const user = userEvent.setup();
    renderDashboard("/company-portfolio?company=alpha-ltd");

    expect(await screen.findByRole("combobox", { name: /select company/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alpha Building" })).toBeInTheDocument();

    const companyCombo = screen.getByRole("combobox", { name: /select company/i });
    await user.click(companyCombo);
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByRole("option", { name: "Beta GmbH" }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Beta Building" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: "Alpha Building" })).toBeNull();
    expect(mocks.getCompanyPortfolio).toHaveBeenCalledWith("co-b", undefined);
  });
});
