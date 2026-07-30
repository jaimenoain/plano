import { describe, it, expect } from "vitest";
import { parseCountryGuide } from "./countryGuideApi";

/**
 * A trimmed copy of a real `get_country_guide('ES')` payload — same keys and
 * same types the RPC emits, so a change to either side fails here.
 */
const REAL_PAYLOAD = {
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
      preview_image_url: "uuid/uuid/recbxvcjRjIhg7rpg.webp",
      lat: 41.3952,
      lng: 2.1686,
      highlights: ["Flagship Store Mietis", "Sala Beckett"],
    },
    {
      city: "A Coruña",
      city_slug: "a-coruna",
      buildings_count: 3,
      preview_image_url: null,
      lat: null,
      lng: null,
      highlights: [],
    },
  ],
  essentials: [
    {
      id: "6e552813-ede7-4766-931b-cc214a23bb33",
      name: "Edificio Castelar",
      slug: "edificio-castelar",
      short_id: 3493,
      city: "Madrid",
      city_slug: "madrid",
      year_completed: 1983,
      image_url: "review-images/uuid/uuid/castelar.jpg",
    },
  ],
  eras: [
    { from_year: null, to_year: 1899, count: 2 },
    { from_year: 2000, to_year: null, count: 1215 },
  ],
  practices: [
    { id: "b99f9039-acbf-4b75-a67e-4d66d13d000d", name: "Rafael Moneo", slug: "rafael-moneo", buildings: 31 },
  ],
  contributors: [
    {
      user_id: "f736d09e-3292-482b-b86c-d37c25f618b9",
      username: "globetrotter_1968",
      avatar_url: "https://example.test/a.png",
      buildings_logged: 29,
      photos_uploaded: 449,
      is_ambassador: true,
    },
  ],
  collections: [
    {
      id: "c1",
      slug: "modern-spain",
      name: "Modern Spain",
      owner_username: "someone",
      owner_avatar_url: null,
      building_count: 12,
      preview_image_urls: ["a.jpg", null],
    },
  ],
};

describe("parseCountryGuide", () => {
  it("accepts a real RPC payload", () => {
    const guide = parseCountryGuide(REAL_PAYLOAD);
    expect(guide.country.name).toBe("Spain");
    expect(guide.cities).toHaveLength(2);
    expect(guide.eras[0].from_year).toBeNull();
    expect(guide.practices[0].buildings).toBe(31);
  });

  it("accepts the empty payload an unknown country code returns", () => {
    const guide = parseCountryGuide({
      country: {
        code: "ZZ",
        name: null,
        cities: 0,
        buildings: 0,
        dated: 0,
        first_year: null,
        last_year: null,
        practices: 0,
        contributors: 0,
        photos: 0,
      },
      cities: [],
      essentials: [],
      eras: [],
      practices: [],
      contributors: [],
      collections: [],
    });
    expect(guide.cities).toEqual([]);
    expect(guide.country.name).toBeNull();
  });

  it("coerces the numeric coordinates Postgres emits as strings", () => {
    // `round(lat::numeric, 4)` comes back as a JSON number, but numerics have
    // arrived as strings from PostgREST before — either must parse.
    const guide = parseCountryGuide({
      ...REAL_PAYLOAD,
      cities: [{ ...REAL_PAYLOAD.cities[0], lat: "41.3952", lng: "2.1686" }],
    });
    expect(guide.cities[0].lat).toBeCloseTo(41.3952, 4);
    expect(guide.cities[0].lng).toBeCloseTo(2.1686, 4);
  });

  it("throws when a section is missing entirely", () => {
    const { practices: _omitted, ...withoutPractices } = REAL_PAYLOAD;
    expect(() => parseCountryGuide(withoutPractices)).toThrow();
  });

  it("throws when a count arrives as something other than a number", () => {
    expect(() =>
      parseCountryGuide({
        ...REAL_PAYLOAD,
        country: { ...REAL_PAYLOAD.country, buildings: "lots" },
      }),
    ).toThrow();
  });
});
