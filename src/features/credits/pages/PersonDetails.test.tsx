// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import PersonDetails, { meta } from "./PersonDetails";
import type { PersonDetailsLoaderData } from "./PersonDetails.loader";
import type { PersonCreditWithBuilding } from "@/features/credits/types";

vi.mock("@/utils/image", () => ({
  getBuildingImageUrl: (path: string | null | undefined) => (path ? `https://img.test/${path}` : null),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock("@/features/credits/components/EditPersonForm", () => ({
  EditPersonForm: () => <div data-testid="edit-person-form" />,
}));

vi.mock("@/features/credits/components/ClaimPersonDialog", () => ({
  ClaimPersonDialog: () => null,
}));

const mocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  user: null as { id: string; email: string } | null,
  revalidate: vi.fn(),
}));

vi.mock("@/features/credits/api/people", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/people")>();
  return {
    ...actual,
    getPerson: (...args: unknown[]) => mocks.getPerson(...args),
  };
});

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mocks.user,
    loading: false,
    signOut: vi.fn(),
  }),
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
    contributionNotes: "Lead designer.",
    yearFrom: 2018,
    yearTo: 2020,
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
      city: "London",
      country: "GB",
      yearCompleted: 2021,
      heroImageUrl: null,
      mainImageUrl: null,
      communityPreviewUrl: null,
    },
    ...overrides,
  };
  return base;
}

function buildLoaderData(): PersonDetailsLoaderData {
  const person = {
    id: "p1",
    name: "Jane Doe",
    slug: "jane-doe",
    bio: "Architect and educator.",
    nationality: "British",
    birthYear: 1970,
    deathYear: null,
    avatarUrl: null,
    website: "example.com",
    locationNote: "London",
    claimedByUserId: null,
    claimStatus: "unclaimed" as const,
    createdAt: "t0",
    updatedAt: "t0",
  };

  const credits: PersonCreditWithBuilding[] = [
    mkCredit({ id: "c-primary", creditTier: "primary", buildingId: "b1" }),
    mkCredit({
      id: "c-ancillary",
      creditTier: "ancillary",
      isLead: false,
      buildingId: "b2",
      building: {
        id: "b2",
        name: "Ancillary Pavilion",
        slug: "ancillary-pavilion",
        shortId: 11,
        city: null,
        country: null,
        yearCompleted: null,
        heroImageUrl: null,
        mainImageUrl: null,
        communityPreviewUrl: null,
      },
      contributionNotes: null,
      yearFrom: null,
      yearTo: null,
    }),
  ];

  return {
    person,
    credits,
    canonical: "https://plano.app/person/jane-doe",
    metaTitle: `${person.name} — buildings, projects and credits on Plano`,
    description: "Test description",
    ogImage: "https://plano.app/cover.jpg",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Person",
      name: person.name,
      url: "https://plano.app/person/jane-doe",
      nationality: person.nationality,
    },
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

describe("PersonDetails (QA 3.1 unclaimed)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mocks.loaderData = buildLoaderData();
    mocks.getPerson.mockImplementation(async () => ({
      person: mocks.loaderData.person,
      credits: mocks.loaderData.credits,
    }));
    mocks.user = { id: "viewer-1", email: "v@test.com" };
    mocks.revalidate.mockReset();
  });

  it("renders profile fields, website link, and avatar initials fallback", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Jane Doe" })).toBeInTheDocument();
    expect(screen.getByText("Architect and educator.")).toBeInTheDocument();
    expect(screen.getByText("British")).toBeInTheDocument();
    expect(screen.getByText("1970–—")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();

    const website = screen.getByRole("link", { name: /website/i });
    expect(website).toHaveAttribute("href", "https://example.com");

    // No avatarUrl: the component renders no avatar image (initials fallback was
    // removed in commit 8ee1047c — avatars now show only when an image URL exists).
    expect(screen.queryByRole("img", { name: "Jane Doe" })).not.toBeInTheDocument();
  });

  it("shows unclaimed banner and Claim this profile when logged in", () => {
    renderPage();
    expect(screen.getByText(/This profile hasn't been claimed yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Claim this profile/i })).toBeInTheDocument();
  });

  it("shows log-in CTA when logged out", () => {
    mocks.user = null;
    renderPage();
    expect(screen.getByRole("link", { name: /Log in to claim/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/auth?"),
    );
  });

  it("lists primary credits openly and ancillary behind a toggle", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: /Primary credits/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Primary Tower" })).toBeInTheDocument();

    expect(screen.queryByRole("link", { name: "Ancillary Pavilion" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Additional credits/i }));

    expect(screen.getByRole("link", { name: "Ancillary Pavilion" })).toBeInTheDocument();
  });

  it("credit row shows building link, role badge, years, notes, and company link", () => {
    renderPage();

    expect(screen.getByText("Lead designer.")).toBeInTheDocument();
    expect(screen.getByText(`2018\u20132020`)).toBeInTheDocument();

    const companyLink = screen.getByRole("link", { name: "Acme Ltd" });
    expect(companyLink).toHaveAttribute("href", "/company/acme-ltd");
  });
});

function buildClaimedLoaderData(options: {
  claimStatus: "claimed" | "verified";
  ownerUserId: string;
  avatarUrl?: string | null;
}): PersonDetailsLoaderData {
  const base = buildLoaderData();
  return {
    ...base,
    person: {
      ...base.person,
      claimStatus: options.claimStatus,
      claimedByUserId: options.ownerUserId,
      avatarUrl: options.avatarUrl ?? null,
    },
  };
}

describe("PersonDetails (QA 3.2 claimed)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mocks.revalidate.mockReset();
  });

  it("owner sees Edit control and edit form mount; stranger and logged-out do not", () => {
    mocks.loaderData = buildClaimedLoaderData({ claimStatus: "claimed", ownerUserId: "owner-1" });
    mocks.getPerson.mockImplementation(async () => ({
      person: mocks.loaderData.person,
      credits: mocks.loaderData.credits,
    }));

    mocks.user = { id: "owner-1", email: "owner@test.com" };
    const { unmount } = renderPage();
    const editButtons = screen.getAllByRole("button", { name: /^Edit$/i });
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("edit-person-form")).toBeInTheDocument();
    expect(screen.queryByText(/This profile hasn't been claimed yet/i)).not.toBeInTheDocument();
    unmount();

    mocks.user = { id: "stranger", email: "s@test.com" };
    renderPage();
    expect(screen.queryAllByRole("button", { name: /^Edit$/i })).toHaveLength(0);
    expect(screen.queryByTestId("edit-person-form")).not.toBeInTheDocument();
    cleanup();

    mocks.user = null;
    renderPage();
    expect(screen.queryAllByRole("button", { name: /^Edit$/i })).toHaveLength(0);
    expect(screen.queryByTestId("edit-person-form")).not.toBeInTheDocument();
  });

  it("shows verified badge only when claim_status is verified", () => {
    mocks.loaderData = buildClaimedLoaderData({ claimStatus: "verified", ownerUserId: "owner-1" });
    mocks.getPerson.mockImplementation(async () => ({
      person: mocks.loaderData.person,
      credits: mocks.loaderData.credits,
    }));
    mocks.user = { id: "stranger", email: "s@test.com" };
    renderPage();
    expect(screen.getByLabelText("Identity verified by Plano")).toBeInTheDocument();
    cleanup();

    mocks.loaderData = buildClaimedLoaderData({ claimStatus: "claimed", ownerUserId: "owner-1" });
    mocks.getPerson.mockImplementation(async () => ({
      person: mocks.loaderData.person,
      credits: mocks.loaderData.credits,
    }));
    renderPage();
    expect(screen.queryByLabelText("Identity verified by Plano")).not.toBeInTheDocument();
  });

});

describe("PersonDetails meta (QA 3.1)", () => {
  it("emits document title and JSON-LD script descriptor", () => {
    mocks.loaderData = buildLoaderData();
    const tags = meta({ loaderData: mocks.loaderData } as Parameters<typeof meta>[0]);

    const titleEntry = tags.find((t): t is { title: string } => typeof t === "object" && t !== null && "title" in t);
    expect(titleEntry?.title).toBe("Jane Doe — buildings, projects and credits on Plano");

    const ldEntry = tags.find(
      (t): t is { "script:ld+json": Record<string, unknown> } =>
        typeof t === "object" &&
        t !== null &&
        "script:ld+json" in t &&
        typeof (t as { "script:ld+json": unknown })["script:ld+json"] === "object",
    );
    expect(ldEntry?.["script:ld+json"]["@type"]).toBe("Person");
    expect(ldEntry?.["script:ld+json"].name).toBe("Jane Doe");
    expect(ldEntry?.["script:ld+json"].nationality).toBe("British");
  });
});
