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

  it("renders the direct 'added as collaborator' notification with the collection name", () => {
    renderRow({
      type: "collection_collab_added",
      metadata: { collection_name: "Brutalist London", collection_slug: "brutalist-london" },
    });
    expect(screen.getByText("Added as collaborator")).toBeInTheDocument();
    expect(screen.getByText(/added you as an editor on/)).toBeInTheDocument();
    expect(screen.getByText("Brutalist London")).toBeInTheDocument();
  });

  it("renders a contribution_approved notification with the content type and building name", () => {
    renderRow({
      type: "contribution_approved",
      metadata: { content_type: "photo", building_name: "Barbican Centre" },
    });
    expect(screen.getByText("Contribution Approved")).toBeInTheDocument();
    expect(screen.getByText(/Your photo of/)).toBeInTheDocument();
    expect(screen.getByText("Barbican Centre")).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();
  });

  it("renders a contribution_flagged notification with the flag reason", () => {
    renderRow({
      type: "contribution_flagged",
      metadata: {
        content_type: "credit",
        building_name: "Barbican Centre",
        reason: "Incorrect role",
      },
    });
    expect(screen.getByText("Flagged for Review")).toBeInTheDocument();
    expect(screen.getByText(/Your credit for/)).toBeInTheDocument();
    expect(screen.getByText(/flagged for review/)).toBeInTheDocument();
    expect(screen.getByText("Incorrect role")).toBeInTheDocument();
  });
});
