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
    searchPeopleMock.mockReset();
    searchCompaniesMock.mockReset();
    createPersonMock.mockReset();
    createCompanyMock.mockReset();
    searchPeopleMock.mockImplementation(async (q: string) => {
      if (q.toLowerCase().includes("foster")) return [norman];
      return [];
    });
    searchCompaniesMock.mockResolvedValue([]);
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
    expect(screen.getByText(/Foster \+ Partners/)).toBeInTheDocument();
    expect(screen.getByText(/Gherkin/)).toBeInTheDocument();
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
