import { describe, it, expect } from "vitest";
import {
  buildCountryLead,
  dominantEra,
  formatEraLabel,
  joinCityNames,
} from "./countryLead";
import type { CountryCity, CountryEra, CountryTotals } from "../api/countryGuideApi";

function totals(overrides: Partial<CountryTotals> = {}): CountryTotals {
  return {
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
    ...overrides,
  };
}

function city(name: string, count: number): CountryCity {
  return {
    city: name,
    city_slug: name.toLowerCase(),
    buildings_count: count,
    preview_image_url: null,
    lat: null,
    lng: null,
    highlights: [],
  };
}

const era = (from: number | null, to: number | null, count: number): CountryEra => ({
  from_year: from,
  to_year: to,
  count,
});

describe("joinCityNames", () => {
  it("uses commas and a final 'and'", () => {
    expect(joinCityNames(["Madrid"])).toBe("Madrid");
    expect(joinCityNames(["Madrid", "Barcelona"])).toBe("Madrid and Barcelona");
    expect(joinCityNames(["Madrid", "Barcelona", "Valencia"])).toBe(
      "Madrid, Barcelona and Valencia",
    );
  });

  it("is empty for no names", () => {
    expect(joinCityNames([])).toBe("");
  });
});

describe("formatEraLabel", () => {
  it("labels closed, open-ended and open-start bands", () => {
    expect(formatEraLabel(era(1945, 1974, 1))).toBe("1945–1974");
    expect(formatEraLabel(era(2000, null, 1))).toBe("2000 and later");
    expect(formatEraLabel(era(null, 1899, 1))).toBe("Before 1900");
  });
});

describe("dominantEra", () => {
  it("returns the band with the most buildings", () => {
    const eras = [era(1975, 1999, 152), era(2000, null, 1215), era(1945, 1974, 36)];
    expect(dominantEra(eras)?.from_year).toBe(2000);
  });

  it("returns null when nothing is dated", () => {
    expect(dominantEra([])).toBeNull();
  });
});

describe("buildCountryLead", () => {
  it("leads with the catalogue's scale", () => {
    const [first] = buildCountryLead({ country: totals(), cities: [], eras: [] });
    expect(first).toBe(
      "Plano's catalogue of Spain runs to 2,203 buildings across 807 towns and cities.",
    );
  });

  it("names the leading cities when they genuinely dominate", () => {
    const sentences = buildCountryLead({
      country: totals({ buildings: 1000 }),
      cities: [
        city("Madrid", 300),
        city("Barcelona", 250),
        city("Valencia", 100),
        city("Bilbao", 40),
        city("Sevilla", 30),
      ],
      eras: [],
    });
    expect(sentences[1]).toBe(
      "Madrid, Barcelona and Valencia hold 65% of it between them, so a first visit plans itself.",
    );
  });

  it("omits the concentration claim when the leaders are only a small share", () => {
    const sentences = buildCountryLead({
      country: totals({ buildings: 1000 }),
      cities: [
        city("Madrid", 60),
        city("Barcelona", 50),
        city("Valencia", 40),
        city("Bilbao", 40),
        city("Sevilla", 30),
      ],
      eras: [],
    });
    expect(sentences).toHaveLength(1);
  });

  it("omits the concentration claim when there is barely a tail to concentrate against", () => {
    const sentences = buildCountryLead({
      country: totals({ buildings: 100, cities: 3 }),
      cities: [city("Valletta", 80), city("Mdina", 15), city("Sliema", 5)],
      eras: [],
    });
    expect(sentences).toHaveLength(1);
  });

  it("calls a contemporary catalogue what it is", () => {
    const sentences = buildCountryLead({
      country: totals({ dated: 1410 }),
      cities: [],
      eras: [era(1975, 1999, 152), era(2000, null, 1215)],
    });
    expect(sentences.at(-1)).toBe(
      "Expect a contemporary trip: 86% of the 1,410 dated entries were completed in 2000 or later.",
    );
  });

  it("describes a historic skew and a mid-century centre of gravity", () => {
    expect(
      buildCountryLead({
        country: totals({ dated: 100 }),
        cities: [],
        eras: [era(null, 1899, 80), era(2000, null, 20)],
      }).at(-1),
    ).toBe("It skews historic — 80% of the 100 dated entries predate 1900.");

    expect(
      buildCountryLead({
        country: totals({ dated: 100 }),
        cities: [],
        eras: [era(1945, 1974, 70), era(2000, null, 30)],
      }).at(-1),
    ).toBe(
      "Its centre of gravity sits between 1945 and 1974, which covers 70% of the 100 dated entries.",
    );
  });

  it("stays silent about eras when too little is dated to mean anything", () => {
    const sentences = buildCountryLead({
      country: totals({ dated: 5 }),
      cities: [],
      eras: [era(2000, null, 5)],
    });
    expect(sentences).toHaveLength(1);
  });

  it("says nothing at all for an unnamed or empty country", () => {
    expect(buildCountryLead({ country: totals({ name: null }), cities: [], eras: [] })).toEqual([]);
    expect(buildCountryLead({ country: totals({ buildings: 0 }), cities: [], eras: [] })).toEqual(
      [],
    );
  });

  it("keeps the singular readable for a one-city, one-building country", () => {
    const [first] = buildCountryLead({
      country: totals({ name: "Monaco", buildings: 1, cities: 1 }),
      cities: [city("Monaco", 1)],
      eras: [],
    });
    expect(first).toBe("Plano's catalogue of Monaco runs to 1 building across 1 city.");
  });
});
