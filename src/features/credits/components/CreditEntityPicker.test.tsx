// @vitest-environment happy-dom
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreditEntityPicker, findSimilarEntityCandidates } from "./CreditEntityPicker";
import type { CompanySummary, PersonSummary } from "@/features/credits/types";

const searchPeopleMock = vi.fn();
const searchCompaniesMock = vi.fn();
const createPersonMock = vi.fn();
const createCompanyMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/features/credits/api/people", () => ({
  searchPeople: (...args: unknown[]) => searchPeopleMock(...args),
  createPerson: (...args: unknown[]) => createPersonMock(...args),
}));

vi.mock("@/features/credits/api/companies", () => ({
  searchCompanies: (...args: unknown[]) => searchCompaniesMock(...args),
  createCompany: (...args: unknown[]) => createCompanyMock(...args),
}));

const norman: PersonSummary = {
  id: "p1",
  name: "Norman Foster",
  slug: "norman-foster",
  claimStatus: "unclaimed",
  associatedCompanies: ["Foster + Partners"],
  knownBuilding: "Gherkin",
};

const fosterPartnersCo: CompanySummary = {
  id: "co-fp",
  name: "Foster + Partners Ltd",
  slug: "foster-partners-ltd",
  claimStatus: "unclaimed",
  country: "UK",
  logoUrl: null,
  creditCount: 12,
};

function wrap(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("findSimilarEntityCandidates", () => {
  it("returns matches above threshold", () => {
    const people: PersonSummary[] = [norman];
    const companies: CompanySummary[] = [];
    const c = findSimilarEntityCandidates("Norman Fostr", people, companies, 0.4);
    expect(c.length).toBeGreaterThan(0);
    expect(c[0]?.name).toBe("Norman Foster");
  });
});

describe("CreditEntityPicker", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    searchPeopleMock.mockReset();
    searchCompaniesMock.mockReset();
    createPersonMock.mockReset();
    createCompanyMock.mockReset();
    searchPeopleMock.mockImplementation(async (q: string) => {
      if (q.toLowerCase().includes("foster")) return [norman];
      return [];
    });
    searchCompaniesMock.mockImplementation(async (q: string) => {
      if (q.toLowerCase().includes("foster")) return [fosterPartnersCo];
      return [];
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("shows merged person hit with disambiguation after debounced search", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    wrap(<CreditEntityPicker value={null} onChange={vi.fn()} />);
    await user.click(screen.getByRole("combobox"));
    const input = screen.getByPlaceholderText("Type at least 2 characters…");
    await user.type(input, "foster");
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => {
      expect(screen.getByText("Norman Foster")).toBeInTheDocument();
    });
    expect(screen.getByText(/Foster \+ Partners · Gherkin/)).toBeInTheDocument();
    expect(screen.getByText("Foster + Partners Ltd")).toBeInTheDocument();
  });

  it("blocks create when similarity is high until user dismisses", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onChange = vi.fn();
    searchPeopleMock.mockImplementation(async () => [norman]);
    searchCompaniesMock.mockResolvedValue([]);

    wrap(<CreditEntityPicker value={null} onChange={onChange} allowedKinds={["person"]} />);
    await user.click(screen.getByRole("combobox"));
    const searchInput = screen.getByPlaceholderText("Type at least 2 characters…");
    await user.type(searchInput, "foster");
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => screen.getByText("Create new person"));

    await user.click(screen.getByText("Create new person"));
    const nameField = screen.getByLabelText("New entity name");
    await user.clear(nameField);
    await user.type(nameField, "Norman Fostr");

    await user.click(screen.getByRole("button", { name: /Create person/i }));

    await waitFor(() => {
      expect(screen.getByText(/Did you mean an existing record/i)).toBeInTheDocument();
    });
    expect(createPersonMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /No — create/i }));

    createPersonMock.mockResolvedValue({
      id: "new",
      name: "Norman Fostr",
      slug: "norman-fostr",
      bio: null,
      nationality: null,
      birthYear: null,
      deathYear: null,
      avatarUrl: null,
      website: null,
      locationNote: null,
      claimedByUserId: null,
      claimStatus: "unclaimed",
      createdAt: "",
      updatedAt: "",
    });

    await user.click(screen.getByRole("button", { name: /Create person/i }));

    await waitFor(() => {
      expect(createPersonMock).toHaveBeenCalledWith({ name: "Norman Fostr" });
    });
  });
});

describe("CreditEntityPicker (QA 6.1)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    searchPeopleMock.mockReset();
    searchCompaniesMock.mockReset();
    createPersonMock.mockReset();
    createCompanyMock.mockReset();
    searchPeopleMock.mockImplementation(async (q: string) => {
      if (q.toLowerCase().includes("foster")) return [norman];
      return [];
    });
    searchCompaniesMock.mockImplementation(async (q: string) => {
      if (q.toLowerCase().includes("foster")) return [fosterPartnersCo];
      return [];
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("merges person and company hits with Person / Company labels for the same query", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    wrap(<CreditEntityPicker value={null} onChange={vi.fn()} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Type at least 2 characters…"), "foster");
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => {
      expect(screen.getByText("Norman Foster")).toBeInTheDocument();
    });
    expect(screen.getByText("Foster + Partners Ltd")).toBeInTheDocument();
    const personRows = screen.getAllByText("Person");
    const companyRows = screen.getAllByText("Company");
    expect(personRows.length).toBeGreaterThanOrEqual(1);
    expect(companyRows.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Create new person and Create new company when search returns no matches", async () => {
    searchPeopleMock.mockResolvedValue([]);
    searchCompaniesMock.mockResolvedValue([]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    wrap(<CreditEntityPicker value={null} onChange={vi.fn()} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Type at least 2 characters…"), "zz");
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => {
      expect(screen.getByText("Create new person")).toBeInTheDocument();
    });
    expect(screen.getByText("Create new company")).toBeInTheDocument();
  });

  it("accepting Did you mean selects the existing person without calling createPerson", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onChange = vi.fn();
    searchPeopleMock.mockImplementation(async () => [norman]);
    searchCompaniesMock.mockResolvedValue([]);

    wrap(<CreditEntityPicker value={null} onChange={onChange} allowedKinds={["person"]} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Type at least 2 characters…"), "foster");
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => screen.getByText("Create new person"));
    await user.click(screen.getByText("Create new person"));
    const nameField = screen.getByLabelText("New entity name");
    await user.clear(nameField);
    await user.type(nameField, "Norman Fostr");
    await user.click(screen.getByRole("button", { name: /Create person/i }));

    await waitFor(() => {
      expect(screen.getByText(/Did you mean an existing record/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Norman Foster/i }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        kind: "person",
        id: "p1",
        name: "Norman Foster",
        slug: "norman-foster",
      });
    });
    expect(createPersonMock).not.toHaveBeenCalled();
  });

  it("creates a novel person without similarity prompt when search finds no close match", async () => {
    searchPeopleMock.mockResolvedValue([]);
    searchCompaniesMock.mockResolvedValue([]);
    createPersonMock.mockResolvedValue({
      id: "new-id-99",
      name: "Zyzzyva Unique",
      slug: "zyzzyva-unique",
      bio: null,
      nationality: null,
      birthYear: null,
      deathYear: null,
      avatarUrl: null,
      website: null,
      locationNote: null,
      claimedByUserId: null,
      claimStatus: "unclaimed",
      createdAt: "",
      updatedAt: "",
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    wrap(<CreditEntityPicker value={null} onChange={vi.fn()} allowedKinds={["person"]} />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Type at least 2 characters…"), "zy");
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => screen.getByText("Create new person"));
    await user.click(screen.getByText("Create new person"));
    const nameField = screen.getByLabelText("New entity name");
    await user.clear(nameField);
    await user.type(nameField, "Zyzzyva Unique");
    await user.click(screen.getByRole("button", { name: /Create person/i }));

    await waitFor(() => {
      expect(createPersonMock).toHaveBeenCalledWith({ name: "Zyzzyva Unique" });
    });
    expect(screen.queryByText(/Did you mean an existing record/i)).not.toBeInTheDocument();
  });

  it("keeps the results list scroll-contained on a narrow viewport (QA 6.1)", async () => {
    Object.defineProperty(window, "innerWidth", { value: 375, configurable: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    wrap(
      <div className="w-72 max-w-xs">
        <CreditEntityPicker value={null} onChange={vi.fn()} />
      </div>,
    );
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Type at least 2 characters…"), "foster");
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => screen.getByText("Norman Foster"));
    const list = document.body.querySelector("[cmdk-list]");
    expect(list).toBeTruthy();
    expect(list?.className).toMatch(/overflow-y-auto/);
    expect(list?.className).toMatch(/max-h-\[300px\]/);
  });
});
