// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BuildingFormSection } from "./building-form-ui";

/**
 * Roadmap Task 3.2 — the section header is the page's hierarchy. These guard the
 * two things the redesign depends on: the title is a real heading element, and a
 * section whose child brings its own heading can opt out of rendering a second.
 */
describe("BuildingFormSection", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the title as a level-2 heading", () => {
    render(
      <BuildingFormSection title="Access & entry">
        <p>fields</p>
      </BuildingFormSection>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Access & entry" })).toBeTruthy();
    expect(screen.getByText("fields")).toBeTruthy();
  });

  it("renders the description under the title", () => {
    render(
      <BuildingFormSection title="Credits" description="Who worked on this building.">
        <p>fields</p>
      </BuildingFormSection>,
    );

    expect(screen.getByText("Who worked on this building.")).toBeTruthy();
  });

  it("renders no heading at all when the title is omitted", () => {
    render(
      <BuildingFormSection description="Standalone note.">
        <p>fields</p>
      </BuildingFormSection>,
    );

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("Standalone note.")).toBeTruthy();
    expect(screen.getByText("fields")).toBeTruthy();
  });

  it("omits the header block entirely when neither title nor description is given", () => {
    const { container } = render(
      <BuildingFormSection>
        <p>fields</p>
      </BuildingFormSection>,
    );

    const section = container.querySelector("section");
    expect(section?.children.length).toBe(1);
    expect(screen.getByText("fields")).toBeTruthy();
  });
});
