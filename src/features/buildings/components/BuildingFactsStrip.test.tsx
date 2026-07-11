// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BuildingFactsStrip, formatCoordinate } from "./BuildingFactsStrip";
import type { BuildingDetails } from "../pages/BuildingDetails";

const makeBuilding = (over: Partial<BuildingDetails> = {}): BuildingDetails => ({
  id: "b1",
  name: "Villa Savoye",
  location: null,
  address: null,
  city: null,
  country: null,
  year_completed: 0,
  styles: [],
  created_by: "u1",
  hero_image_id: null,
  ...over,
});

describe("formatCoordinate", () => {
  it("formats hemispheres and precision like the mock", () => {
    expect(formatCoordinate(48.92441, "lat")).toBe("48.9244° N");
    expect(formatCoordinate(-33.8568, "lat")).toBe("33.8568° S");
    expect(formatCoordinate(2.028, "lng")).toBe("2.0280° E");
    expect(formatCoordinate(-70.6483, "lng")).toBe("70.6483° W");
  });
});

describe("BuildingFactsStrip", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders one ruled cell per available fact", () => {
    render(
      <BuildingFactsStrip
        building={makeBuilding({
          city: "Poissy",
          country: "France",
          year_completed: 1931,
          typology: ["Private residence"],
          styles: [{ id: "s1", name: "International" }],
          status: "Built",
          access_level: "public",
          tier_rank: "Top 1%",
        })}
        coordinates={null}
      />,
    );

    expect(screen.getByText("Location").nextElementSibling?.textContent).toBe("Poissy, France");
    expect(screen.getByText("Year").nextElementSibling?.textContent).toBe("1931");
    expect(screen.getByText("Typology").nextElementSibling?.textContent).toBe("Private residence");
    expect(screen.getByText("Style").nextElementSibling?.textContent).toBe("International");
    expect(screen.getByText("Status").nextElementSibling?.textContent).toBe("Built · Public");
    expect(screen.getByText("Plano Rank").nextElementSibling?.textContent).toBe("Top 1%");
  });

  it("skips empty facts without leaving holes", () => {
    render(
      <BuildingFactsStrip
        building={makeBuilding({
          city: "Poissy",
          country: "France",
          year_completed: 1931,
          typology: ["Housing"],
        })}
        coordinates={null}
      />,
    );

    expect(screen.queryByText("Style")).toBeNull();
    expect(screen.queryByText("Plano Rank")).toBeNull();
    expect(screen.getByText("Typology")).toBeTruthy();
  });

  it("hides the whole strip when fewer than three facts survive", () => {
    const { container } = render(
      <BuildingFactsStrip
        building={makeBuilding({ city: "Poissy", country: "France" })}
        coordinates={null}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("falls back to mono coordinates when no year or century is known", () => {
    render(
      <BuildingFactsStrip
        building={makeBuilding({
          city: "Poissy",
          country: "France",
          typology: ["Housing"],
        })}
        coordinates={{ lat: 48.9244, lng: 2.028 }}
      />,
    );

    const label = screen.getByText("Coordinates");
    expect(label.nextElementSibling?.textContent).toContain("48.9244° N");
    expect(label.nextElementSibling?.className).toContain("meta-code");
  });
});
