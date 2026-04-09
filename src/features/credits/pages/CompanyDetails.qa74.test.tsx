// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import CompanyDetails from "./CompanyDetails";
import type { CompanyDetailsLoaderData } from "./CompanyDetails.loader";
import type { CompanyCreditWithBuilding, CompanyStewardWithProfile } from "@/features/credits/types";

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
  loaderData: {} as CompanyDetailsLoaderData,
  stewards: [] as CompanyStewardWithProfile[],
  getMyOpenCompanyClaimDisputeId: vi.fn(() => Promise.resolve(null as string | null)),
}));

vi.mock("@/features/credits/api/companies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/companies")>();
  return {
    ...actual,
    getCompany: (...args: unknown[]) => mocks.getCompany(...args),
    getCompanyStewardsWithProfiles: vi.fn(() => Promise.resolve(mocks.stewards)),
    getMyPendingCompanyStewardRequestId: vi.fn(() => Promise.resolve(null)),
    getMyOpenCompanyClaimDisputeId: (...args: unknown[]) =>
      mocks.getMyOpenCompanyClaimDisputeId(...args) as ReturnType<
        typeof actual.getMyOpenCompanyClaimDisputeId
      >,
    removeCompanySteward: vi.fn(() => Promise.resolve()),
    submitCompanyStewardRequest: vi.fn(() => Promise.resolve()),
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
  return {
    id: overrides.id,
    buildingId: "b1",
    personId: "p1",
    companyId: "co1",
    role: "design_architect",
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
    person: { id: "p1", name: "Pat", slug: "pat" },
    company: { id: "co1", name: "StructCo GmbH", slug: "structco" },
    building: {
      id: "b1",
      name: "Tower",
      slug: "tower",
      shortId: 1,
      city: null,
      country: null,
      yearCompleted: null,
      heroImageUrl: null,
      mainImageUrl: null,
      communityPreviewUrl: null,
    },
    ...overrides,
  };
}

function buildClaimedLoader(): CompanyDetailsLoaderData {
  return {
    company: {
      id: "co1",
      name: "StructCo GmbH",
      slug: "structco",
      bio: null,
      country: "Germany",
      foundedYear: null,
      dissolvedYear: null,
      logoUrl: null,
      website: null,
      verifiedDomain: null,
      claimStatus: "claimed",
      createdAt: "t0",
      updatedAt: "t0",
    },
    credits: [mkCredit({ id: "c1" })],
    canonical: "https://plano.app/company/structco",
    metaTitle: "StructCo",
    description: "d",
    ogImage: "https://plano.app/c.jpg",
    structuredData: { "@context": "https://schema.org", "@type": "Organization", name: "StructCo" },
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

describe("CompanyDetails (QA 7.4 company claim dispute)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    mocks.revalidate.mockReset();
    mocks.getMyOpenCompanyClaimDisputeId.mockReset();
    mocks.getMyOpenCompanyClaimDisputeId.mockImplementation(() => Promise.resolve(null));
    mocks.loaderData = buildClaimedLoader();
    mocks.stewards = [stewardRow("stew-owner", "owner-1", "owner", "owner_u")];
    mocks.user = { id: "stranger-1", email: "s@test.com" };
    mocks.getCompany.mockImplementation(async () => ({
      company: mocks.loaderData.company,
      credits: mocks.loaderData.credits,
    }));
  });

  it("logged-in non-steward sees Dispute this claim; credits and company name unchanged", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "StructCo GmbH" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Credits$/i })).toBeInTheDocument();
    const disputeLink = await screen.findByRole("link", { name: /Dispute this claim/i });
    expect(disputeLink).toHaveAttribute("href", "/company/structco/dispute");
  });

  it("submitter with open dispute sees review notice, not the dispute link", async () => {
    mocks.getMyOpenCompanyClaimDisputeId.mockImplementation(() => Promise.resolve("dispute-open-1"));

    renderPage();

    expect(await screen.findByText(/Dispute under review —/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Dispute this claim/i })).not.toBeInTheDocument();
  });

  it("another logged-in user without an open dispute does not see the review notice", async () => {
    mocks.getMyOpenCompanyClaimDisputeId.mockImplementation(async () => {
      if (mocks.user?.id === "disputer-1") return "dispute-open-1";
      return null;
    });

    mocks.user = { id: "other-2", email: "o@test.com" };
    renderPage();

    expect(await screen.findByRole("link", { name: /Dispute this claim/i })).toBeInTheDocument();
    expect(screen.queryByText(/Dispute under review —/i)).not.toBeInTheDocument();

    cleanup();
    mocks.user = { id: "disputer-1", email: "d@test.com" };
    renderPage();
    expect(await screen.findByText(/Dispute under review —/i)).toBeInTheDocument();
  });

  it("logged-out visitor does not see Dispute under review; sees log-in dispute link", async () => {
    mocks.user = null;
    mocks.getMyOpenCompanyClaimDisputeId.mockImplementation(() => Promise.resolve(null));

    renderPage();

    const loginDispute = await screen.findByRole("link", { name: /Log in to dispute this claim/i });
    expect(loginDispute.getAttribute("href")).toContain(encodeURIComponent("/company/structco/dispute"));
    expect(screen.queryByText(/Dispute under review —/i)).not.toBeInTheDocument();
  });
});
