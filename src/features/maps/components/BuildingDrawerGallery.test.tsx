/**
 * BuildingDrawerGallery.test.tsx
 *
 * Covers the trailing "Search images on Google" card: the drawer gallery is
 * usually one photo deep (or empty), so the last slide always offers a way out
 * to Google Images. The counter must keep reporting real photos only.
 */
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { BuildingDrawerGallery } from "./BuildingDrawerGallery";

// embla (the carousel primitive) reads matchMedia and IntersectionObserver on
// mount; jsdom provides neither.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver =
  IntersectionObserverStub as unknown as typeof IntersectionObserver;

window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

const photos = [
  { id: "a", url: "https://img.test/a.jpg" },
  { id: "b", url: "https://img.test/b.jpg" },
];

const googleLink = () => screen.getByRole("link", { name: /search images on google/i });

describe("BuildingDrawerGallery — Google Images slide", () => {
  afterEach(cleanup);

  it("links to a Google Images search for the building and city, in a new tab", () => {
    render(<BuildingDrawerGallery slides={photos} name="Tour Eiffel" city="Paris" />);

    const link = googleLink();
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/search?udm=2&q=Tour%20Eiffel%20Paris",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("still offers the card when the building has no photos", () => {
    render(<BuildingDrawerGallery slides={[]} name="Tour Eiffel" city="Paris" />);

    expect(screen.queryByText("No image")).not.toBeInTheDocument();
    expect(googleLink()).toBeInTheDocument();
  });

  it("counts photos only, not the search card", () => {
    render(<BuildingDrawerGallery slides={photos} name="Tour Eiffel" city="Paris" />);

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(googleLink()).toBeInTheDocument();
  });

  it("falls back to the empty state for an unnamed building with no photos", () => {
    render(<BuildingDrawerGallery slides={[]} name={null} />);

    expect(screen.queryByRole("link", { name: /search images on google/i })).toBeNull();
    expect(screen.getByText("No image")).toBeInTheDocument();
  });
});
