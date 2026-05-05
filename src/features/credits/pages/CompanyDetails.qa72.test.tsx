// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

vi.mock("@/features/credits/components/RequestStewardAccessDialog", () => ({
  RequestStewardAccessDialog: () => null,
}));

const toastMock = vi.fn();

const mocks = vi.hoisted(() => ({
  getCompany: vi.fn(),
  user: null as { id: string; email: string } | null,
  requestCompanyClaimVerification: vi.fn(),
  navigate: vi.fn(),
  revalidate: vi.fn(),
  loaderData: {} as CompanyDetailsLoaderData,
  stewards: [] as CompanyStewardWithProfile[],
}));

vi.mock("@/features/credits/api/companies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/companies")>();
  return {
    ...actual,
    getCompany: (...args: unknown[]) => mocks.getCompany(...args),
    getCompanyStewardsWithProfiles: vi.fn(() => Promise.resolve(mocks.stewards)),
    getMyPendingCompanyStewardRequestId: vi.fn(() => Promise.resolve(null)),
    getMyOpenCompanyClaimDisputeId: vi.fn(() => Promise.resolve(null)),
    removeCompanySteward: vi.fn(() => Promise.resolve()),
    requestCompanyClaimVerification: (...args: unknown[]) =>
      mocks.requestCompanyClaimVerification(...args) as ReturnType<
        typeof actual.requestCompanyClaimVerification
      >,
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
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useLoaderData: () => mocks.loaderData,
    useParams: () => ({ slug: "structco" }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useRevalidator: () => ({ revalidate: mocks.revalidate, state: "idle" as const }),
    useNavigate: () => mocks.navigate,
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

function buildUnclaimedLoader(): CompanyDetailsLoaderData {
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
      website: "structco.example",
      verifiedDomain: null,
      claimStatus: "unclaimed",
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

describe("CompanyDetails (QA 7.2 company claim)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    toastMock.mockReset();
    mocks.navigate.mockReset();
    mocks.requestCompanyClaimVerification.mockReset();
    mocks.revalidate.mockReset();
    mocks.loaderData = buildUnclaimedLoader();
    mocks.stewards = [];
    mocks.user = { id: "claimer-1", email: "claimer@test.com" };
    mocks.getCompany.mockImplementation(async () => ({
      company: mocks.loaderData.company,
      credits: mocks.loaderData.credits,
    }));
  });

  it("opens claim dialog and calls requestCompanyClaimVerification with work email", async () => {
    const user = userEvent.setup();
    mocks.requestCompanyClaimVerification.mockResolvedValue({ ok: true });

    renderPage();
    await user.click(screen.getByRole("button", { name: /Claim this company/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/work email/i), "lead@structco.example");
    await user.click(screen.getByRole("button", { name: /send verification link/i }));

    await waitFor(() => {
      expect(mocks.requestCompanyClaimVerification).toHaveBeenCalledWith("co1", "lead@structco.example");
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Check your email",
        description: expect.stringContaining("lead@structco.example") as unknown as string,
      }),
    );
  });

  it("navigates to dispute route when API returns dispute action (domain mismatch on claimed company)", async () => {
    const user = userEvent.setup();
    mocks.requestCompanyClaimVerification.mockResolvedValue({
      action: "dispute",
      companySlug: "structco",
    });

    renderPage();
    await user.click(screen.getByRole("button", { name: /Claim this company/i }));
    await user.type(screen.getByLabelText(/work email/i), "other@gmail.com");
    await user.click(screen.getByRole("button", { name: /send verification link/i }));

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith("/company/structco/dispute");
    });
    expect(toastMock).not.toHaveBeenCalled();
  });
});
