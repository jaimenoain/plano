// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import CompanyDetails, { meta } from "./CompanyDetails";
import type { CompanyDetailsLoaderData } from "./CompanyDetails.loader";
import type {
  CompanyCreditWithBuilding,
  CompanyStewardWithProfile,
} from "@/features/credits/types";

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

const mocks = vi.hoisted(() => ({
  getCompany: vi.fn(),
  user: null as { id: string; email: string } | null,
  revalidate: vi.fn(),
  stewards: [] as CompanyStewardWithProfile[],
  removeCompanySteward: vi.fn(() => Promise.resolve()),
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
    removeCompanySteward: (...args: unknown[]) => mocks.removeCompanySteward(...args),
  };
});

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mocks.user,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useLoaderData: () => mocks.loaderData,
    useParams: () => ({ slug: "structco" }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useRevalidator: () => ({ revalidate: mocks.revalidate, state: "idle" as const }),
  };
});

function mkCredit(
  overrides: Partial<CompanyCreditWithBuilding> & { id: string },
): CompanyCreditWithBuilding {
  const base: CompanyCreditWithBuilding = {
    id: overrides.id,
    buildingId: "b1",
    personId: "p1",
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
    person: { id: "p1", name: "Pat Engineer", slug: "pat-engineer" },
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

function buildLoaderData(): CompanyDetailsLoaderData {
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
    verifiedDomain: null,
    claimStatus: "unclaimed" as const,
    createdAt: "t0",
    updatedAt: "t0",
  };

  const credits: CompanyCreditWithBuilding[] = [
    mkCredit({ id: "c-design", role: "design_architecture", buildingId: "b1" }),
    mkCredit({
      id: "c-struct",
      role: "structural_engineering",
      buildingId: "b2",
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
    mkCredit({
      id: "c-ancillary",
      creditTier: "ancillary",
      isLead: false,
      buildingId: "b3",
      building: {
        id: "b3",
        name: "Side Pavilion",
        slug: "side-pavilion",
        shortId: 12,
        city: "Hamburg",
        country: "DE",
        yearCompleted: 2018,
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
      url: "https://plano.app/company/structco",
    },
  };
}

function stewardRow(
  id: string,
  userId: string,
  role: "owner" | "steward",
  username: string,
): CompanyStewardWithProfile {
  return {
    id,
    companyId: "co1",
    userId,
    role,
    invitedBy: null,
    createdAt: "t",
    username,
    avatarUrl: null,
  };
}

function buildClaimedLoaderData(claimStatus: "claimed" | "verified"): CompanyDetailsLoaderData {
  const base = buildLoaderData();
  return {
    ...base,
    company: { ...base.company, claimStatus },
  };
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter initialEntries={["/company/structco"]}>
          <Routes>
            <Route path="/company/:slug" element={<CompanyDetails />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("CompanyDetails (QA 4.1 unclaimed)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    mocks.loaderData = buildLoaderData();
    mocks.stewards = [];
    mocks.getCompany.mockImplementation(async () => ({
      company: mocks.loaderData.company,
      credits: mocks.loaderData.credits,
    }));
    mocks.user = { id: "viewer-1", email: "v@test.com" };
    mocks.revalidate.mockReset();
  });

  it("renders company fields, website link, and logo initial fallback", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "StructCo GmbH" })).toBeInTheDocument();
    expect(screen.getByText("Structural engineering practice.")).toBeInTheDocument();
    expect(screen.getByText("Germany")).toBeInTheDocument();
    expect(screen.getByText("1990–—")).toBeInTheDocument();

    const website = screen.getByRole("link", { name: /website/i });
    expect(website).toHaveAttribute("href", "https://structco.example");

    // No logoUrl: the company logo (and its initial fallback) is not rendered.
    // The initial fallback was removed in commit 8ee1047c — logos show only when
    // an image URL exists.
    expect(screen.queryByRole("img", { name: /StructCo GmbH logo/i })).not.toBeInTheDocument();
  });

  it("shows unclaimed banner and Claim this company when logged in", () => {
    renderPage();
    expect(screen.getByText(/This company hasn't been claimed yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Claim this company/i })).toBeInTheDocument();
  });

  it("shows log-in CTA when logged out", () => {
    mocks.user = null;
    renderPage();
    expect(screen.getByRole("link", { name: /Log in to claim/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/auth?"),
    );
  });

  it("does not show unclaimed banner when company is claimed", () => {
    mocks.loaderData = {
      ...buildLoaderData(),
      company: { ...buildLoaderData().company, claimStatus: "claimed" },
    };
    mocks.getCompany.mockImplementation(async () => ({
      company: mocks.loaderData.company,
      credits: mocks.loaderData.credits,
    }));
    renderPage();
    expect(screen.queryByText(/This company hasn't been claimed yet/i)).not.toBeInTheDocument();
  });

  it("lists primary credits and ancillary behind a toggle with tier headings", () => {
    renderPage();

    const primarySection = screen.getByRole("heading", { name: /Primary credits/i }).closest("section");
    expect(primarySection).toBeTruthy();
    if (primarySection) {
      expect(within(primarySection).getByRole("link", { name: "Design Tower" })).toBeInTheDocument();
      expect(within(primarySection).getByRole("link", { name: "Bridge Hall" })).toBeInTheDocument();
    }

    expect(screen.queryByRole("link", { name: "Side Pavilion" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Additional credits/i }));
    expect(screen.getByRole("link", { name: "Side Pavilion" })).toBeInTheDocument();
  });

  it("credit cards show building name, locality, and completed year", () => {
    renderPage();
    expect(screen.getByText("Berlin, DE")).toBeInTheDocument();
    expect(screen.getByText("Completed 2020")).toBeInTheDocument();
    expect(screen.getByText("Completed 2019")).toBeInTheDocument();
  });

  it("role filter hides non-matching credits and All restores them", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole("link", { name: "Design Tower" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bridge Hall" })).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: /filter credits by role/i }));
    await user.click(await screen.findByRole("option", { name: "Structural Engineering" }));

    expect(screen.queryByRole("link", { name: "Design Tower" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bridge Hall" })).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: /filter credits by role/i }));
    await user.click(await screen.findByRole("option", { name: "All roles" }));

    expect(screen.getByRole("link", { name: "Design Tower" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bridge Hall" })).toBeInTheDocument();
  });
});

describe("CompanyDetails meta (QA 4.1)", () => {
  it("emits document title and Organization JSON-LD script descriptor", () => {
    mocks.loaderData = buildLoaderData();
    const tags = meta({ data: mocks.loaderData } as Parameters<typeof meta>[0]["data"]);

    const titleEntry = tags.find((t): t is { title: string } => typeof t === "object" && t !== null && "title" in t);
    expect(titleEntry?.title).toBe(
      "StructCo GmbH — architecture and engineering projects on Plano",
    );

    const ldEntry = tags.find(
      (t): t is { "script:ld+json": Record<string, unknown> } =>
        typeof t === "object" &&
        t !== null &&
        "script:ld+json" in t &&
        typeof (t as { "script:ld+json": unknown })["script:ld+json"] === "object",
    );
    expect(ldEntry?.["script:ld+json"]["@type"]).toBe("Organization");
    expect(ldEntry?.["script:ld+json"].name).toBe("StructCo GmbH");
  });
});

describe("CompanyDetails (QA 4.2 claimed)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    mocks.loaderData = buildClaimedLoaderData("claimed");
    mocks.stewards = [
      stewardRow("stew-row-owner", "owner-1", "owner", "owner_co"),
      stewardRow("stew-row-member", "stew-2", "steward", "steward_co"),
    ];
    mocks.getCompany.mockImplementation(async () => ({
      company: mocks.loaderData.company,
      credits: mocks.loaderData.credits,
    }));
    mocks.removeCompanySteward.mockReset();
    mocks.removeCompanySteward.mockResolvedValue(undefined);
    mocks.revalidate.mockReset();
  });

  it("owner sees Edit, stewards section, Invite a steward, and Remove on non-owner stewards", async () => {
    mocks.user = { id: "owner-1", email: "owner@test.com" };
    renderPage();

    const editButtons = await screen.findAllByRole("button", { name: /^Edit$/i });
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("edit-company-form")).toBeInTheDocument();

    expect(screen.getByRole("region", { name: /Company stewards/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Invite a steward/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("non-owner steward sees Edit and stewards list but not Invite or Remove", async () => {
    mocks.user = { id: "stew-2", email: "stew@test.com" };
    renderPage();

    const editButtons = await screen.findAllByRole("button", { name: /^Edit$/i });
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("region", { name: /Company stewards/i })).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /Invite a steward/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("authenticated non-steward sees no Edit, stewards section, or invite/remove", async () => {
    mocks.user = { id: "stranger", email: "s@test.com" };
    mocks.stewards = [
      stewardRow("stew-row-owner", "owner-1", "owner", "owner_co"),
      stewardRow("stew-row-member", "stew-2", "steward", "steward_co"),
    ];
    renderPage();

    await waitFor(() => {
      expect(screen.queryAllByRole("button", { name: /^Edit$/i })).toHaveLength(0);
    });
    expect(screen.queryByTestId("edit-company-form")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Company stewards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Invite a steward/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("logged-out visitor sees no Edit, stewards section, or invite/remove", () => {
    mocks.user = null;
    renderPage();

    expect(screen.queryAllByRole("button", { name: /^Edit$/i })).toHaveLength(0);
    expect(screen.queryByTestId("edit-company-form")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Company stewards/i })).not.toBeInTheDocument();
  });

  it("shows verified badge only when claim_status is verified", async () => {
    mocks.loaderData = buildClaimedLoaderData("verified");
    mocks.getCompany.mockImplementation(async () => ({
      company: mocks.loaderData.company,
      credits: mocks.loaderData.credits,
    }));
    mocks.user = { id: "stranger", email: "s@test.com" };
    renderPage();
    expect(await screen.findByLabelText("Verified company on Plano")).toBeInTheDocument();
    cleanup();

    mocks.loaderData = buildClaimedLoaderData("claimed");
    mocks.getCompany.mockImplementation(async () => ({
      company: mocks.loaderData.company,
      credits: mocks.loaderData.credits,
    }));
    renderPage();
    expect(screen.queryByLabelText("Verified company on Plano")).not.toBeInTheDocument();
  });

  it("owner confirming Remove steward calls removeCompanySteward with steward row id", async () => {
    mocks.user = { id: "owner-1", email: "owner@test.com" };
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(mocks.removeCompanySteward).toHaveBeenCalledWith("stew-row-member");
    });
  });

  it("former steward with only owner left in stewards list sees no edit control", async () => {
    mocks.user = { id: "stew-2", email: "stew@test.com" };
    mocks.stewards = [stewardRow("stew-row-owner", "owner-1", "owner", "owner_co")];
    renderPage();

    await waitFor(() => {
      expect(screen.queryAllByRole("button", { name: /^Edit$/i })).toHaveLength(0);
    });
    expect(screen.queryByTestId("edit-company-form")).not.toBeInTheDocument();
  });
});
