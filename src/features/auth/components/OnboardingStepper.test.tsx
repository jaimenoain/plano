import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { OnboardingStepper } from "./OnboardingStepper";

describe("OnboardingStepper", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders one bar per step", () => {
    render(<OnboardingStepper total={3} current={1} />);
    const bars = screen.getByRole("progressbar").querySelectorAll("span");
    expect(bars).toHaveLength(3);
  });

  it("inks bars up to and including the current step, leaving the rest muted", () => {
    render(<OnboardingStepper total={3} current={1} />);
    const bars = Array.from(
      screen.getByRole("progressbar").querySelectorAll("span"),
    );
    // Step 1 active → first bar inked black, the other two muted.
    expect(bars[0].className).toContain("bg-text-primary");
    expect(bars[1].className).toContain("bg-border-default");
    expect(bars[2].className).toContain("bg-border-default");
  });

  it("inks every bar on the final step", () => {
    render(<OnboardingStepper total={3} current={3} />);
    const bars = Array.from(
      screen.getByRole("progressbar").querySelectorAll("span"),
    );
    expect(bars.every((b) => b.className.includes("bg-text-primary"))).toBe(true);
  });

  it("exposes accessible step position", () => {
    render(<OnboardingStepper total={3} current={2} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("2");
    expect(bar.getAttribute("aria-valuemax")).toBe("3");
  });
});
