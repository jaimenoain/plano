import { afterEach, describe, it, expect } from "vitest";
import { cleanup, screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { FeedActivitySummaryRow } from "@/features/posts/components/FeedActivitySummaryRow";
import type { FeedReview, ReviewBuilding } from "@/types/feed";

const building = (id: string, name: string, city: string | null = null): ReviewBuilding => ({
  id,
  slug: id,
  name,
  city,
  main_image_url: null,
  community_preview_url: null,
});

function visit(id: string, buildingName: string, city?: string): FeedReview {
  return {
    id,
    content: null,
    rating: null,
    created_at: "2026-06-29T12:00:00Z",
    edited_at: null,
    status: "visited",
    user_id: "u1",
    user: { username: "ada", avatar_url: null, followers_count: null },
    building: building(`b-${id}`, buildingName, city ?? null),
    likes_count: 0,
    comments_count: 0,
    is_liked: false,
    images: [],
    video_url: null,
  };
}

describe("FeedActivitySummaryRow", () => {
  afterEach(cleanup);

  const entries = [
    visit("a", "Villa Savoye"),
    visit("b", "Farnsworth House"),
    visit("c", "Fallingwater"),
    visit("d", "Glass House"),
    visit("e", "Barcelona Pavilion"),
  ];

  it("renders a collapsed summary with two names and the remaining count", () => {
    renderWithProviders(<FeedActivitySummaryRow entries={entries} />);
    expect(screen.getByText(/@ada visited/)).toBeInTheDocument();
    expect(screen.getByText("Villa Savoye, Farnsworth House")).toBeInTheDocument();
    expect(screen.getByText(/and 3 more/)).toBeInTheDocument();
    // Collapsed: detail rows not yet rendered.
    expect(screen.queryByTestId("feed-activity-row-c")).not.toBeInTheDocument();
  });

  it('uses the "wants to visit" verb for pending visits', () => {
    const pending = entries.map((e) => ({ ...e, status: "pending" as const }));
    renderWithProviders(<FeedActivitySummaryRow entries={pending} />);
    expect(screen.getByText(/@ada wants to visit/)).toBeInTheDocument();
  });

  it("expands to reveal a row per building when clicked", () => {
    renderWithProviders(<FeedActivitySummaryRow entries={entries} />);
    fireEvent.click(screen.getByTestId("feed-activity-summary-a"));
    expect(screen.getByTestId("feed-activity-row-a")).toBeInTheDocument();
    expect(screen.getByTestId("feed-activity-row-e")).toBeInTheDocument();
    expect(screen.getByText("Barcelona Pavilion")).toBeInTheDocument();
  });
});
