// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BuildingFactsStrip, buildFacts } from "./BuildingFactsStrip";
import type { BuildingDetails } from "../pages/BuildingDetails";

const makeBuilding = (over: Partial<BuildingDetails> = {}): BuildingDetails => ({
  id: "b1",
  name: "Villa Savoye",
  location: null,
  address: null,
  city: "Poissy",
  country: "France",
  year_completed: 1931,
  styles: [],
  created_by: "u1",
  hero_image_id: null,
  ...over,
});

const richBuilding = () =>
  makeBuilding({
    location: { type: "Point", coordinates: [2.028, 48.9244] },
    typology: ["Private residence"],
    styles: [{ id: "s1", name: "International" }],
  });

afterEach(cleanup);

describe("buildFacts", () => {
  it("orders location, coordinates, typology, style and year", () => {
    expect(buildFacts(richBuilding()).map((f) => f.label)).toEqual([
      "Location",
      "Coordinates",
      "Typology",
      "Style",
      "Year",
    ]);
  });

  it("omits a Status fact for standing buildings", () => {
    const facts = buildFacts(richBuilding());
    expect(facts.find((f) => f.label === "Status")).toBeUndefined();
  });

  it("flags non-standing statuses, normalizing legacy Demolished to Lost", () => {
    const facts = buildFacts(makeBuilding({ status: "Demolished" }));
    expect(facts.find((f) => f.label === "Status")?.value).toBe("Lost");
  });

  it("falls back to the century when no completion year is known", () => {
    const facts = buildFacts(makeBuilding({ year_completed: 0, century: 19 }));
    expect(facts.find((f) => f.label === "Year")?.value).toBe("19th c.");
  });

  it("caps the strip at 6 cells", () => {
    const facts = buildFacts({
      ...richBuilding(),
      status: "Under Construction",
    });
    expect(facts).toHaveLength(6);
  });
});

describe("BuildingFactsStrip", () => {
  it("renders each fact as a labelled cell, coordinates stacked in mono", () => {
    render(<BuildingFactsStrip building={richBuilding()} />);
    expect(screen.getByText("Poissy, France")).toBeTruthy();
    expect(screen.getByText("International")).toBeTruthy();
    expect(screen.getByText("1931")).toBeTruthy();
    // Lat/lng render as stacked lines inside a mono dd (mock's .fact-v.mono).
    const lat = screen.getByText("48.92 N");
    expect(screen.getByText("2.03 E")).toBeTruthy();
    expect(lat.closest("dd")?.className).toContain("font-mono");
  });

  it("renders nothing below 3 facts", () => {
    const { container } = render(
      <BuildingFactsStrip
        building={makeBuilding({ city: null, country: null, year_completed: 0 })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
