// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import CompanyClaimDispute from "./CompanyClaimDispute";
import type { CompanyClaimDisputeLoaderData } from "./CompanyClaimDispute.loader";

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

const toastMock = vi.fn();
const navigateMock = vi.fn();

const mocks = vi.hoisted(() => ({
  loaderData: {
    companyId: "co1",
    companyName: "StructCo GmbH",
    slug: "structco",
  } as CompanyClaimDisputeLoaderData,
  user: null as { id: string; email: string } | null,
  submitCompanyClaimDispute: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/features/credits/api/companies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/companies")>();
  return {
    ...actual,
    submitCompanyClaimDispute: (...args: unknown[]) =>
      mocks.submitCompanyClaimDispute(...args) as ReturnType<typeof actual.submitCompanyClaimDispute>,
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
    useNavigate: () => navigateMock,
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <CompanyClaimDispute />
    </MemoryRouter>,
  );
}

describe("CompanyClaimDispute (QA 7.4)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    toastMock.mockReset();
    navigateMock.mockReset();
    mocks.submitCompanyClaimDispute.mockReset();
    mocks.submitCompanyClaimDispute.mockResolvedValue(undefined);
    mocks.user = { id: "u-dispute", email: "d@test.com" };
  });

  it("shows log-in CTA when not authenticated", () => {
    mocks.user = null;
    renderPage();
    expect(screen.getByRole("link", { name: /Log in to continue/i })).toHaveAttribute(
      "href",
      `/login?redirect=${encodeURIComponent("/company/structco/dispute")}`,
    );
  });

  it("submits reason and optional evidence URL then navigates with disputeSubmitted=1", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Reason \(required\)/i), "Domain does not match our organization.");
    await user.type(screen.getByLabelText(/Evidence URL \(optional\)/i), "https://example.com/proof");
    await user.click(screen.getByRole("button", { name: /Submit dispute/i }));

    await waitFor(() => {
      expect(mocks.submitCompanyClaimDispute).toHaveBeenCalledWith("co1", {
        reason: "Domain does not match our organization.",
        evidenceUrl: "https://example.com/proof",
      });
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Dispute received",
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith("/company/structco?disputeSubmitted=1", { replace: true });
  });
});
