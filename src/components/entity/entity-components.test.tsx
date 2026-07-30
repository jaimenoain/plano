// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { EntityStatsBand } from "./EntityStatsBand";
import { EntityHero } from "./EntityHero";
import { EntityTabs } from "./EntityTabs";

afterEach(() => {
  cleanup();
});

describe("EntityStatsBand", () => {
  it("renders clickable cells as buttons and plain cells as inert figures", () => {
    const onClick = vi.fn();
    render(
      <EntityStatsBand
        cells={[
          { key: "a", value: 12, label: "Buildings" },
          { key: "b", value: 3, label: "Followers", onClick },
        ]}
      />,
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    const followers = screen.getByRole("button", { name: /3 Followers/i });
    fireEvent.click(followers);
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: /12 Buildings/i })).not.toBeInTheDocument();
  });

  it("derives the grid column class from the cell count", () => {
    const { container: three } = render(
      <EntityStatsBand
        cells={[
          { key: "a", value: 1, label: "A" },
          { key: "b", value: 2, label: "B" },
          { key: "c", value: 3, label: "C" },
        ]}
      />,
    );
    expect(three.firstElementChild?.className).toContain("grid-cols-3");

    const { container: four } = render(
      <EntityStatsBand
        cells={[
          { key: "a", value: 1, label: "A" },
          { key: "b", value: 2, label: "B" },
          { key: "c", value: 3, label: "C" },
          { key: "d", value: 4, label: "D" },
        ]}
      />,
    );
    expect(four.firstElementChild?.className).toContain("sm:grid-cols-4");
  });

  it("drops the left inset on cells that open a row, at each breakpoint", () => {
    const { container } = render(
      <EntityStatsBand
        cells={[
          { key: "a", value: 1, label: "A" },
          { key: "b", value: 2, label: "B" },
          { key: "c", value: 3, label: "C" },
          { key: "d", value: 4, label: "D" },
        ]}
      />,
    );
    const cellClasses = Array.from(container.firstElementChild?.children ?? []).map(
      (cell) => cell.className,
    );

    // Cell 1 opens a row at every width; cell 3 only on phones, where 4 cells
    // wrap 2×2 — so it keeps a left inset from `sm:` up.
    expect(cellClasses[0]).toContain("pl-0");
    expect(cellClasses[0]).not.toContain("sm:pl-5");
    expect(cellClasses[2]).toContain("pl-0");
    expect(cellClasses[2]).toContain("sm:pl-5");

    // Cells sitting against a hairline clear it at both widths.
    expect(cellClasses[1]).toContain("pl-4");
    expect(cellClasses[3]).toContain("pl-4");
    expect(cellClasses.every((c) => c.includes("pr-4"))).toBe(true);
  });

  it("renders string values verbatim and formats numbers", () => {
    render(
      <EntityStatsBand
        cells={[
          { key: "a", value: 1234, label: "Big" },
          { key: "b", value: "—", label: "Pending" },
        ]}
      />,
    );
    expect(screen.getByText((1234).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("EntityHero", () => {
  it("renders round avatar image, badges, actions, eyebrow, and title", () => {
    render(
      <EntityHero
        avatar={{ url: "https://img.test/a.jpg", alt: "Jane", fallbackInitial: "J", shape: "round" }}
        badges={<span>Verified</span>}
        actions={<button type="button">Follow</button>}
        eyebrow={<p>British · London</p>}
        title="Jane Doe"
      >
        <p>Bio text</p>
      </EntityHero>,
    );

    expect(screen.getByRole("img", { name: "Jane" }).className).toContain("rounded-full");
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
    expect(screen.getByText("British · London")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Jane Doe" })).toBeInTheDocument();
    expect(screen.getByText("Bio text")).toBeInTheDocument();
  });

  it("falls back to an initial when no avatar url, square when shape is square", () => {
    render(
      <EntityHero
        avatar={{ url: null, alt: "Acme", fallbackInitial: "A", shape: "square" }}
        title="Acme Ltd"
      />,
    );
    const initial = screen.getByText("A");
    expect(initial.parentElement?.className).toContain("rounded-none");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("EntityTabs", () => {
  it("shows counts, marks the active tab, and fires onChange", () => {
    const onChange = vi.fn();
    render(
      <EntityTabs
        tabs={[
          { key: "one", label: "One", count: 4 },
          { key: "two", label: "Two", count: null },
        ]}
        activeKey="one"
        onChange={onChange}
      />,
    );

    const active = screen.getByRole("button", { name: /One/ });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Two" }));
    expect(onChange).toHaveBeenCalledWith("two");
  });
});
