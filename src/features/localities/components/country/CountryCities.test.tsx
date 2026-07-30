// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { CountryCities } from "./CountryCities";
import type { CountryCity } from "../../api/countryGuideApi";

function city(name: string, count: number, overrides: Partial<CountryCity> = {}): CountryCity {
  return {
    city: name,
    city_slug: name.toLowerCase().replace(/\s+/g, "-"),
    buildings_count: count,
    preview_image_url: null,
    lat: null,
    lng: null,
    highlights: [],
    ...overrides,
  };
}

/** 8 card cities + a tail, the shape a real country arrives in. */
function manyCities(): CountryCity[] {
  const cards = [
    city("Barcelona", 469, {
      preview_image_url: "a.jpg",
      highlights: ["Sala Beckett", "Casa Batlló"],
    }),
    city("Madrid", 316),
    city("Valencia", 120),
    city("Sevilla", 90),
    city("Bilbao", 80),
    city("Zaragoza", 70),
    city("Málaga", 60),
    city("Granada", 50),
  ];
  const tail = [city("Alicante", 9), city("Cádiz", 8), city("Toledo", 7)];
  return [...cards, ...tail];
}

function renderCities(cities: CountryCity[]) {
  return render(
    <MemoryRouter>
      <CountryCities cities={cities} countryCode="ES" />
    </MemoryRouter>,
  );
}

describe("CountryCities", () => {
  afterEach(() => {
    cleanup();
  });

  it("leads with photo cards carrying each city's own highlights", () => {
    renderCities(manyCities());

    const barcelona = screen.getByRole("link", { name: /Barcelona/ });
    expect(barcelona).toHaveAttribute("href", "/architecture/es/barcelona");
    expect(screen.getByText(/Sala Beckett · Casa Batlló/)).toBeInTheDocument();
  });

  it("renders the long tail as links rather than 800 more cards", () => {
    const { container } = renderCities(manyCities());

    // Only the 8 card cities carry imagery; the tail is text.
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.querySelectorAll(".photo-placeholder")).toHaveLength(7);

    // Every tail city is still server-rendered as a link, for internal linking.
    expect(screen.getByRole("link", { name: /Toledo/ })).toHaveAttribute(
      "href",
      "/architecture/es/toledo",
    );
  });

  it("filters the tail as you type, diacritics and all", async () => {
    const user = userEvent.setup();
    renderCities(manyCities());

    await user.type(screen.getByLabelText("Filter cities"), "cadiz");

    expect(screen.getByRole("link", { name: /Cádiz/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Toledo/ })).not.toBeInTheDocument();
    // Card cities are not part of the filtered index.
    expect(screen.getByRole("link", { name: /Barcelona/ })).toBeInTheDocument();
  });

  it("says so when a filter matches nothing", async () => {
    const user = userEvent.setup();
    renderCities(manyCities());

    await user.type(screen.getByLabelText("Filter cities"), "zzzz");

    expect(screen.getByText(/No city here matches/)).toBeInTheDocument();
  });

  it("drops the index entirely for a country with only card cities", () => {
    renderCities([city("Valletta", 30), city("Mdina", 4)]);

    expect(screen.queryByLabelText("Filter cities")).not.toBeInTheDocument();
    expect(screen.getByText("2 towns and cities, busiest first.")).toBeInTheDocument();
  });

  it("renders nothing at all without cities", () => {
    const { container } = renderCities([]);
    expect(container).toBeEmptyDOMElement();
  });
});
