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

  /**
   * Regression guard for the three switches in notificationContent. A type missing from
   * any of them degrades *silently* — a grey `Bell` and the copy "Notification" /
   * "New notification" — which reads as a bug in the feed rather than a missing case.
   */
  describe("weekly_digest", () => {
    const digestRow = {
      type: "weekly_digest" as const,
      actor_id: "u1",
      actor: { username: "jaime", avatar_url: null },
      metadata: {
        digest: {
          chapterName: "London",
          you: { total: 3 },
          chapter: { total: 9, activeMembers: 2 },
          tasks: { total: 12, capped: false },
        },
      },
    };

    it("uses the calendar icon rather than falling through to the bell", () => {
      const { container } = renderRow(digestRow);
      expect(container.querySelector("svg.lucide-calendar-days")).not.toBeNull();
      expect(container.querySelector("svg.lucide-bell")).toBeNull();
    });

    it("titles and summarises the digest", () => {
      renderRow(digestRow);
      expect(screen.getByText("Your Week in Review")).toBeInTheDocument();
      expect(
        screen.getByText(/3 contributions from you in London this week/),
      ).toBeInTheDocument();
      expect(screen.getByText(/12 tasks waiting/)).toBeInTheDocument();
    });

    /** The digest is self-actored, so the recipient must never be addressed by name. */
    it("never renders the actor's username", () => {
      renderRow(digestRow);
      expect(screen.queryByText(/jaime/)).toBeNull();
    });
  });

  /** Same three-switch guard for the milestone type (roadmap 3.3). */
  describe("milestone_earned", () => {
    const milestoneRow = {
      type: "milestone_earned" as const,
      actor_id: "u1",
      actor: { username: "jaime", avatar_url: null },
      metadata: { milestone_key: "photos_10", milestone_label: "10 photos" },
    };

    it("uses the award icon rather than falling through to the bell", () => {
      const { container } = renderRow(milestoneRow);
      expect(container.querySelector("svg.lucide-award")).not.toBeNull();
      expect(container.querySelector("svg.lucide-bell")).toBeNull();
    });

    it("titles the notification and names the milestone", () => {
      renderRow(milestoneRow);
      expect(screen.getByText("Milestone Reached")).toBeInTheDocument();
      expect(screen.getByText(/You reached/)).toBeInTheDocument();
      expect(screen.getByText("10 photos")).toBeInTheDocument();
    });

    /** Self-actored like the digest — never address the recipient by their own username. */
    it("never renders the actor's username", () => {
      renderRow(milestoneRow);
      expect(screen.queryByText(/jaime/)).toBeNull();
    });
  });
});
