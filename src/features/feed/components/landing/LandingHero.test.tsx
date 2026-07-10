import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LandingHero } from "./LandingHero";

const mocks = vi.hoisted(() => ({
  openWaitlistDialog: vi.fn(),
}));

vi.mock("@/features/waitlist/WaitlistSignupProvider", () => ({
  useWaitlistSignup: () => ({ openWaitlistDialog: mocks.openWaitlistDialog }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderHero() {
  return render(
    <MemoryRouter>
      <LandingHero />
    </MemoryRouter>,
  );
}

describe("LandingHero", () => {
  it("renders the headline at poster scale with exactly one italicised word", () => {
    const { container } = renderHero();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("display");

    const emphasised = container.querySelectorAll("h1 em");
    expect(emphasised).toHaveLength(1);
    expect(emphasised[0]).toHaveTextContent("architecture");
  });

  it("spends lime on exactly one accent tag and one primary button", () => {
    const { container } = renderHero();

    expect(container.querySelectorAll(".accent-tag")).toHaveLength(1);

    const cta = screen.getByRole("button", { name: "Join the waiting list" });
    // Assert the token class, not a computed ring: programmatic focus never
    // triggers :focus-visible, so the ring cannot be read back here.
    expect(cta).toHaveClass("bg-brand-accent");
  });

  it("offers exactly one editorial cta-link, pointing at the map", () => {
    const { container } = renderHero();

    const links = container.querySelectorAll("a.cta-link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/search");
    // The arrow is injected by .cta-link::after — it must not be in the markup.
    expect(links[0].textContent).toBe("See the map");
  });
});
