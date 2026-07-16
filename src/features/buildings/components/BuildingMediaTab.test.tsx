// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { BuildingMediaTab } from "./BuildingMediaTab";
import type { DisplayImage } from "../hooks/useBuildingInteractions";

// Mock IntersectionObserver. Must be a real constructor so `new
// IntersectionObserver(...)` works under Vitest v4 (an arrow-function
// mockImplementation is not construct-callable there).
window.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
  this.observe = () => null;
  this.unobserve = () => null;
  this.disconnect = () => null;
}) as unknown as typeof IntersectionObserver;

const IMAGES: DisplayImage[] = [
  {
    id: "img-1",
    url: "http://img/one.jpg",
    likes_count: 7,
    created_at: "2026-01-01",
    user: { username: "annalaurent", avatar_url: null },
    caption: "West elevation at dusk",
  },
  {
    id: "img-2",
    url: "http://img/two.jpg",
    likes_count: 0,
    created_at: "2026-01-02",
    user: null,
  },
  {
    id: "img-3",
    url: "http://img/three.jpg",
    likes_count: 0,
    created_at: "2026-01-03",
    user: { username: "berndt", avatar_url: null },
  },
  {
    id: "vid-1",
    url: "http://img/clip.mp4",
    poster: "http://img/poster.jpg",
    type: "video",
    likes_count: 1,
    created_at: "2026-01-04",
    user: { username: "annalaurent", avatar_url: null },
  },
];

/** Exposes the live URL so assertions can check search-param mechanics. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderTab({
  initialEntry = "/?tab=media",
  images = IMAGES,
  onSelectImage = vi.fn(),
  onUploadPhoto = vi.fn(),
}: {
  initialEntry?: string;
  images?: DisplayImage[];
  onSelectImage?: (img: DisplayImage) => void;
  onUploadPhoto?: () => void;
} = {}) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <BuildingMediaTab
        images={images}
        buildingId="b1"
        onSelectImage={onSelectImage}
        onUploadPhoto={onUploadPhoto}
        onWriteNote={vi.fn()}
      />
      <LocationProbe />
    </MemoryRouter>,
  );
  return { onSelectImage, onUploadPhoto };
}

const search = () => screen.getByTestId("location").textContent;

afterEach(() => {
  cleanup();
});

describe("BuildingMediaTab view switcher", () => {
  it("renders the masonry view by default with all items", () => {
    renderTab();
    const container = screen.getByTestId("media-view-masonry");
    // 3 photos + 1 video tile
    expect(container.querySelectorAll("img").length).toBe(4);
    expect(search()).toBe("?tab=media");
  });

  it("switches to the feed view and preserves the tab param in the URL", () => {
    renderTab();
    fireEvent.click(screen.getByRole("radio", { name: "Feed view" }));
    expect(screen.getByTestId("media-view-feed")).toBeTruthy();
    expect(search()).toBe("?tab=media&view=feed");
  });

  it("deletes the view param when returning to masonry", () => {
    renderTab({ initialEntry: "/?tab=media&view=feed" });
    fireEvent.click(screen.getByRole("radio", { name: "Masonry view" }));
    expect(screen.getByTestId("media-view-masonry")).toBeTruthy();
    expect(search()).toBe("?tab=media");
  });

  it("renders the grid view from the URL param", () => {
    renderTab({ initialEntry: "/?tab=media&view=grid" });
    const container = screen.getByTestId("media-view-grid");
    expect(container.querySelectorAll("img").length).toBe(4);
  });

  it("falls back to masonry for unknown view values", () => {
    renderTab({ initialEntry: "/?tab=media&view=bogus" });
    expect(screen.getByTestId("media-view-masonry")).toBeTruthy();
  });

  it("shows byline, likes and caption in the feed view — and no byline without a user", () => {
    renderTab({ initialEntry: "/?tab=media&view=feed" });
    expect(screen.getAllByText("annalaurent").length).toBe(2); // photo + video bylines
    expect(screen.getByText("West elevation at dusk")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    // img-2 has user: null and no caption — its figure has no figcaption.
    const feed = screen.getByTestId("media-view-feed");
    const bareFigure = Array.from(feed.querySelectorAll("figure")).find((f) =>
      f.querySelector('img[src="http://img/two.jpg"]'),
    );
    expect(bareFigure?.querySelector("figcaption")).toBeNull();
  });

  it("opens the lightbox from every view", () => {
    for (const entry of ["/?tab=media", "/?tab=media&view=feed", "/?tab=media&view=grid"]) {
      const onSelectImage = vi.fn();
      renderTab({ initialEntry: entry, onSelectImage });
      fireEvent.click(screen.getByTestId(/media-view-/).querySelector("img")!.parentElement!);
      expect(onSelectImage).toHaveBeenCalledTimes(1);
      cleanup();
    }
  });

  it("keeps the videos filter working while a non-default view is active", () => {
    renderTab({ initialEntry: "/?tab=media&view=feed" });
    fireEvent.click(screen.getByRole("button", { name: /videos/i }));
    const feed = screen.getByTestId("media-view-feed");
    // Only the video poster remains.
    expect(feed.querySelectorAll("img").length).toBe(1);
    expect(feed.querySelector('img[src="http://img/poster.jpg"]')).toBeTruthy();
    expect(search()).toBe("?tab=media&view=feed");
  });

  it("shows the empty state regardless of view", () => {
    const { onUploadPhoto } = renderTab({ initialEntry: "/?tab=media&view=grid", images: [] });
    expect(screen.getByText("No photos yet")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Upload photo" }));
    expect(onUploadPhoto).toHaveBeenCalled();
  });
});
