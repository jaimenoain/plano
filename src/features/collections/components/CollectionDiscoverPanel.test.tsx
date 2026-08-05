import { createRef } from "react";
import { MemoryRouter } from "react-router";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionDiscoverPanel } from "./CollectionDiscoverPanel";
import type { CollectionDiscoverInView } from "../hooks/useCollectionDiscoverInView";

const { useDiscoverMock } = vi.hoisted(() => ({ useDiscoverMock: vi.fn() }));

vi.mock("../hooks/useCollectionDiscoverInView", () => ({
  useCollectionDiscoverInView: useDiscoverMock,
}));

// jsdom has no IntersectionObserver and the shared test setup stubs only
// ResizeObserver/WebSocket, so the real sentinel would throw on construction.
vi.mock("@/features/maps/hooks/useInfiniteScrollSentinel", () => ({
  useInfiniteScrollSentinel: () => ({ targetRef: createRef(), rootRef: createRef() }),
}));

afterEach(cleanup);

const row = (id: string, name: string) => ({
  id,
  name,
  alt_name: null,
  city: "London",
  credit_names: ["Zaha Hadid"],
  image_url: null,
  rating: 0,
  status: null,
  construction_status: null,
  slug: `b-${id}`,
  short_id: Number(id),
  locality_country_code: "GB",
  locality_city_slug: "london",
  lat: 51.5,
  lng: -0.1,
});

const hookState = (overrides: Partial<CollectionDiscoverInView> = {}): CollectionDiscoverInView => ({
  buildings: [],
  isTooWide: false,
  isLoading: false,
  isError: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  isFetching: false,
  fetchNextPage: vi.fn(),
  pageCount: 1,
  addBuilding: vi.fn(),
  addingId: null,
  ...overrides,
});

const baseProps = {
  collectionId: "collection-1",
  bounds: { north: 51.6, south: 51.4, east: 0.1, west: -0.2 },
  excludeBuildingIds: new Set<string>(),
  scrollRootRef: createRef<HTMLDivElement>(),
  onSelect: vi.fn(),
} satisfies React.ComponentProps<typeof CollectionDiscoverPanel>;

const renderPanel = (props: Partial<React.ComponentProps<typeof CollectionDiscoverPanel>> = {}) =>
  render(
    <MemoryRouter>
      <CollectionDiscoverPanel {...baseProps} {...props} />
    </MemoryRouter>,
  );

describe("CollectionDiscoverPanel", () => {
  beforeEach(() => {
    useDiscoverMock.mockReset();
    useDiscoverMock.mockReturnValue(hookState());
  });

  it("lists what is in view, each addable by name", () => {
    useDiscoverMock.mockReturnValue(
      hookState({ buildings: [row("1", "Serpentine Pavilion"), row("2", "Barbican")] }),
    );
    renderPanel();

    expect(screen.getByText("Serpentine Pavilion")).toBeInTheDocument();
    expect(screen.getByText("Barbican")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Add Serpentine Pavilion to this collection"),
    ).toBeInTheDocument();
  });

  it("adds the building whose button was pressed", async () => {
    const addBuilding = vi.fn();
    useDiscoverMock.mockReturnValue(
      hookState({ buildings: [row("1", "Serpentine Pavilion"), row("2", "Barbican")], addBuilding }),
    );
    renderPanel();

    await userEvent.click(screen.getByLabelText("Add Barbican to this collection"));

    expect(addBuilding).toHaveBeenCalledWith({ id: "2", name: "Barbican" });
  });

  // These rows once cancelled their own navigation and called a no-op handler,
  // so a plain click did nothing whatsoever.
  it("opens the detail drawer on the clicked building", async () => {
    const onSelect = vi.fn();
    useDiscoverMock.mockReturnValue(
      hookState({ buildings: [row("1", "Serpentine Pavilion"), row("2", "Barbican")] }),
    );
    renderPanel({ onSelect });

    await userEvent.click(screen.getByText("Barbican"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: "2", name: "Barbican" });
  });

  it("adds without opening the drawer when the row's + is pressed", async () => {
    const onSelect = vi.fn();
    const addBuilding = vi.fn();
    useDiscoverMock.mockReturnValue(
      hookState({ buildings: [row("2", "Barbican")], addBuilding }),
    );
    renderPanel({ onSelect });

    await userEvent.click(screen.getByLabelText("Add Barbican to this collection"));

    expect(addBuilding).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("spins the row being added and locks the rest", () => {
    useDiscoverMock.mockReturnValue(
      hookState({
        buildings: [row("1", "Serpentine Pavilion"), row("2", "Barbican")],
        addingId: "2",
      }),
    );
    renderPanel();

    expect(screen.getByLabelText("Add Barbican to this collection")).toBeDisabled();
    expect(screen.getByLabelText("Add Serpentine Pavilion to this collection")).toBeDisabled();
  });

  it("waits for the map before promising anything", () => {
    renderPanel({ bounds: null });
    expect(screen.getByText(/Waiting for the map/i)).toBeInTheDocument();
  });

  it("asks for a zoom rather than answering with noise", () => {
    useDiscoverMock.mockReturnValue(hookState({ isTooWide: true }));
    renderPanel();
    expect(screen.getByText(/Zoom in to discover/i)).toBeInTheDocument();
  });

  it("owns up to a failed fetch", () => {
    useDiscoverMock.mockReturnValue(hookState({ isError: true }));
    renderPanel();
    expect(screen.getByText(/Couldn’t load this view/i)).toBeInTheDocument();
  });

  it("shows skeletons rather than an empty state while page 1 loads", () => {
    useDiscoverMock.mockReturnValue(hookState({ isLoading: true }));
    renderPanel();
    expect(screen.queryByText(/Nothing left to add here/i)).not.toBeInTheDocument();
  });

  it("explains an empty view", () => {
    useDiscoverMock.mockReturnValue(hookState({ buildings: [] }));
    renderPanel();
    expect(screen.getByText(/Nothing left to add here/i)).toBeInTheDocument();
  });

  it("marks the end of the view only once there is no more to fetch", () => {
    useDiscoverMock.mockReturnValue(
      hookState({ buildings: [row("1", "Serpentine Pavilion")], hasNextPage: true }),
    );
    const { unmount } = renderPanel();
    expect(screen.queryByText("End of this view.")).not.toBeInTheDocument();
    unmount();

    useDiscoverMock.mockReturnValue(
      hookState({ buildings: [row("1", "Serpentine Pavilion")], hasNextPage: false }),
    );
    renderPanel();
    expect(screen.getByText("End of this view.")).toBeInTheDocument();
  });
});
