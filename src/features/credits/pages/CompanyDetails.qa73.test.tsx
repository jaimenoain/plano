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

vi.mock("@/features/credits/components/ClaimCompanyDialog", () => ({
  ClaimCompanyDialog: () => null,
}));

const toastMock = vi.fn();

const mocks = vi.hoisted(() => ({
  getCompany: vi.fn(),
  user: null as { id: string; email: string } | null,
  revalidate: vi.fn(),
  loaderData: {} as CompanyDetailsLoaderData,
  stewards: [] as CompanyStewardWithProfile[],
  getMyPendingCompanyStewardRequestId: vi.fn(() => Promise.resolve(null as string | null)),
  submitCompanyStewardRequest: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/features/credits/api/companies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/companies")>();
  return {
    ...actual,
    getCompany: (...args: unknown[]) => mocks.getCompany(...args),
    getCompanyStewardsWithProfiles: vi.fn(() => Promise.resolve(mocks.stewards)),
    getMyPendingCompanyStewardRequestId: (...args: unknown[]) =>
      mocks.getMyPendingCompanyStewardRequestId(...args) as ReturnType<
        typeof actual.getMyPendingCompanyStewardRequestId
      >,
    getMyOpenCompanyClaimDisputeId: vi.fn(() => Promise.resolve(null)),
    removeCompanySteward: vi.fn(() => Promise.resolve()),
    submitCompanyStewardRequest: (...args: unknown[]) =>
      mocks.submitCompanyStewardRequest(...args) as ReturnType<typeof actual.submitCompanyStewardRequest>,
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

describe("CompanyDetails (QA 7.3 steward access request)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    toastMock.mockReset();
    mocks.revalidate.mockReset();
    mocks.submitCompanyStewardRequest.mockReset();
    mocks.getMyPendingCompanyStewardRequestId.mockReset();
    mocks.getMyPendingCompanyStewardRequestId.mockImplementation(() => Promise.resolve(null));
    mocks.loaderData = buildClaimedLoader();
    mocks.stewards = [stewardRow("stew-owner", "owner-1", "owner", "owner_u")];
    mocks.user = { id: "requester-1", email: "req@test.com" };
    mocks.getCompany.mockImplementation(async () => ({
      company: mocks.loaderData.company,
      credits: mocks.loaderData.credits,
    }));
  });

  it("non-steward on claimed company sees Request access, not Claim this company", async () => {
    renderPage();

    expect(screen.queryByRole("button", { name: /Claim this company/i })).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Request access to manage this company/i }),
    ).toBeInTheDocument();
  });

  it("opens dialog and calls submitCompanyStewardRequest with optional message + success toast", async () => {
    const user = userEvent.setup();
    mocks.submitCompanyStewardRequest.mockResolvedValue(undefined);

    renderPage();
    const accessBtn = await screen.findByRole("button", { name: /Request access to manage this company/i });
    await user.click(accessBtn);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Message \(optional\)/i), "I lead ops");
    await user.click(screen.getByRole("button", { name: /Send request/i }));

    await waitFor(() => {
      expect(mocks.submitCompanyStewardRequest).toHaveBeenCalledWith("co1", "I lead ops");
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Request sent",
      }),
    );
  });

  it("shows pending copy when user already has a pending steward request", async () => {
    mocks.getMyPendingCompanyStewardRequestId.mockImplementation(() => Promise.resolve("pending-req-1"));

    renderPage();

    expect(
      await screen.findByText(/Request pending — owners have been notified by email/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Request access to manage this company/i })).not.toBeInTheDocument();
  });
});
