import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { LocalityTopBuildings } from "./LocalityTopBuildings";
import type { LocalityBuildingDTO } from "../types";

function building(overrides: Partial<LocalityBuildingDTO> = {}): LocalityBuildingDTO {
  return {
    id: "b1",
    name: "Kunsthal",
    alt_name: null,
    short_id: 1,
    slug: "kunsthal",
    city: "Rotterdam",
    country: "Netherlands",
    year_completed: 1992,
    main_image_url: "http://img/kunsthal.jpg",
    status: "Built",
    location_lat: 0,
    location_lng: 0,
    credits: null,
    styles: null,
    ...overrides,
  };
}

function renderSection(buildings: LocalityBuildingDTO[]) {
  return render(
    <MemoryRouter>
      <LocalityTopBuildings
        buildings={buildings}
        totalCount={214}
        citySlug="rotterdam"
        countryCode="nl"
      />
    </MemoryRouter>,
  );
}

describe("LocalityTopBuildings", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders unboxed cards with secondary names as text below the image", () => {
    const { container } = renderSection([
      building(),
      building({ id: "b2", name: "Van Nelle Factory", slug: "van-nelle", short_id: 2 }),
    ]);

    // Feed/content cards float: no border, no shadow (CHECKLIST.md).
    for (const link of container.querySelectorAll("a")) {
      expect(link.className).not.toMatch(/\bborder\b/);
      expect(link.className).not.toMatch(/\bshadow/);
    }

    // The secondary name is black type below its image, not an overlay caption.
    const secondaryName = screen.getByText("Van Nelle Factory");
    expect(secondaryName.className).toContain("text-text-primary");
    expect(secondaryName.className).not.toContain("text-white");
  });

  it("uses .photo-placeholder for a building with no photo", () => {
    const { container } = renderSection([
      building(),
      building({ id: "b2", name: "Lost Pavilion", slug: "lost", short_id: 2, main_image_url: null }),
    ]);

    const placeholder = container.querySelector(".photo-placeholder");
    expect(placeholder).toBeTruthy();
    expect(placeholder?.getAttribute("data-label")).toBe("Lost Pavilion");
  });

  it("links to the full catalogue with an injected-arrow .cta-link", () => {
    renderSection([building()]);

    const cta = screen.getByRole("link", { name: /All 214/ });
    expect(cta.className).toContain("cta-link");
    // The → is injected by the utility's ::after, never typed into the label.
    expect(cta.textContent).not.toContain("→");
  });
});
