import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { MilestoneShelf } from "./MilestoneShelf";
import type { Milestone } from "../api/milestones";

const useMilestones = vi.fn();
vi.mock("../hooks/useMilestones", () => ({
  useMilestones: () => useMilestones(),
}));

function milestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    key: "photos_10",
    label: "10 photos",
    description: "Ten photos added to buildings.",
    target: 10,
    progress: 0,
    earnedAt: null,
    ...overrides,
  };
}

// vitest runs without `globals`, so RTL's auto-cleanup afterEach never registers.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MilestoneShelf", () => {
  it("renders nothing until the milestones arrive", () => {
    useMilestones.mockReturnValue({ data: undefined });
    const { container } = renderWithProviders(<MilestoneShelf />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows when an earned milestone was earned, without a progress count", () => {
    useMilestones.mockReturnValue({
      data: [
        milestone({
          key: "first_contribution",
          label: "First contribution",
          target: 1,
          progress: 1,
          earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ],
    });
    renderWithProviders(<MilestoneShelf />);
    expect(screen.getByText("First contribution")).toBeInTheDocument();
    expect(screen.getByText(/Earned 2 days ago/)).toBeInTheDocument();
    expect(screen.queryByText("1 / 1")).toBeNull();
  });

  it("shows progress toward an unearned milestone", () => {
    useMilestones.mockReturnValue({
      data: [milestone({ progress: 3 })],
    });
    renderWithProviders(<MilestoneShelf />);
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
    expect(screen.getByText("0 of 1 earned")).toBeInTheDocument();
  });

  /** Defensive: reaching the target normally flips the card to its earned branch, but if
      a count ever outran the award the bar must not read "12 / 10". */
  it("clamps progress that has run past the target", () => {
    useMilestones.mockReturnValue({
      data: [milestone({ progress: 12 })],
    });
    renderWithProviders(<MilestoneShelf />);
    expect(screen.getByText("10 / 10")).toBeInTheDocument();
  });
});
