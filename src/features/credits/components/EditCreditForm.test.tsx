// @vitest-environment happy-dom
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import * as creditsApi from "../api/credits";
import { EditCreditForm } from "./EditCreditForm";
import type { BuildingCreditWithEntities } from "../types";

const toastMock = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("./CreditEntityPicker", () => ({
  CreditEntityPicker: ({
    id,
    allowedKinds,
    value,
    onChange,
    disabled,
  }: {
    id?: string;
    allowedKinds?: ("person" | "company")[];
    value: { name: string } | null;
    onChange: (v: unknown) => void;
    disabled?: boolean;
  }) => {
    const isPerson = allowedKinds?.includes("person");
    return (
      <>
        {/* The picker's job here is only to prove the form was seeded from the credit. */}
        <span data-testid={isPerson ? "person-value" : "company-value"}>{value?.name ?? ""}</span>
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() =>
            onChange(
              isPerson
                ? { kind: "person", id: "p-new", name: "New Person", slug: "new-person" }
                : { kind: "company", id: "c-new", name: "New Co", slug: "new-co" },
            )
          }
        >
          {isPerson ? "Mock pick person" : "Mock pick company"}
        </button>
        <button type="button" disabled={disabled} onClick={() => onChange(null)}>
          {isPerson ? "Mock clear person" : "Mock clear company"}
        </button>
      </>
    );
  },
}));

const updateBuildingCreditMock = vi.spyOn(creditsApi, "updateBuildingCredit");

const baseCredit = (over: Partial<BuildingCreditWithEntities> = {}): BuildingCreditWithEntities => ({
  id: "c-1",
  buildingId: "b1",
  personId: null,
  companyId: "co-1",
  role: "design_architecture",
  roleCustom: null,
  creditTier: "primary",
  isLead: true,
  contributionNotes: "Original notes",
  yearFrom: 1971,
  yearTo: 1977,
  projectUrl: "https://example.com",
  status: "active",
  flagReason: null,
  flagNotes: null,
  flaggedAt: null,
  flaggedFromStatus: null,
  flaggedByUserId: null,
  addedByUserId: "u-1",
  displayOrder: 0,
  companyPortfolioRank: null,
  createdAt: "2020-01-01T00:00:00Z",
  updatedAt: "2020-01-01T00:00:00Z",
  person: null,
  company: { id: "co-1", name: "Piano & Rogers", slug: "piano-rogers", logoUrl: null },
  note: null,
  ...over,
});

function wrap(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <Sheet open>
        <SheetContent side="right" className="sm:max-w-lg" aria-describedby={undefined}>
          {ui}
        </SheetContent>
      </Sheet>
    </QueryClientProvider>,
  );
}

function mount(
  credit: BuildingCreditWithEntities = baseCredit(),
  onClose: () => void = vi.fn(),
  existingCredits: BuildingCreditWithEntities[] = [credit],
) {
  return wrap(
    <EditCreditForm
      credit={credit}
      buildingId="b1"
      existingCredits={existingCredits}
      onRequestClose={onClose}
    />,
  );
}

describe("EditCreditForm", () => {
  beforeEach(() => {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    toastMock.mockReset();
    updateBuildingCreditMock.mockReset();
    updateBuildingCreditMock.mockImplementation(async () => baseCredit());
  });

  afterEach(() => {
    cleanup();
  });

  it("seeds every field from the credit being edited", () => {
    mount();
    expect(screen.getByTestId("company-value").textContent).toBe("Piano & Rogers");
    expect(screen.getByTestId("person-value").textContent).toBe("");
    expect((screen.getByLabelText(/contribution notes/i) as HTMLTextAreaElement).value).toBe(
      "Original notes",
    );
    expect((screen.getByLabelText(/year from/i) as HTMLInputElement).value).toBe("1971");
    expect((screen.getByLabelText(/year to/i) as HTMLInputElement).value).toBe("1977");
    expect((screen.getByLabelText(/project url/i) as HTMLInputElement).value).toBe(
      "https://example.com",
    );
    expect(screen.getByRole("checkbox", { name: /lead for this role/i })).toBeChecked();
  });

  it("saves the corrected entity and closes with a success toast", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mount(baseCredit(), onClose);

    await user.click(screen.getByRole("button", { name: /mock pick company/i }));
    await user.clear(screen.getByLabelText(/year to/i));
    await user.type(screen.getByLabelText(/year to/i), "1978");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateBuildingCreditMock).toHaveBeenCalledTimes(1));
    expect(updateBuildingCreditMock.mock.calls[0]?.[0]).toBe("c-1");
    expect(updateBuildingCreditMock.mock.calls[0]?.[1]).toMatchObject({
      personId: null,
      companyId: "c-new",
      role: "design_architecture",
      creditTier: "primary",
      isLead: true,
      contributionNotes: "Original notes",
      yearFrom: 1971,
      yearTo: 1978,
      projectUrl: "https://example.com",
    });
    expect(toastMock).toHaveBeenCalledWith({ title: "Credit updated" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("a company chosen from the person box lands in the company slot (ADR 0030)", async () => {
    const user = userEvent.setup();
    mount(baseCredit({ companyId: null, company: null, personId: "p-1", person: { id: "p-1", name: "Renzo Piano", slug: "renzo-piano", avatarUrl: null } }));

    await user.click(screen.getByRole("button", { name: /mock pick company/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateBuildingCreditMock).toHaveBeenCalledTimes(1));
    expect(updateBuildingCreditMock.mock.calls[0]?.[1]).toMatchObject({
      personId: "p-1",
      companyId: "c-new",
    });
  });

  it("refuses to save a credit with neither a person nor a company", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: /mock clear company/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/choose a person and\/or a company/i)).toBeTruthy();
    expect(updateBuildingCreditMock).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range year before calling the API", async () => {
    const user = userEvent.setup();
    mount();
    await user.clear(screen.getByLabelText(/year from/i));
    await user.type(screen.getByLabelText(/year from/i), "12");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/year must be between 1000 and 2100/i)).toBeTruthy();
    expect(updateBuildingCreditMock).not.toHaveBeenCalled();
  });

  it("surfaces an API failure and keeps the drawer open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    updateBuildingCreditMock.mockRejectedValue(new Error("Credit not found or not permitted to update"));
    mount(baseCredit(), onClose);

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/not permitted to update/i)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not warn about a lead conflict with the credit being edited itself", () => {
    // The row under edit is already the lead for its role; it must not flag itself.
    mount(baseCredit({ isLead: true }));
    expect(
      screen.queryByText(/this building already has a lead credit for this role/i),
    ).not.toBeInTheDocument();
  });

  it("warns when another credit already leads the same role", () => {
    const credit = baseCredit({ isLead: true });
    const other = baseCredit({ id: "c-2", isLead: true, role: "design_architecture" });
    mount(credit, vi.fn(), [credit, other]);
    expect(
      screen.getByText(/this building already has a lead credit for this role/i),
    ).toBeInTheDocument();
  });
});

/** A credit carrying nothing in the folded half of the form. */
const bareCredit = () =>
  baseCredit({
    creditTier: "contributor",
    isLead: false,
    contributionNotes: null,
    yearFrom: null,
    yearTo: null,
    projectUrl: null,
  });

describe("EditCreditForm progressive disclosure", () => {
  beforeEach(() => {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    toastMock.mockReset();
    updateBuildingCreditMock.mockReset();
    updateBuildingCreditMock.mockImplementation(async () => baseCredit());
  });

  afterEach(() => {
    cleanup();
  });

  it("folds tier, lead, notes, years and URL away on a credit that has none of them", () => {
    mount(bareCredit());

    // Person, Company and Role stay in the open — naming an architect is the common errand.
    expect(screen.getByLabelText(/^role$/i)).toBeTruthy();
    expect(screen.queryByLabelText(/credit tier/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /lead for this role/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/contribution notes/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/year from/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/project url/i)).not.toBeInTheDocument();
  });

  it("reveals the folded fields when the disclosure is opened", async () => {
    const user = userEvent.setup();
    mount(bareCredit());

    await user.click(screen.getByRole("button", { name: /show more details/i }));

    expect(screen.getByLabelText(/credit tier/i)).toBeTruthy();
    expect(screen.getByLabelText(/year from/i)).toBeTruthy();
    expect(screen.getByLabelText(/project url/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /hide details/i })).toBeTruthy();
  });

  it("starts expanded when the credit already carries details, so nothing looks lost", () => {
    // `baseCredit` has tier primary, isLead, notes, years and a URL.
    mount();
    expect(screen.getByLabelText(/contribution notes/i)).toBeTruthy();
    expect(screen.getByLabelText(/year from/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /hide details/i })).toBeTruthy();
  });

  it("saves an untouched bare credit without ever opening the disclosure", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mount(bareCredit(), onClose);

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateBuildingCreditMock).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalled();
  });

  it("unfolds the section when a folded field fails validation", async () => {
    const user = userEvent.setup();
    updateBuildingCreditMock.mockRejectedValue(new Error("Year must be between 1000 and 2100"));
    mount(bareCredit());

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/year must be between 1000 and 2100/i)).toBeTruthy();
    expect(screen.getByLabelText(/year from/i)).toBeTruthy();
  });
});
