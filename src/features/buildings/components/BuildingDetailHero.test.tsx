// @vitest-environment happy-dom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { BuildingDetailHero } from "./BuildingDetailHero";

describe("BuildingDetailHero", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the photo when heroImageUrl is set", () => {
    render(
      <BuildingDetailHero
        heroImageUrl="http://img/hero.jpg"
        alt="Villa Savoye by Le Corbusier (1931) — Poissy, France"
        buildingName="Villa Savoye"
      />
    );

    const img = screen.getByRole("img", { name: /villa savoye/i });
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("http://img/hero.jpg");
    expect(img.className).toContain("aspect-16/9");
  });

  it("renders the .photo-placeholder with the building name as data-label when there is no photo", () => {
    const { container } = render(
      <BuildingDetailHero
        heroImageUrl={null}
        alt="Unbuilt Pavilion"
        buildingName="Unbuilt Pavilion"
      />
    );

    // No <img> at all — never a blank/flat-grey box, always the placeholder utility.
    expect(screen.queryByRole("img")).toBeNull();

    const placeholder = container.querySelector(".photo-placeholder");
    expect(placeholder).toBeTruthy();
    expect(placeholder?.getAttribute("data-label")).toBe("Unbuilt Pavilion");
    expect(placeholder?.className).toContain("aspect-16/9");
  });
});
