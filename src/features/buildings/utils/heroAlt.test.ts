import { describe, it, expect } from "vitest";
import { buildingHeroAlt } from "./heroAlt";

describe("buildingHeroAlt", () => {
  it("joins every known part", () => {
    expect(
      buildingHeroAlt(
        { name: "Tour Eiffel", year_completed: 1889, city: "Paris", country: "France" },
        "Gustave Eiffel",
      ),
    ).toBe("Tour Eiffel by Gustave Eiffel (1889) — Paris, France");
  });

  it("drops unknown parts instead of leaving gaps", () => {
    expect(buildingHeroAlt({ name: "Tour Eiffel", city: "Paris", country: null }, null)).toBe(
      "Tour Eiffel",
    );
  });
});
