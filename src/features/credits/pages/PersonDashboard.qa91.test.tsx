// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { BuildingCreditWithEntities, PersonPortfolioItem } from "@/features/credits/types";
import PersonDashboard from "./PersonDashboard";

vi.mock("@/utils/image", () => ({
  getBuildingImageUrl: (path: string | null | undefined) => (path ? `https://img.test/${path}` : null),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="app-layout" data-title={title}>
      {children}
    </div>
  ),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

const personSummary = { id: "p1", name: "Pat Claimed", slug: "pat-claimed" };

function baseCredit(overrides: Partial<BuildingCreditWithEntities> & { id: string }): BuildingCreditWithEntities {
  return {
    id: overrides.id,
    buildingId: overrides.buildingId ?? "b1",
    personId: "p1",
    companyId: null,
    role: overrides.role ?? "design_architecture",
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
    displayOrder: 0,
    createdAt: "t",
    updatedAt: "t",
    person: { id: "p1", name: "Pat", slug: "pat" },
    company: null,
    ...overrides,
  };
}

function mkItem(
  credit: BuildingCreditWithEntities,
  building: PersonPortfolioItem["building"],
): PersonPortfolioItem {
  return { credit, building };
}

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  portfolio: {
    primary: [] as PersonPortfolioItem[],
    contributor: [] as PersonPortfolioItem[],
    ancillary: [] as PersonPortfolioItem[],
  },
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

vi.mock("@/features/credits/api/people", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/people")>();
  return {
    ...actual,
    getClaimedPersonSummaryForProfile: vi.fn(() => Promise.resolve(personSummary)),
    getPersonPortfolio: vi.fn(() => Promise.resolve(mocks.portfolio)),
  };
});

describe("PersonDashboard (QA 9.1)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mocks.portfolio = {
      primary: [
        mkItem(
          baseCredit({
            id: "c1",
            buildingId: "b-same",
            role: "structural_engineering",
            yearFrom: 2015,
          }),
          {
            id: "b-same",
            name: "Shared Tower",
            slug: "shared-tower",
            shortId: 1,
            city: null,
            country: null,
            yearCompleted: null,
            heroImageUrl: null,
            mainImageUrl: null,
            communityPreviewUrl: null,
          },
        ),
        mkItem(
          baseCredit({
            id: "c2",
            buildingId: "b-same",
            role: "design_architecture",
            yearFrom: 2010,
            yearTo: 2012,
          }),
          {
            id: "b-same",
            name: "Shared Tower",
            slug: "shared-tower",
            shortId: 1,
            city: null,
            country: null,
            yearCompleted: 2012,
            heroImageUrl: null,
            mainImageUrl: null,
            communityPreviewUrl: null,
          },
        ),
        mkItem(
          baseCredit({ id: "c3", buildingId: "b-other", role: "design_architecture" }),
          {
            id: "b-other",
            name: "Other Hall",
            slug: "other-hall",
            shortId: 2,
            city: null,
            country: null,
            yearCompleted: 2020,
            heroImageUrl: null,
            mainImageUrl: null,
            communityPreviewUrl: null,
          },
        ),
      ],
      contributor: [],
      ancillary: [],
    };
  });

  afterEach(() => {
    cleanup();
  });

  function renderDashboard() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PersonDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("shows stats matching distinct buildings, roles, and year span from portfolio rows", async () => {
    renderDashboard();

    await screen.findByText("Distinct buildings in your portfolio");
    expect(
      screen.getByText("Distinct buildings in your portfolio").previousElementSibling?.textContent,
    ).toBe("2");
    expect(screen.getByText("Distinct credit roles").previousElementSibling?.textContent).toBe("2");
    expect(screen.getByText("From credit years and completion dates").previousElementSibling?.textContent).toBe(
      "2010–2020",
    );
  });

  it("reorders primary tier cards by year vs role sort toggles", async () => {
    mocks.portfolio = {
      primary: [
        mkItem(
          baseCredit({
            id: "cy-old",
            buildingId: "b-old",
            role: "design_architecture",
            yearFrom: 2000,
          }),
          {
            id: "b-old",
            name: "AAA Old",
            slug: "aaa-old",
            shortId: 1,
            city: null,
            country: null,
            yearCompleted: 2001,
            heroImageUrl: null,
            mainImageUrl: null,
            communityPreviewUrl: null,
          },
        ),
        mkItem(
          baseCredit({
            id: "cy-new",
            buildingId: "b-new",
            role: "structural_engineering",
            yearFrom: 2015,
          }),
          {
            id: "b-new",
            name: "ZZZ New",
            slug: "zzz-new",
            shortId: 2,
            city: null,
            country: null,
            yearCompleted: 2018,
            heroImageUrl: null,
            mainImageUrl: null,
            communityPreviewUrl: null,
          },
        ),
      ],
      contributor: [],
      ancillary: [],
    };

    renderDashboard();
    await screen.findByRole("heading", { name: /primary credits/i });
    const section = screen.getByRole("heading", { name: /primary credits/i }).closest("section");
    expect(section).toBeTruthy();

    const buildingLinks = (order: "year" | "role") => {
      if (order === "role") {
        fireEvent.click(screen.getByRole("radio", { name: /sort by role/i }));
      } else {
        fireEvent.click(screen.getByRole("radio", { name: /sort by year/i }));
      }
      return within(section!).getAllByRole("link", { name: /^(AAA Old|ZZZ New)$/ });
    };

    const yearFirst = buildingLinks("year").map((l) => l.textContent);
    expect(yearFirst[0]).toBe("ZZZ New");
    expect(yearFirst[1]).toBe("AAA Old");

    const roleFirst = buildingLinks("role").map((l) => l.textContent);
    expect(roleFirst[0]).toBe("AAA Old");
    expect(roleFirst[1]).toBe("ZZZ New");
  });

  it("renders role badge and company link on each card when company is set", async () => {
    mocks.portfolio = {
      primary: [
        mkItem(
          baseCredit({
            id: "c-co",
            buildingId: "b1",
            role: "landscape_architecture",
            company: { id: "co1", name: "Green Fields Ltd", slug: "green-fields" },
          }),
          {
            id: "b1",
            name: "Garden Pavilion",
            slug: "garden-pavilion",
            shortId: 1,
            city: null,
            country: null,
            yearCompleted: null,
            heroImageUrl: null,
            mainImageUrl: null,
            communityPreviewUrl: null,
          },
        ),
      ],
      contributor: [],
      ancillary: [],
    };

    renderDashboard();
    await screen.findByText("Garden Pavilion");
    expect(screen.getByText("Landscape Architect")).toBeInTheDocument();
    const co = screen.getByRole("link", { name: "Green Fields Ltd" });
    expect(co).toHaveAttribute("href", "/company/green-fields");
  });
});
