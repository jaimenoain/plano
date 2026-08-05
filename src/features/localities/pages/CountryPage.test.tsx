// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import CountryPage from "./CountryPage";
import type { CountryPageLoaderData } from "./CountryPage.loader";
import type { CountryGuide } from "../api/countryGuideApi";

const mocks = vi.hoisted(() => ({
  loaderData: { current: null as unknown as CountryPageLoaderData },
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useLoaderData: () => mocks.loaderData.current };
});

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

// The map is lazy + client-only; its MapLibre bundle has no place in a unit test.
vi.mock("@/components/common/ClientOnly", () => ({
  ClientOnly: ({ fallback }: { fallback: React.ReactNode }) => <>{fallback}</>,
}));

function guide(overrides: Partial<CountryGuide> = {}): CountryGuide {
  return {
    country: {
      code: "ES",
      name: "Spain",
      cities: 807,
      buildings: 2203,
      dated: 1410,
      first_year: 987,
      last_year: 2025,
      practices: 1113,
      contributors: 4,
      photos: 1828,
    },
    cities: [
      {
        city: "Barcelona",
        city_slug: "barcelona",
        buildings_count: 469,
        preview_image_url: "barcelona.jpg",
        lat: 41.3952,
        lng: 2.1686,
        highlights: ["Sala Beckett"],
      },
      {
        city: "Madrid",
        city_slug: "madrid",
        buildings_count: 316,
        preview_image_url: null,
        lat: 40.4196,
        lng: -3.6979,
        highlights: [],
      },
    ],
    essentials: [
      {
        id: "b1",
        name: "Edificio Castelar",
        slug: "edificio-castelar",
        short_id: 3493,
        city: "Madrid",
        city_slug: "madrid",
        year_completed: 1983,
        image_url: "castelar.jpg",
      },
      {
        id: "b2",
        name: "Sede de Osakidetza",
        slug: "osakidetza",
        short_id: 2049,
        city: "Bilbao",
        city_slug: "bilbao",
        year_completed: 2008,
        image_url: "osakidetza.jpg",
      },
    ],
    eras: [
      { from_year: null, to_year: 1899, count: 2 },
      { from_year: 1975, to_year: 1999, count: 152 },
      { from_year: 2000, to_year: null, count: 1215 },
    ],
    practices: [{ id: "c1", name: "Rafael Moneo", slug: "rafael-moneo", buildings: 31 }],
    contributors: [
      {
        user_id: "u1",
        username: "globetrotter_1968",
        avatar_url: null,
        buildings_logged: 29,
        photos_uploaded: 449,
        is_ambassador: true,
      },
    ],
    collections: [],
    ...overrides,
  };
}

function loaderData(g: CountryGuide = guide()): CountryPageLoaderData {
  return {
    guide: g,
    countryName: g.country.name ?? "ES",
    countryCode: "ES",
    totalBuildings: g.country.buildings,
    canonical: "https://plano.test/architecture/es",
    metaTitle: "Architecture in Spain",
    metaDescription: "…",
    ogImage: "https://plano.test/cover.jpg",
    structuredData: {},
  };
}

function renderPage(data: CountryPageLoaderData = loaderData()) {
  mocks.loaderData.current = data;
  return render(
    <MemoryRouter>
      <CountryPage />
    </MemoryRouter>,
  );
}

describe("CountryPage", () => {
  beforeEach(() => {
    mocks.loaderData.current = loaderData();
  });
  afterEach(() => {
    cleanup();
  });

  it("leads with the country, its continent and a photo credit", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Spain" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Europe" })).toHaveAttribute("href", "/guides");
    // The hero photo is credited to the building it belongs to.
    expect(
      screen.getByRole("link", { name: "Edificio Castelar, Madrid" }),
    ).toHaveAttribute("href", "/architecture/es/madrid/3493/edificio-castelar");
  });

  it("orients a visitor with a lead derived from the catalogue", () => {
    renderPage();

    expect(
      screen.getByText(/Plano's catalogue of Spain runs to 2,203 buildings across 807 towns/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Expect a contemporary trip/)).toBeInTheDocument();
  });

  it("renders every guide section for a well-stocked country", () => {
    renderPage();

    for (const label of [
      "Start here",
      "Where to go",
      "When it was built",
      "Architects to know",
      "On the map",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("Who knows Spain")).toBeInTheDocument();
  });

  it("does not repeat the hero photograph in Start here", () => {
    renderPage();

    // The lead building appears once as the hero credit, not again as a card.
    expect(screen.getAllByRole("link", { name: /Edificio Castelar/ })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Sede de Osakidetza/ })).toBeInTheDocument();
  });

  it("points the map action at the search map, framed on the country", () => {
    renderPage();

    const explore = screen.getByRole("link", { name: /Explore the map/ });
    const href = explore.getAttribute("href") ?? "";
    expect(href.startsWith("/map?")).toBe(true);
    expect(new URLSearchParams(href.split("?")[1]).get("zoom")).toBe("6");
  });

  it("hides the sections a thin country has no data for", () => {
    renderPage(
      loaderData(
        guide({
          country: { ...guide().country, name: "Malta", cities: 1, buildings: 2, dated: 1, practices: 0 },
          cities: [
            {
              city: "Valletta",
              city_slug: "valletta",
              buildings_count: 2,
              preview_image_url: null,
              lat: null,
              lng: null,
              highlights: [],
            },
          ],
          eras: [{ from_year: 2000, to_year: null, count: 1 }],
          practices: [],
          contributors: [],
          collections: [],
        }),
      ),
    );

    expect(screen.getByText("Where to go")).toBeInTheDocument();
    // Not enough dated work, no credits, no contributors, no located city.
    expect(screen.queryByText("When it was built")).not.toBeInTheDocument();
    expect(screen.queryByText("Architects to know")).not.toBeInTheDocument();
    expect(screen.queryByText(/Who knows/)).not.toBeInTheDocument();
    expect(screen.queryByText("On the map")).not.toBeInTheDocument();
  });
});
