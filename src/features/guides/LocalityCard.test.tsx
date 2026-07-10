import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { LocalityCard } from "./LocalityCard";
import type { GuidesLocalityRow } from "./guidesApi";

const locality: GuidesLocalityRow = {
  id: "1",
  city: "Rotterdam",
  country: "Netherlands",
  countryCode: "NL",
  slug: "rotterdam",
  citySlug: "rotterdam",
  heroImageUrl: "http://img/rotterdam.jpg",
  buildingsCount: 214,
};

function renderCard(props: Parameters<typeof LocalityCard>[0]) {
  return render(
    <MemoryRouter>
      <LocalityCard {...props} />
    </MemoryRouter>,
  );
}

describe("LocalityCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the featured card unboxed, with the name below the image", () => {
    const { container } = renderCard({ locality, featured: true });

    // Content cards carry no border, background or shadow (CHECKLIST.md).
    const link = container.querySelector("a")!;
    expect(link.className).not.toMatch(/\bborder\b/);
    expect(link.className).not.toMatch(/\bshadow/);
    expect(link.className).not.toMatch(/\bbg-/);

    // Name and count are real text below the image, not a scrim overlay.
    expect(screen.getByText("Rotterdam")).toBeTruthy();
    expect(screen.getByText("214 buildings")).toBeTruthy();
    expect(container.querySelector(".bg-linear-to-t")).toBeNull();

    const img = screen.getByRole("img", { name: "Rotterdam" });
    expect(img.getAttribute("src")).toBe("http://img/rotterdam.jpg");
  });

  it("falls back to a .photo-placeholder labelled with the city when there is no hero image", () => {
    const { container } = renderCard({
      locality: { ...locality, heroImageUrl: null },
      featured: true,
    });

    expect(screen.queryByRole("img")).toBeNull();

    const placeholder = container.querySelector(".photo-placeholder");
    expect(placeholder).toBeTruthy();
    expect(placeholder?.getAttribute("data-label")).toBe("Rotterdam");
  });

  it("renders the compact variant's count as mono meta", () => {
    const { container } = renderCard({ locality });

    const count = screen.getByText("214");
    expect(count.className).toContain("meta-code");
    expect(container.querySelector("img")).toBeNull();
  });
});
