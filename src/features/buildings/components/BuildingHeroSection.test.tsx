// @vitest-environment happy-dom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { BuildingHeroSection } from "./BuildingHeroSection";

describe("BuildingHeroSection", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the photo band when heroImageUrl is set", () => {
    render(
      <BuildingHeroSection
        heroImageUrl="http://img/hero.jpg"
        alt="Villa Savoye by Le Corbusier (1931) — Poissy, France"
        heroCredit={null}
      />,
    );

    const img = screen.getByRole("img", { name: /villa savoye/i });
    expect(img.getAttribute("src")).toBe("http://img/hero.jpg");
    expect(img.className).toContain("object-cover");
  });

  it("renders nothing at all without a photo — the masthead is the hero", () => {
    const { container } = render(
      <BuildingHeroSection heroImageUrl={null} alt="Unbuilt Pavilion" heroCredit={null} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows an official credit chip with the photographer's username", () => {
    render(
      <BuildingHeroSection
        heroImageUrl="http://img/hero.jpg"
        alt="Villa Savoye"
        heroCredit={{ isOfficial: true, username: "fondation" }}
      />,
    );

    expect(screen.getByText("Official · fondation")).toBeTruthy();
  });

  it("labels community photos 'Photo' and omits the chip when there is no credit", () => {
    const { rerender } = render(
      <BuildingHeroSection
        heroImageUrl="http://img/hero.jpg"
        alt="Villa Savoye"
        heroCredit={{ isOfficial: false, username: "claire" }}
      />,
    );
    expect(screen.getByText("Photo · claire")).toBeTruthy();

    rerender(
      <BuildingHeroSection heroImageUrl="http://img/hero.jpg" alt="Villa Savoye" heroCredit={null} />,
    );
    expect(screen.queryByText(/Official|Photo ·/)).toBeNull();
  });
});
