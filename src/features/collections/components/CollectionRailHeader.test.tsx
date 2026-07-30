import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { CollectionRailHeader } from "./CollectionRailHeader";
import type { Collection } from "../types";

const mutate = vi.fn();

vi.mock("../hooks/useCollectionCollaboration", () => ({
  useMyCollaborationRequest: () => ({ data: null }),
  useRequestCollaboration: () => ({ mutate, isPending: false }),
}));

const collection: Collection = {
  id: "col-1",
  name: "Brutalist Madrid",
  description: "A walk through the concrete years.",
  owner_id: "owner-1",
  is_public: true,
  external_link: null,
  slug: "brutalist-madrid",
  show_community_images: true,
  show_added_by: false,
  categorization_method: "default",
  custom_categories: null,
  categorization_selected_members: null,
  itinerary: null,
};

const baseProps = {
  collection,
  ownerUsername: "jaime",
  coverMosaicUrls: [],
  canEdit: false,
  isLoggedIn: true,
  isFavorite: false,
  onToggleFavorite: vi.fn(),
};

beforeEach(() => {
  mutate.mockClear();
});
afterEach(cleanup);

describe("CollectionRailHeader", () => {
  it("gives a visitor both a labelled favourite and a collaborate action", () => {
    renderWithProviders(<CollectionRailHeader {...baseProps} />);

    expect(screen.getByRole("button", { name: /add to favourites/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request to collaborate/i })).toBeInTheDocument();
  });

  it("keeps the title readable instead of truncating it against the actions", () => {
    const longName =
      "The Definitive Guide to Post-War Concrete Housing Estates of Greater Madrid and Beyond";
    renderWithProviders(
      <CollectionRailHeader {...baseProps} collection={{ ...collection, name: longName }} />,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(longName);
    // `truncate` is what crushed the name to a stub inside the narrow rail.
    expect(heading.className).not.toContain("truncate");
    expect(heading.className).toContain("wrap-break-word");
  });

  it("marks the favourite as the primary action and the request as secondary", () => {
    renderWithProviders(<CollectionRailHeader {...baseProps} />);

    const favourite = screen.getByRole("button", { name: /add to favourites/i });
    const collaborate = screen.getByRole("button", { name: /request to collaborate/i });
    expect(favourite.className).toContain("bg-brand-primary");
    expect(collaborate.className).toContain("border-border-default");
  });

  it("reflects the favourited state without borrowing a feedback colour", () => {
    const { container } = renderWithProviders(<CollectionRailHeader {...baseProps} isFavorite />);

    expect(screen.getByRole("button", { name: /remove from favourites/i })).toHaveTextContent(
      "Favourited",
    );
    expect(container.innerHTML).not.toContain("feedback-warning");
  });

  it("offers an editor no relationship actions — there is none to form with their own collection", () => {
    renderWithProviders(<CollectionRailHeader {...baseProps} canEdit />);

    expect(screen.queryByRole("button", { name: /favourite/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /collaborate/i })).toBeNull();
  });

  it("leaves the edit controls to the pinned toolbar rather than the masthead", () => {
    renderWithProviders(<CollectionRailHeader {...baseProps} canEdit />);

    // They live in `CollectionRailToolbar` now, so they survive scrolling.
    expect(screen.queryByRole("button", { name: "Add buildings" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Collection settings" })).toBeNull();
  });

  it("still offers the favourite to a logged-out viewer, routed through login", () => {
    renderWithProviders(<CollectionRailHeader {...baseProps} isLoggedIn={false} />, {
      initialRoute: "/jaime/map/brutalist-madrid",
    });

    const favourite = screen.getByRole("link", { name: /add to favourites/i });
    expect(favourite).toHaveAttribute(
      "href",
      "/login?redirect=%2Fjaime%2Fmap%2Fbrutalist-madrid",
    );
    expect(screen.getByRole("link", { name: /log in to collaborate/i })).toBeInTheDocument();
  });

  it("groups the external link with the other actions", () => {
    renderWithProviders(
      <CollectionRailHeader
        {...baseProps}
        collection={{ ...collection, external_link: "https://example.com/guide" }}
      />,
    );

    const link = screen.getByRole("link", { name: /visit link/i });
    expect(link).toHaveAttribute("href", "https://example.com/guide");
    expect(link.closest("div")).toBe(
      screen.getByRole("button", { name: /add to favourites/i }).closest("div"),
    );
  });
});
