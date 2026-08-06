// @vitest-environment happy-dom
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import * as creditsApi from "@/features/credits/api/credits";
import { AddCreditForm } from "./AddCreditForm";
import type { BuildingCreditWithEntities } from "@/features/credits/types";

const toastMock = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/features/credits/components/CreditEntityPicker", () => ({
  CreditEntityPicker: ({
    id,
    allowedKinds,
    onChange,
    disabled,
  }: {
    id?: string;
    allowedKinds?: ("person" | "company")[];
    onChange: (v: unknown) => void;
    disabled?: boolean;
  }) => {
    const isPerson = allowedKinds?.includes("person");
    return (
      <>
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => {
            if (isPerson) {
              onChange({ kind: "person", id: "p1", name: "Pat Example", slug: "pat-example" });
            } else {
              onChange({ kind: "company", id: "c1", name: "Co Example", slug: "co-example" });
            }
          }}
        >
          {isPerson ? "Mock pick person" : "Mock pick company"}
        </button>
        {/* The person box can hand back a company — architects imported into
            `companies` are offered there so nobody gets duplicated (ADR 0030). */}
        {isPerson ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange({ kind: "company", id: "c9", name: "Norman Foster", slug: "norman-foster" })
            }
          >
            Mock pick firm via person box
          </button>
        ) : null}
      </>
    );
  },
}));

const addBuildingCreditMock = vi.spyOn(creditsApi, "addBuildingCredit");
const notifyCreditedEntitiesMock = vi.spyOn(creditsApi, "notifyCreditedEntities");

const baseCredit = (over: Partial<BuildingCreditWithEntities>): BuildingCreditWithEntities => ({
  id: over.id ?? "c-existing",
  buildingId: "b1",
  personId: over.personId ?? null,
  companyId: over.companyId ?? null,
  role: over.role ?? "design_architecture",
  roleCustom: over.roleCustom ?? null,
  creditTier: over.creditTier ?? "primary",
  isLead: over.isLead ?? false,
  contributionNotes: over.contributionNotes ?? null,
  yearFrom: over.yearFrom ?? null,
  yearTo: over.yearTo ?? null,
  projectUrl: over.projectUrl ?? null,
  status: over.status ?? "active",
  flagReason: over.flagReason ?? null,
  flagNotes: over.flagNotes ?? null,
  flaggedAt: over.flaggedAt ?? null,
  flaggedFromStatus: over.flaggedFromStatus ?? null,
  flaggedByUserId: over.flaggedByUserId ?? null,
  addedByUserId: over.addedByUserId ?? null,
  displayOrder: over.displayOrder ?? 0,
  createdAt: over.createdAt ?? "2020-01-01T00:00:00Z",
  updatedAt: over.updatedAt ?? "2020-01-01T00:00:00Z",
  person: over.person ?? null,
  company: over.company ?? null,
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

describe("AddCreditForm", () => {
  beforeEach(() => {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    toastMock.mockReset();
    addBuildingCreditMock.mockReset();
    notifyCreditedEntitiesMock.mockReset();
    notifyCreditedEntitiesMock.mockResolvedValue({ ok: true });
    addBuildingCreditMock.mockImplementation(async (input) =>
      baseCredit({
        id: "new-credit",
        personId: input.personId ?? null,
        companyId: input.companyId ?? null,
        role: input.role,
        roleCustom: input.roleCustom ?? null,
        creditTier: input.creditTier ?? "contributor",
        isLead: input.isLead ?? false,
        contributionNotes: input.contributionNotes ?? null,
        yearFrom: input.yearFrom ?? null,
        yearTo: input.yearTo ?? null,
        projectUrl: input.projectUrl ?? null,
        person: input.personId ? { id: input.personId, name: "Pat Example", slug: "pat-example" } : null,
        company: input.companyId ? { id: input.companyId, name: "Co Example", slug: "co-example" } : null,
      }),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("shows validation when neither person nor company is selected", async () => {
    const user = userEvent.setup();
    wrap(
      <AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));
    expect(await screen.findByText(/choose a person and\/or a company/i)).toBeTruthy();
    expect(addBuildingCreditMock).not.toHaveBeenCalled();
  });

  it("submits one row, then hands the saved id back and gets out of the way (Task 2.2)", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    wrap(
      <AddCreditForm buildingId="b1" existingCredits={[]} onSaved={onSaved} onRequestNotify={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /mock pick person/i }));
    await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));
    await waitFor(() => {
      expect(addBuildingCreditMock).toHaveBeenCalledTimes(1);
    });
    expect(addBuildingCreditMock.mock.calls[0]?.[0]).toMatchObject({
      buildingId: "b1",
      personId: "p1",
      companyId: null,
      role: "design_architecture",
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(["new-credit"]));
    // The email step used to sit between the user and the page; it is now an
    // offer on the confirmation, not a mandatory stop.
    expect(screen.queryByRole("heading", { name: /notify credited people/i })).not.toBeInTheDocument();
  });

  it("confirms with a success toast whose action reopens the email step", async () => {
    const user = userEvent.setup();
    const onRequestNotify = vi.fn();
    wrap(
      <AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={onRequestNotify} />,
    );
    await user.click(screen.getByRole("button", { name: /mock pick person/i }));
    await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));
    await waitFor(() => expect(toastMock).toHaveBeenCalled());

    const call = toastMock.mock.calls.at(-1)?.[0] as { title?: string; action?: ReactElement };
    expect(call?.title).toBe("Credit added");
    // Rendered outside the open Sheet, which puts `pointer-events: none` on body —
    // fireEvent sidesteps the pointer check userEvent would fail on.
    render(<>{call?.action}</>);
    fireEvent.click(screen.getByRole("button", { name: /notify them/i }));
    expect(onRequestNotify).toHaveBeenCalledWith(["new-credit"]);
  });

  it("shows non-blocking lead warning when an existing credit is already lead for the same role", async () => {
    const user = userEvent.setup();
    const existing: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "lead-row",
        isLead: true,
        role: "design_architecture",
        person: { id: "p2", name: "Existing Lead", slug: "existing-lead" },
      }),
    ];
    wrap(
      <AddCreditForm buildingId="b1" existingCredits={existing} onSaved={vi.fn()} onRequestNotify={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /mock pick person/i }));
    await user.click(screen.getByRole("button", { name: /show more details/i }));
    await user.click(screen.getByRole("checkbox", { name: /lead for this role/i }));
    expect(
      screen.getByText(/this building already has a lead credit for this role/i),
    ).toBeTruthy();
  });
});

describe("AddCreditForm (QA 6.2)", () => {
  beforeEach(() => {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    toastMock.mockReset();
    addBuildingCreditMock.mockReset();
    notifyCreditedEntitiesMock.mockReset();
    notifyCreditedEntitiesMock.mockResolvedValue({ ok: true });
    addBuildingCreditMock.mockImplementation(async (input) =>
      baseCredit({
        id: "new-credit",
        personId: input.personId ?? null,
        companyId: input.companyId ?? null,
        role: input.role,
        roleCustom: input.roleCustom ?? null,
        creditTier: input.creditTier ?? "contributor",
        isLead: input.isLead ?? false,
        contributionNotes: input.contributionNotes ?? null,
        yearFrom: input.yearFrom ?? null,
        yearTo: input.yearTo ?? null,
        projectUrl: input.projectUrl ?? null,
        person: input.personId ? { id: input.personId, name: "Pat Example", slug: "pat-example" } : null,
        company: input.companyId ? { id: input.companyId, name: "Co Example", slug: "co-example" } : null,
      }),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("shows Add credits in the sheet (entry point for the form)", () => {
    wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /add credits/i })).toBeInTheDocument();
  });

  it("submits company only: company_id set, person_id null", async () => {
    const user = userEvent.setup();
    wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /mock pick company/i }));
    await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));
    await waitFor(() => expect(addBuildingCreditMock).toHaveBeenCalledTimes(1));
    expect(addBuildingCreditMock.mock.calls[0]?.[0]).toMatchObject({
      buildingId: "b1",
      personId: null,
      companyId: "c1",
    });
  });

  it("a company chosen from the person box lands in the company slot (Task 2.1)", async () => {
    const user = userEvent.setup();
    wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /mock pick firm via person box/i }));
    await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));
    await waitFor(() => expect(addBuildingCreditMock).toHaveBeenCalledTimes(1));
    expect(addBuildingCreditMock.mock.calls[0]?.[0]).toMatchObject({
      buildingId: "b1",
      personId: null,
      companyId: "c9",
    });
  });

  it("submits person and company together on one row", async () => {
    const user = userEvent.setup();
    wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /mock pick person/i }));
    await user.click(screen.getByRole("button", { name: /mock pick company/i }));
    await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));
    await waitFor(() => expect(addBuildingCreditMock).toHaveBeenCalledTimes(1));
    expect(addBuildingCreditMock.mock.calls[0]?.[0]).toMatchObject({
      personId: "p1",
      companyId: "c1",
    });
  });

  it("role Other requires description; submit sends role other and roleCustom", async () => {
    const user = userEvent.setup();
    wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />);
    await user.click(screen.getByLabelText(/^Role$/i));
    await user.click(await screen.findByRole("option", { name: /^Other$/i }));
    await user.click(screen.getByRole("button", { name: /mock pick person/i }));
    await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));
    expect(await screen.findByText(/describe the role when selecting other/i)).toBeTruthy();
    expect(addBuildingCreditMock).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/describe role/i), "Lighting artist");
    await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));
    await waitFor(() => expect(addBuildingCreditMock).toHaveBeenCalledTimes(1));
    expect(addBuildingCreditMock.mock.calls[0]?.[0]).toMatchObject({
      role: "other",
      roleCustom: "Lighting artist",
    });
  });

  it("warns when two in-form rows both mark lead for the same role", async () => {
    const user = userEvent.setup();
    wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /add another/i }));
    const pickPerson = screen.getAllByRole("button", { name: /mock pick person/i });
    await user.click(pickPerson[0]!);
    await user.click(pickPerson[1]!);
    // Each row folds its own details away — open both before reaching the checkboxes.
    const disclosures = screen.getAllByRole("button", { name: /show more details/i });
    await user.click(disclosures[0]!);
    await user.click(disclosures[1]!);
    // Row 1 already leads by default (Task 2.4); the clash starts when row 2 claims it too.
    const leadBoxes = screen.getAllByRole("checkbox", { name: /lead for this role/i });
    expect(leadBoxes[0]!).toBeChecked();
    await user.click(leadBoxes[1]!);
    const hints = screen.getAllByText(/another entry in this form is already marked lead for this role/i);
    expect(hints.length).toBe(2);
  });

  it("Add another then submit saves two credits in one batch", async () => {
    const user = userEvent.setup();
    let n = 0;
    addBuildingCreditMock.mockImplementation(async (input) => {
      n += 1;
      return baseCredit({
        id: `credit-${n}`,
        personId: input.personId ?? null,
        companyId: input.companyId ?? null,
        role: input.role,
        roleCustom: input.roleCustom ?? null,
        creditTier: input.creditTier ?? "contributor",
        isLead: input.isLead ?? false,
        contributionNotes: input.contributionNotes ?? null,
        yearFrom: input.yearFrom ?? null,
        yearTo: input.yearTo ?? null,
        projectUrl: input.projectUrl ?? null,
        person: input.personId ? { id: input.personId, name: "Pat Example", slug: "pat-example" } : null,
        company: input.companyId ? { id: input.companyId, name: "Co Example", slug: "co-example" } : null,
      });
    });

    const onSaved = vi.fn();
    wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={onSaved} onRequestNotify={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /add another/i }));
    const pickPerson = screen.getAllByRole("button", { name: /mock pick person/i });
    await user.click(pickPerson[0]!);
    await user.click(pickPerson[1]!);
    await user.click(screen.getByRole("button", { name: /submit \(2\)/i }));
    await waitFor(() => expect(addBuildingCreditMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(["credit-1", "credit-2"]));
    expect(toastMock.mock.calls.at(-1)?.[0]).toMatchObject({ title: "Credits added" });
  });

  it("first row success and second API failure keeps the drawer open, shows Saved and Error per row", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let callCount = 0;
    addBuildingCreditMock.mockImplementation(async (input) => {
      callCount += 1;
      if (callCount === 2) throw new Error("second failed");
      return baseCredit({
        id: "credit-ok",
        personId: input.personId ?? null,
        companyId: input.companyId ?? null,
        role: input.role,
        roleCustom: input.roleCustom ?? null,
        creditTier: input.creditTier ?? "contributor",
        isLead: input.isLead ?? false,
        contributionNotes: input.contributionNotes ?? null,
        yearFrom: input.yearFrom ?? null,
        yearTo: input.yearTo ?? null,
        projectUrl: input.projectUrl ?? null,
        person: input.personId ? { id: input.personId, name: "Pat Example", slug: "pat-example" } : null,
        company: input.companyId ? { id: input.companyId, name: "Co Example", slug: "co-example" } : null,
      });
    });

    wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={onClose} onRequestNotify={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /add another/i }));
    const pickPerson = screen.getAllByRole("button", { name: /mock pick person/i });
    await user.click(pickPerson[0]!);
    await user.click(pickPerson[1]!);
    await user.click(screen.getByRole("button", { name: /submit \(2\)/i }));

    await waitFor(() => expect(addBuildingCreditMock).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText(/second failed/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /add credits/i })).toBeInTheDocument();
    // A partial failure must not confirm success or close over the row that failed.
    expect(onClose).not.toHaveBeenCalled();
    expect(toastMock.mock.calls.map((c) => (c[0] as { title?: string }).title)).not.toContain("Credit added");
  });

  it("opens with only Person, Company and Role — the rest is folded away", () => {
    wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />);

    expect(screen.getByLabelText(/^role$/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /mock pick person/i })).toBeTruthy();
    expect(screen.queryByLabelText(/credit tier/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /lead for this role/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/contribution notes/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/year from/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/project url/i)).not.toBeInTheDocument();
  });

  it("reveals the folded fields when the disclosure is opened", async () => {
    const user = userEvent.setup();
    wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /show more details/i }));

    expect(screen.getByLabelText(/credit tier/i)).toBeTruthy();
    expect(screen.getByLabelText(/year from/i)).toBeTruthy();
    expect(screen.getByLabelText(/project url/i)).toBeTruthy();
  });

  it("submits a person-only credit without the disclosure ever being opened", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={onSaved} onRequestNotify={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /mock pick person/i }));
    await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));

    await waitFor(() => expect(addBuildingCreditMock).toHaveBeenCalledTimes(1));
    // The first architect on a building is its primary, lead credit without the
    // user having to say so (Task 2.4).
    expect(addBuildingCreditMock.mock.calls[0]?.[0]).toMatchObject({
      role: "design_architecture",
      creditTier: "primary",
      isLead: true,
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("unfolds a row's details when one of its folded fields fails validation", async () => {
    const user = userEvent.setup();
    wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /mock pick person/i }));
    await user.click(screen.getByRole("button", { name: /show more details/i }));
    await user.type(screen.getByLabelText(/year from/i), "12");
    // Fold it back up: the rejected year is now out of sight until submit reopens it.
    await user.click(screen.getByRole("button", { name: /hide details/i }));
    expect(screen.queryByLabelText(/year from/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));

    expect(await screen.findByText(/year must be between 1000 and 2100/i)).toBeTruthy();
    expect(screen.getByLabelText(/year from/i)).toBeTruthy();
    expect(addBuildingCreditMock).not.toHaveBeenCalled();
  });

  describe("smart defaults for tier and lead (Task 2.4)", () => {
    const existingLead = () =>
      baseCredit({ id: "c-lead", role: "design_architecture", creditTier: "primary", isLead: true });

    it("names the pre-filled tier and lead on the folded trigger", () => {
      wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />);

      expect(screen.getByRole("button", { name: /show more details/i })).toHaveTextContent(
        "Primary · Lead",
      );
      // The summary reports the values; it does not put the fields back on screen.
      expect(screen.queryByLabelText(/credit tier/i)).not.toBeInTheDocument();
    });

    it("steps a second credit for a taken role down to Contributor", async () => {
      const user = userEvent.setup();
      wrap(
        <AddCreditForm
          buildingId="b1"
          existingCredits={[existingLead()]}
          onSaved={vi.fn()}
          onRequestNotify={vi.fn()}
        />,
      );

      expect(screen.getByRole("button", { name: /show more details/i })).toHaveTextContent(
        "Contributor",
      );

      await user.click(screen.getByRole("button", { name: /mock pick person/i }));
      await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));

      await waitFor(() => expect(addBuildingCreditMock).toHaveBeenCalledTimes(1));
      expect(addBuildingCreditMock.mock.calls[0]?.[0]).toMatchObject({
        creditTier: "contributor",
        isLead: false,
      });
      // A default must never be one the form immediately argues with.
      expect(screen.queryByText(/already has a lead credit for this role/i)).not.toBeInTheDocument();
    });

    it("re-reads the defaults when the role changes", async () => {
      const user = userEvent.setup();
      wrap(
        <AddCreditForm
          buildingId="b1"
          existingCredits={[existingLead()]}
          onSaved={vi.fn()}
          onRequestNotify={vi.fn()}
        />,
      );

      await user.click(screen.getByLabelText(/^role$/i));
      await user.click(await screen.findByRole("option", { name: /structural engineering/i }));

      expect(screen.getByRole("button", { name: /show more details/i })).toHaveTextContent(
        "Primary · Lead",
      );
    });

    it("keeps a hand-set lead flag through a role change", async () => {
      const user = userEvent.setup();
      wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /show more details/i }));
      await user.click(screen.getByRole("checkbox", { name: /lead for this role/i }));
      expect(screen.getByRole("checkbox", { name: /lead for this role/i })).not.toBeChecked();

      await user.click(screen.getByLabelText(/^role$/i));
      await user.click(await screen.findByRole("option", { name: /structural engineering/i }));

      expect(screen.getByRole("checkbox", { name: /lead for this role/i })).not.toBeChecked();
    });

    it("demotes a second row that repeats the first row's role", async () => {
      const user = userEvent.setup();
      wrap(<AddCreditForm buildingId="b1" existingCredits={[]} onSaved={vi.fn()} onRequestNotify={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /add another/i }));

      const triggers = screen.getAllByRole("button", { name: /show more details/i });
      expect(triggers[0]).toHaveTextContent("Primary · Lead");
      expect(triggers[1]).toHaveTextContent("Contributor");
    });
  });
});
