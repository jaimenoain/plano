import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { NotificationRow } from "./NotificationRow";
import type { Notification } from "../types";

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    created_at: new Date("2026-07-01T00:00:00.000Z").toISOString(),
    type: "like",
    is_read: false,
    actor_id: "u2",
    actor: { username: "hana", avatar_url: null },
    ...overrides,
  };
}

function renderRow(overrides: Partial<Notification> = {}) {
  return render(
    <MemoryRouter>
      <NotificationRow notification={notification(overrides)} onSelect={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("NotificationRow", () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Regression guard. The dot was written as `bg-brand-primary` back when that token
   * resolved to lime; the brand redesign flipped it to near-black and the dot went dark
   * without anyone noticing. The kit's `.nt-unread` is `--brand-accent`, and the unread
   * dot is one of the four sanctioned lime uses.
   */
  it("marks an unread row with the lime accent dot, not the black primary", () => {
    renderRow({ is_read: false });
    const dot = screen.getByTestId("notification-unread-dot");
    expect(dot.className).toContain("bg-brand-accent");
    expect(dot.className).not.toContain("bg-brand-primary");
  });

  it("draws the dot as a 6px sharp square", () => {
    renderRow({ is_read: false });
    const dot = screen.getByTestId("notification-unread-dot");
    expect(dot.className).toContain("h-1.5");
    expect(dot.className).toContain("w-1.5");
    expect(dot.className).not.toMatch(/rounded/);
  });

  it("renders no dot once the row is read", () => {
    renderRow({ is_read: true });
    expect(screen.queryByTestId("notification-unread-dot")).toBeNull();
  });

  it("never tints the row itself — the dot is the sole unread signal", () => {
    const { container } = renderRow({ is_read: false });
    const row = container.querySelector('[role="button"]')!;
    expect(row.className).toContain("hover:bg-surface-muted");
    expect(row.className).not.toContain("bg-brand-secondary");
  });

  it("keeps the award trophy monochrome rather than raw amber", () => {
    const { container } = renderRow({ type: "award_win" });
    const icon = container.querySelector("svg.lucide-trophy");
    expect(icon).not.toBeNull();
    expect(icon!.getAttribute("class")).toContain("text-text-secondary");
    expect(icon!.getAttribute("class")).not.toContain("amber");
  });

  it("titles and describes the notification from its type", () => {
    renderRow({ type: "follow" });
    expect(screen.getByText("New Follower")).toBeInTheDocument();
    expect(screen.getByText(/started following you/)).toBeInTheDocument();
  });
});
