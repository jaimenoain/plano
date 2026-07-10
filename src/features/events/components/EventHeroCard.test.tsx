import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { EventHeroCard } from "./EventHeroCard";
import type { EventCardDTO } from "../types";

function event(overrides: Partial<EventCardDTO> = {}): EventCardDTO {
  return {
    id: "e1",
    title: "Barbican Art Gallery",
    description: null,
    slug: "barbican-art-gallery",
    startAt: "2026-12-05T14:30:00.000Z",
    endAt: null,
    address: "Silk Street, London",
    lat: null,
    lng: null,
    externalLink: null,
    coverImageUrl: "http://img/barbican.jpg",
    isSelfHosted: false,
    claimStatus: "unclaimed",
    submittedBy: { userId: "u1", username: "jaime", avatarUrl: null },
    organiser: null,
    isDeleted: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    localityId: null,
    countryCode: "gb",
    citySlug: "london",
    ...overrides,
  };
}

function renderHero(overrides: Partial<EventCardDTO> = {}) {
  return render(
    <MemoryRouter>
      <EventHeroCard event={event(overrides)} />
    </MemoryRouter>,
  );
}

describe("EventHeroCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("is a bordered article — hairline, no shadow, no radius", () => {
    const { container } = renderHero();
    const article = container.querySelector("article")!;
    expect(article.className).toContain("border-border-default");
    expect(article.className).not.toMatch(/shadow/);
    expect(article.className).not.toMatch(/rounded/);
  });

  it("drops the gradient scrim and the white-on-photo treatment", () => {
    const { container } = renderHero();
    expect(container.innerHTML).not.toContain("bg-linear-to-t");
    expect(container.innerHTML).not.toContain("text-text-inverse");
  });

  it("renders the Featured eyebrow monochrome, never lime", () => {
    renderHero();
    const eyebrow = screen.getByText("Featured");
    expect(eyebrow.className).toContain("eyebrow");
    expect(eyebrow.className).not.toContain("text-brand-accent");
  });

  it("names the event at the kit's step, never weight 900", () => {
    renderHero();
    const name = screen.getByRole("heading", { name: "Barbican Art Gallery" });
    expect(name.className).toContain("text-4xl");
    expect(name.className).toContain("font-bold");
    expect(name.className).not.toContain("font-black");
  });

  it("uses a .cta-link whose arrow is injected, never typed into the label", () => {
    renderHero();
    const cta = screen.getByRole("link", { name: "Details" });
    expect(cta.className).toContain("cta-link");
    expect(cta.textContent).not.toContain("→");
  });

  it("falls back to a labelled .photo-placeholder when the event has no cover", () => {
    const { container } = renderHero({ coverImageUrl: null });
    const placeholder = container.querySelector(".photo-placeholder");
    expect(placeholder).toHaveAttribute("data-label", "Barbican Art Gallery");
  });
});
