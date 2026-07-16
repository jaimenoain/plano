// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BuildingDossier, buildDossierRows } from "./BuildingDossier";
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

afterEach(cleanup);

describe("buildDossierRows", () => {
  it("returns no rows for a bare record", () => {
    expect(buildDossierRows(makeBuilding())).toEqual([]);
  });

  it("only emits an Address row when a street address exists", () => {
    expect(
      buildDossierRows(makeBuilding({ address: "82 Rue de Villiers" })).find(
        (r) => r.key === "address",
      )?.value,
    ).toBe("82 Rue de Villiers, Poissy, France");
    // City/country alone belong to the facts strip, not the dossier.
    expect(buildDossierRows(makeBuilding()).find((r) => r.key === "address")).toBeUndefined();
  });

  it("does not re-append city/country the address string already carries", () => {
    expect(
      buildDossierRows(
        makeBuilding({ address: "251 Southwark Bridge Road, London, UK", city: "London", country: "United Kingdom" }),
      ).find((r) => r.key === "address")?.value,
    ).toBe("251 Southwark Bridge Road, London, UK, United Kingdom");
  });

  it("joins multi-value fields with interpuncts instead of chips", () => {
    const rows = buildDossierRows(
      makeBuilding({
        materials: ["Concrete", "Glass"],
        size_category: "m",
        size_sqm: 480,
        storeys: 3,
        height_m: 9,
      }),
    );
    expect(rows.find((r) => r.key === "materials")?.value).toBe("Concrete · Glass");
    expect(rows.find((r) => r.key === "size")?.value).toBe("M · 480 m² · 3 storeys · 9 m");
  });

  it("title-cases catalog values and carries access notes as the secondary line", () => {
    const rows = buildDossierRows(
      makeBuilding({
        access_level: "public",
        access_logistics: "booking_required",
        access_cost: "paid",
        access_notes: "Closed on Mondays.",
      }),
    );
    const access = rows.find((r) => r.key === "access");
    expect(access?.value).toBe("Public · Booking Required · Paid");
    expect(access?.secondary).toBe("Closed on Mondays.");
  });

  it("merges alt_name into the aliases, deduped and excluding the primary name", () => {
    const rows = buildDossierRows(
      makeBuilding({
        alt_name: "Les Heures Claires",
        aliases: ["Les Heures Claires", "Villa Savoye", " ", "The Savoye House"],
      }),
    );
    expect(rows.find((r) => r.key === "aka")?.value).toBe(
      "Les Heures Claires · The Savoye House",
    );
  });
});

describe("BuildingDossier", () => {
  it("renders labelled hairline rows without chip boxes", () => {
    const { container } = render(
      <BuildingDossier
        building={makeBuilding({ materials: ["Concrete", "Glass"], category: "Housing" })}
      />,
    );
    expect(screen.getByText("Details")).toBeTruthy();
    expect(screen.getByText("Concrete · Glass")).toBeTruthy();
    expect(screen.getByText("Housing")).toBeTruthy();
    expect(container.querySelector(".bg-surface-muted")).toBeNull();
  });

  it("renders nothing for a bare record", () => {
    const { container } = render(<BuildingDossier building={makeBuilding()} />);
    expect(container.firstChild).toBeNull();
  });
});
