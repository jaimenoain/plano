// @vitest-environment happy-dom
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import * as creditsApi from "@/features/credits/api/credits";
import { AddCreditForm } from "./AddCreditForm";
import type { BuildingCreditWithEntities } from "@/features/credits/types";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
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
  role: over.role ?? "design_architect",
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
      <AddCreditForm buildingId="b1" existingCredits={[]} onRequestClose={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));
    expect(await screen.findByText(/choose a person and\/or a company/i)).toBeTruthy();
    expect(addBuildingCreditMock).not.toHaveBeenCalled();
  });

  it("submits one row and advances to the notification step", async () => {
    const user = userEvent.setup();
    wrap(
      <AddCreditForm buildingId="b1" existingCredits={[]} onRequestClose={vi.fn()} />,
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
      role: "design_architect",
    });
    expect(await screen.findByRole("heading", { name: /notify credited people/i })).toBeTruthy();
  });

  it("sends notifications with parsed emails on the notify step", async () => {
    const user = userEvent.setup();
    wrap(
      <AddCreditForm buildingId="b1" existingCredits={[]} onRequestClose={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /mock pick person/i }));
    await user.click(screen.getByRole("button", { name: /submit \(1\)/i }));
    await screen.findByRole("heading", { name: /notify credited people/i });

    await user.type(screen.getByLabelText(/email addresses/i), "one@test.com, two@test.com");
    await user.click(screen.getByRole("button", { name: /send notifications/i }));

    await waitFor(() => {
      expect(notifyCreditedEntitiesMock).toHaveBeenCalledWith({
        creditIds: ["new-credit"],
        emails: ["one@test.com", "two@test.com"],
      });
    });
  });

  it("shows non-blocking lead warning when an existing credit is already lead for the same role", async () => {
    const user = userEvent.setup();
    const existing: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "lead-row",
        isLead: true,
        role: "design_architect",
        person: { id: "p2", name: "Existing Lead", slug: "existing-lead" },
      }),
    ];
    wrap(
      <AddCreditForm buildingId="b1" existingCredits={existing} onRequestClose={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /mock pick person/i }));
    await user.click(screen.getByRole("checkbox", { name: /lead for this role/i }));
    expect(
      screen.getByText(/this building already has a lead credit for this role/i),
    ).toBeTruthy();
  });
});
