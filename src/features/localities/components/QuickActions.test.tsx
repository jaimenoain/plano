import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { QuickActions } from "./QuickActions";

describe("QuickActions", () => {
  afterEach(() => {
    cleanup();
  });

  it("sends 'Explore map' to the pre-centred search map", () => {
    render(
      <MemoryRouter>
        <QuickActions
          city="London"
          exploreMapHref="/search?lat=51.515&lng=-0.1252&zoom=12"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /explore map/i })).toHaveAttribute(
      "href",
      "/search?lat=51.515&lng=-0.1252&zoom=12",
    );
  });

  it("still offers the itinerary and add-building actions", () => {
    render(
      <MemoryRouter>
        <QuickActions city="São Paulo" exploreMapHref="/search?q=S%C3%A3o%20Paulo" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /create itinerary/i })).toHaveAttribute(
      "href",
      "/collections",
    );
    expect(screen.getByRole("link", { name: /add a building/i })).toHaveAttribute(
      "href",
      "/buildings/new?city=S%C3%A3o%20Paulo",
    );
  });
});
