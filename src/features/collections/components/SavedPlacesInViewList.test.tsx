/**
 * SavedPlacesInViewList.test.tsx
 *
 * The Discover view's saved-places rows. Like the catalogue rows next to them,
 * these used to cancel their own navigation and call a no-op, so a plain click
 * did nothing at all — that is what the click test below locks down.
 */
import { MemoryRouter } from "react-router";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SavedPlacesInViewList } from "./SavedPlacesInViewList";
import type { DiscoveryBuilding } from "@/features/search";

afterEach(cleanup);

const building = (id: string, name: string) =>
  ({
    id,
    name,
    location_lat: 51.5,
    location_lng: -0.1,
    slug: `b-${id}`,
    city: "London",
    country: "GB",
    credits: null,
    styles: null,
    year_completed: null,
    main_image_url: null,
  }) as DiscoveryBuilding;

const baseProps = {
  buildings: [building("1", "Barbican"), building("2", "Trellick Tower")],
  hasBounds: true,
  canEdit: true,
  onAdd: vi.fn().mockResolvedValue(undefined),
  onAddAll: vi.fn(),
  isAddingAll: false,
  onSelect: vi.fn(),
} satisfies React.ComponentProps<typeof SavedPlacesInViewList>;

const renderList = (props: Partial<React.ComponentProps<typeof SavedPlacesInViewList>> = {}) =>
  render(
    <MemoryRouter>
      <SavedPlacesInViewList {...baseProps} {...props} />
    </MemoryRouter>,
  );

describe("SavedPlacesInViewList", () => {
  it("opens the detail drawer on the clicked saved place", async () => {
    const onSelect = vi.fn();
    renderList({ onSelect });

    await userEvent.click(screen.getByText("Trellick Tower"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: "2", name: "Trellick Tower" });
  });

  it("adds without opening the drawer when the row's + is pressed", async () => {
    const onSelect = vi.fn();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderList({ onSelect, onAdd });

    await userEvent.click(screen.getByLabelText("Add Barbican to this collection"));

    expect(onAdd).toHaveBeenCalledWith({ id: "1", name: "Barbican" });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("waits for the map before promising anything", () => {
    renderList({ hasBounds: false });
    expect(screen.getByText(/Waiting for the map/i)).toBeInTheDocument();
  });
});
