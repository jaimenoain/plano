// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import PersonDetails from "./PersonDetails";
import type { PersonDetailsLoaderData } from "./PersonDetails.loader";
import type { Person, PersonCreditWithBuilding } from "@/features/credits/types";

vi.mock("@/utils/image", () => ({
  getBuildingImageUrl: (path: string | null | undefined) => (path ? `https://img.test/${path}` : null),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock("@/features/credits/components/EditPersonForm", () => ({
  EditPersonForm: () => <div data-testid="edit-person-form" />,
}));

const mocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  claimPerson: vi.fn(),
  user: null as { id: string; email: string } | null,
  revalidate: vi.fn(),
}));

vi.mock("@/features/credits/api/people", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/people")>();
  return {
    ...actual,
    getPerson: (...args: unknown[]) => mocks.getPerson(...args),
    claimPerson: (...args: unknown[]) => mocks.claimPerson(...args),
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
    useParams: () => ({ slug: "jane-doe" }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useRevalidator: () => ({ revalidate: mocks.revalidate, state: "idle" as const }),
  };
});

mocks.loaderData = {} as PersonDetailsLoaderData;

function mkCredit(overrides: Partial<PersonCreditWithBuilding> & { id: string }): PersonCreditWithBuilding {
  const base: PersonCreditWithBuilding = {
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
    person: { id: "p1", name: "Jane Doe", slug: "jane-doe" },
    company: { id: "co1", name: "Acme Ltd", slug: "acme-ltd" },
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

const unclaimedPerson: Person = {
  id: "p1",
  name: "Jane Doe",
  slug: "jane-doe",
  bio: null,
  nationality: null,
  birthYear: null,
  deathYear: null,
  avatarUrl: null,
  website: null,
  locationNote: null,
  claimedByUserId: null,
  claimStatus: "unclaimed",
  createdAt: "t0",
  updatedAt: "t0",
};

function buildLoaderData(): PersonDetailsLoaderData {
  const credits: PersonCreditWithBuilding[] = [mkCredit({ id: "c1" })];
  return {
    person: unclaimedPerson,
    credits,
    canonical: "https://plano.app/person/jane-doe",
    metaTitle: "Jane Doe — Plano",
    description: "Test",
    ogImage: "https://plano.app/cover.jpg",
    structuredData: { "@context": "https://schema.org", "@type": "Person", name: "Jane Doe" },
  };
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter initialEntries={["/person/jane-doe"]}>
          <Routes>
            <Route path="/person/:slug" element={<PersonDetails />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("PersonDetails (QA 7.1 claim flow)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    mocks.loaderData = buildLoaderData();
    mocks.revalidate.mockReset();
    mocks.claimPerson.mockReset();
    mocks.user = { id: "claimer-1", email: "claim@test.com" };

    let personRow: Person = unclaimedPerson;
    mocks.getPerson.mockImplementation(async () => ({
      person: personRow,
      credits: mocks.loaderData.credits,
    }));
    mocks.claimPerson.mockImplementation(async (personId: string, personSlug: string, reason: string) => {
      expect(personId).toBe("p1");
      expect(personSlug).toBe("jane-doe");
      expect(reason).toBe("self");
      personRow = {
        ...unclaimedPerson,
        claimedByUserId: "claimer-1",
        claimStatus: "claimed",
      };
      return personRow;
    });
  });

  it("logged-in user opens claim dialog, confirms as self, and sees owner Edit with banner gone", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^Claim this profile\b/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /claim this profile/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Confirm claim$/i }));

    await waitFor(() => {
      expect(mocks.claimPerson).toHaveBeenCalledWith("p1", "jane-doe", "self");
    });

    await waitFor(() => {
      expect(screen.queryByText(/This profile hasn't been claimed yet/i)).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /^Edit$/i })).toBeInTheDocument();
    expect(screen.getByTestId("edit-person-form")).toBeInTheDocument();
  });

  it("logged-out user sees Log in to claim instead of opening the dialog", () => {
    mocks.user = null;
    renderPage();
    const login = screen.getByRole("link", { name: /Log in to claim/i });
    expect(login).toHaveAttribute("href", "/login?redirect=%2Fperson%2Fjane-doe");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("when profile is claimed by someone else, stranger sees no claim CTA and no Edit", () => {
    mocks.user = { id: "stranger", email: "s@test.com" };
    mocks.loaderData = {
      ...buildLoaderData(),
      person: {
        ...unclaimedPerson,
        claimedByUserId: "owner-other",
        claimStatus: "claimed",
      },
    };
    mocks.getPerson.mockImplementation(async () => ({
      person: mocks.loaderData.person,
      credits: mocks.loaderData.credits,
    }));

    renderPage();
    expect(screen.queryByText(/This profile hasn't been claimed yet/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Claim this profile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();
  });
});
