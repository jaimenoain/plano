import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Link } from "react-router";
import { EmptyState } from "./empty-state";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders the eyebrow through the .eyebrow utility and a guidance sentence", () => {
    render(
      <EmptyState eyebrow="Nothing here yet" message="Log your first visit to start your catalogue." />,
    );
    const eyebrow = screen.getByText("Nothing here yet");
    expect(eyebrow.className).toContain("eyebrow");
    expect(
      screen.getByText("Log your first visit to start your catalogue."),
    ).toBeInTheDocument();
  });

  it("never renders an icon, illustration, or dashed/blank panel", () => {
    const { container } = render(
      <EmptyState eyebrow="No results" message="Try a different search." />,
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(container.innerHTML).not.toMatch(/border-dashed/);
    // Text-only by default — no photo-placeholder unless explicitly asked for.
    expect(container.querySelector(".photo-placeholder")).toBeNull();
  });

  it("renders a single .cta-link action with its href", () => {
    render(
      <MemoryRouter>
        <EmptyState
          eyebrow="No collections"
          message="Start a collection to group buildings."
          action={
            <Link to="/new" className="cta-link">
              Start a collection
            </Link>
          }
        />
      </MemoryRouter>,
    );
    const cta = screen.getByRole("link", { name: "Start a collection" });
    expect(cta.className).toContain("cta-link");
    expect(cta).toHaveAttribute("href", "/new");
  });

  it("renders a .photo-placeholder with its caption only when photoLabel is set", () => {
    const { container } = render(
      <EmptyState eyebrow="No photos yet" photoLabel="Add the first photo" />,
    );
    const placeholder = container.querySelector(".photo-placeholder");
    expect(placeholder).toHaveAttribute("data-label", "Add the first photo");
  });
});
