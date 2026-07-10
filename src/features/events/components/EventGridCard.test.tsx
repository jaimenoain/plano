import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { EventGridCard, EventDateCard } from "./EventGridCard";
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
    coverImageUrl: null,
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

function renderCard(overrides: Partial<EventCardDTO> = {}) {
  return render(
    <MemoryRouter>
      <EventGridCard event={event(overrides)} />
    </MemoryRouter>,
  );
}

describe("EventGridCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("pushes the name to the kit's 22px/700 step, never weight 900", () => {
    renderCard();
    const name = screen.getByRole("heading", { name: "Barbican Art Gallery" });
    expect(name.className).toContain("text-2xl");
    expect(name.className).toContain("font-bold");
    // Weight 900 is banned outright by the design system.
    expect(name.className).not.toContain("font-black");
    expect(name.className).not.toContain("font-extrabold");
  });

  it("falls back to a labelled .photo-placeholder when the event has no cover", () => {
    const { container } = renderCard({ coverImageUrl: null });
    const placeholder = container.querySelector(".photo-placeholder");
    expect(placeholder).not.toBeNull();
    expect(placeholder).toHaveAttribute("data-label", "Barbican Art Gallery");
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders the cover image sharp-edged when one exists", () => {
    const { container } = renderCard({ coverImageUrl: "http://img/barbican.jpg" });
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.className).not.toMatch(/rounded/);
    expect(container.querySelector(".photo-placeholder")).toBeNull();
  });

  it("paints no lime — the focus ring is the only sanctioned brand-accent here", () => {
    const { container } = renderCard();
    expect(container.innerHTML).not.toContain("text-brand-accent");
    expect(container.innerHTML).not.toContain("bg-brand-accent");
  });
});

describe("EventDateCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the day over an uppercase month band", () => {
    render(<EventDateCard iso="2026-12-05T14:30:00.000Z" />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("DEC")).toBeInTheDocument();
  });

  it("keeps the month band monochrome, not lime", () => {
    const { container } = render(<EventDateCard iso="2026-12-05T14:30:00.000Z" />);
    expect(container.innerHTML).not.toContain("brand-accent");
    expect(container.firstElementChild?.className).toContain("border-border-default");
    expect(container.querySelector("span")?.className).toContain("bg-brand-primary");
  });
});
