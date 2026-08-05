// @vitest-environment happy-dom
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import * as creditsApi from "../api/credits";
import { NotifyCreditedEntitiesStep } from "./NotifyCreditedEntitiesStep";

/**
 * These cases moved here from `AddCreditForm.test.tsx` when Task 2.2 lifted the
 * email step out of the add drawer: saving now closes with a toast, and this step
 * is reopened on demand from that toast's action. The behaviour is unchanged, so
 * the assertions are the originals — only the mount differs.
 */

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const notifyCreditedEntitiesMock = vi.spyOn(creditsApi, "notifyCreditedEntities");

function wrap(ui: ReactElement) {
  return render(
    <Sheet open>
      <SheetContent side="right" className="sm:max-w-lg" aria-describedby={undefined}>
        {ui}
      </SheetContent>
    </Sheet>,
  );
}

function mount(onClose: () => void = vi.fn()) {
  return wrap(
    <NotifyCreditedEntitiesStep
      creditIds={["new-credit"]}
      buildingId="b1"
      buildingName="Centre Pompidou"
      onRequestClose={onClose}
    />,
  );
}

describe("NotifyCreditedEntitiesStep", () => {
  beforeEach(() => {
    notifyCreditedEntitiesMock.mockReset();
    notifyCreditedEntitiesMock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  it("parses three comma-separated addresses into pills under Sending to", async () => {
    const user = userEvent.setup();
    mount();
    await user.type(
      screen.getByLabelText(/^Email addresses$/i),
      "one@a.com, two@b.com, three@c.com",
    );
    expect(screen.getByText("Sending to")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove one@a\.com/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove two@b\.com/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove three@c\.com/i })).toBeInTheDocument();
  });

  it("accepts at most 15 addresses and shows truncation status for 16", async () => {
    const user = userEvent.setup();
    mount();
    const bulk = Array.from({ length: 16 }, (_, i) => `u${i}@example.com`).join(", ");
    await user.type(screen.getByLabelText(/^Email addresses$/i), bulk);
    expect(
      screen.getByText(/only the first 15 valid addresses will be used \(1 ignored\)/i),
    ).toBeInTheDocument();
    const removeBtns = screen.getAllByRole("button", { name: /^Remove u\d+@example\.com$/i });
    expect(removeBtns).toHaveLength(15);
  });

  it("shows invalid-token alert and disables Send until the draft has no invalid tokens", async () => {
    const user = userEvent.setup();
    mount();
    const ta = screen.getByLabelText(/^Email addresses$/i);
    await user.type(ta, "good@ok.com not-an-email");
    expect(await screen.findByText(/skipping invalid:\s*not-an-email/i)).toBeInTheDocument();
    const send = screen.getByRole("button", { name: /send notifications/i });
    expect(send).toBeDisabled();

    await user.clear(ta);
    await user.type(ta, "good@ok.com");
    await waitFor(() => {
      expect(screen.queryByText(/skipping invalid/i)).not.toBeInTheDocument();
    });
    expect(send).not.toBeDisabled();
    await user.click(send);
    await waitFor(() => {
      expect(notifyCreditedEntitiesMock).toHaveBeenCalledWith({
        creditIds: ["new-credit"],
        emails: ["good@ok.com"],
      });
    });
  });

  it("sends notifications with parsed emails", async () => {
    const user = userEvent.setup();
    mount();
    await user.type(screen.getByLabelText(/email addresses/i), "one@test.com, two@test.com");
    await user.click(screen.getByRole("button", { name: /send notifications/i }));

    await waitFor(() => {
      expect(notifyCreditedEntitiesMock).toHaveBeenCalledWith({
        creditIds: ["new-credit"],
        emails: ["one@test.com", "two@test.com"],
      });
    });
  });

  it("Skip closes via onRequestClose without calling notifyCreditedEntities", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mount(onClose);
    await user.click(screen.getByRole("button", { name: /^skip$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(notifyCreditedEntitiesMock).not.toHaveBeenCalled();
  });
});
