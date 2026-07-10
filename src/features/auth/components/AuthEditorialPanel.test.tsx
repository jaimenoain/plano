import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { AuthEditorialPanel } from "./AuthEditorialPanel";

describe("AuthEditorialPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the Plano logo", () => {
    render(<AuthEditorialPanel />);
    expect(screen.getByRole("img", { name: "Plano" })).toBeInTheDocument();
  });

  it("renders the editorial tagline and caption", () => {
    const { container } = render(<AuthEditorialPanel />);
    expect(container.textContent).toContain("architecture");
    expect(container.textContent).toContain("cataloged");
    expect(container.textContent).toContain("Est. 2024");
  });

  it("uses the dark photo-placeholder surface, never a light one", () => {
    const { container } = render(<AuthEditorialPanel />);
    const panel = container.querySelector("aside");
    expect(panel?.className).toContain("photo-placeholder-dark");
    // Hidden on mobile — the form stands alone below the split breakpoint.
    expect(panel?.className).toContain("min-[900px]:flex");
  });

  it("gives the tagline the editorial headline treatment in white", () => {
    render(<AuthEditorialPanel />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.className).toContain("headline");
    expect(heading.className).toContain("text-white");
  });
});
