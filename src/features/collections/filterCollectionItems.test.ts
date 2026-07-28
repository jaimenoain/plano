import { describe, expect, it } from "vitest";
import type { DiscoveryBuilding } from "@/features/search/components/types";
import {
  filterCollectionItems,
  filterCollectionMarkers,
  filterDiscoveryBuildings,
  isSearchActive,
} from "./filterCollectionItems";
import type { CollectionItemWithBuilding, CollectionMarker } from "./types";

function makeItem(
  overrides: Partial<CollectionItemWithBuilding> & {
    building?: Partial<CollectionItemWithBuilding["building"]>;
  } = {},
): CollectionItemWithBuilding {
  const { building, ...rest } = overrides;
  return {
    id: "item-1",
    building_id: "b-1",
    note: null,
    custom_category_id: null,
    ...rest,
    building: {
      id: "b-1",
      name: "Casa Milà",
      address: "Passeig de Gràcia 92",
      location_lat: 41.39,
      location_lng: 2.16,
      city: "Barcelona",
      country: "Spain",
      year_completed: 1912,
      hero_image_url: null,
      community_preview_url: null,
      location_precision: "exact",
      building_credits: [
        {
          credit_tier: "primary",
          status: "active",
          person: { id: "p-1", name: "Antoni Gaudí" },
          company: null,
        },
      ],
      ...building,
    },
  };
}

const marker: CollectionMarker = {
  id: "m-1",
  collection_id: "c-1",
  google_place_id: null,
  name: "Hotel Neri",
  category: "accommodation",
  lat: 41.38,
  lng: 2.17,
  address: "Carrer de Sant Sever 5",
  notes: "Breakfast until 10",
  website: null,
  created_at: "2026-01-01",
  created_by: "u-1",
};

describe("isSearchActive", () => {
  it("ignores empty and whitespace-only queries", () => {
    expect(isSearchActive("")).toBe(false);
    expect(isSearchActive("   ")).toBe(false);
    expect(isSearchActive(null)).toBe(false);
    expect(isSearchActive("g")).toBe(true);
  });
});

describe("filterCollectionItems", () => {
  const items = [
    makeItem(),
    makeItem({
      id: "item-2",
      building_id: "b-2",
      note: "Must see at sunset",
      building: {
        id: "b-2",
        name: "Lloyd's Building",
        city: "London",
        country: "United Kingdom",
        address: "1 Lime Street",
        year_completed: 1986,
        building_credits: [
          {
            credit_tier: "primary",
            status: "active",
            person: null,
            company: { id: "co-1", name: "Rogers Stirk Harbour" },
          },
        ],
      },
    }),
  ];

  it("returns everything for an empty query", () => {
    expect(filterCollectionItems(items, "")).toHaveLength(2);
    expect(filterCollectionItems(items, "   ")).toHaveLength(2);
  });

  it("matches the building name", () => {
    expect(filterCollectionItems(items, "lloyd")).toHaveLength(1);
  });

  it("matches an architect and a firm credit", () => {
    expect(filterCollectionItems(items, "gaudi")[0].building_id).toBe("b-1");
    expect(filterCollectionItems(items, "rogers")[0].building_id).toBe("b-2");
  });

  it("folds diacritics in both directions", () => {
    expect(filterCollectionItems(items, "gaudi")).toHaveLength(1);
    expect(filterCollectionItems(items, "Gaudí")).toHaveLength(1);
    expect(filterCollectionItems(items, "mila")).toHaveLength(1);
  });

  it("matches city, country, address and year", () => {
    expect(filterCollectionItems(items, "barcelona")).toHaveLength(1);
    expect(filterCollectionItems(items, "united kingdom")).toHaveLength(1);
    expect(filterCollectionItems(items, "lime street")).toHaveLength(1);
    expect(filterCollectionItems(items, "1912")).toHaveLength(1);
  });

  it("matches the member's note", () => {
    expect(filterCollectionItems(items, "sunset")[0].building_id).toBe("b-2");
  });

  it("requires every token, so extra words narrow", () => {
    expect(filterCollectionItems(items, "gaudi barcelona")).toHaveLength(1);
    expect(filterCollectionItems(items, "gaudi london")).toHaveLength(0);
  });

  it("never reintroduces entries the caller already excluded", () => {
    expect(filterCollectionItems([], "gaudi")).toHaveLength(0);
  });
});

describe("filterCollectionMarkers", () => {
  it("matches name, address, notes and category", () => {
    expect(filterCollectionMarkers([marker], "neri")).toHaveLength(1);
    expect(filterCollectionMarkers([marker], "sant sever")).toHaveLength(1);
    expect(filterCollectionMarkers([marker], "breakfast")).toHaveLength(1);
    expect(filterCollectionMarkers([marker], "accommodation")).toHaveLength(1);
    expect(filterCollectionMarkers([marker], "airport")).toHaveLength(0);
  });

  it("returns everything for an empty query", () => {
    expect(filterCollectionMarkers([marker], "")).toHaveLength(1);
  });
});

describe("filterDiscoveryBuildings", () => {
  const candidate = {
    id: "b-9",
    name: "Sagrada Família",
    location_lat: 41.4,
    location_lng: 2.17,
    city: "Barcelona",
    country: "Spain",
    year_completed: null,
    credits: [{ id: "p-1", name: "Antoni Gaudí" }],
    styles: null,
  } satisfies DiscoveryBuilding;

  it("matches name, place and credits", () => {
    expect(filterDiscoveryBuildings([candidate], "sagrada")).toHaveLength(1);
    expect(filterDiscoveryBuildings([candidate], "familia")).toHaveLength(1);
    expect(filterDiscoveryBuildings([candidate], "gaudi barcelona")).toHaveLength(1);
    expect(filterDiscoveryBuildings([candidate], "london")).toHaveLength(0);
  });

  it("tolerates null credits", () => {
    expect(filterDiscoveryBuildings([{ ...candidate, credits: null }], "sagrada")).toHaveLength(1);
  });
});
