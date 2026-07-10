import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BuildingHeadline } from "./BuildingHeadline";

afterEach(cleanup);

describe("BuildingHeadline", () => {
  it("renders the feed step through the .headline utility, not an arbitrary clamp", () => {
    render(<BuildingHeadline name="Barbican Centre." size="feed" />);
    const heading = screen.getByRole("heading", { name: "Barbican Centre." });

    expect(heading.className).toContain("headline");
    expect(heading.className).not.toMatch(/text-\[clamp/);
  });

  it("does not let base utilities override .headline's family, weight and tracking", () => {
    render(<BuildingHeadline name="Salk Institute." size="feed" />);
    const heading = screen.getByRole("heading", { name: "Salk Institute." });

    expect(heading.className).not.toContain("font-bold");
    expect(heading.className).not.toContain("tracking-[-0.035em]");
  });

  it("keeps the base utilities on every other step", () => {
    render(<BuildingHeadline name="Therme Vals" size="xl" />);
    const heading = screen.getByRole("heading", { name: "Therme Vals" });

    expect(heading.className).toContain("font-bold");
    expect(heading.className).toContain("tracking-[-0.035em]");
    expect(heading.className).not.toContain("headline");
  });
});
