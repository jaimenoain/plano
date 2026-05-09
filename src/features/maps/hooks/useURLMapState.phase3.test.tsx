// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { useURLMapState } from "./useURLMapState";

function ShowDemolishedProbe() {
  const { filters, setMapURL } = useURLMapState();
  const location = useLocation();

  return (
    <div>
      <span data-testid="show-demolished">{filters.showDemolished ? "true" : "false"}</span>
      <span data-testid="search">{location.search}</span>
      <button
        type="button"
        onClick={() =>
          setMapURL({
            filters: { ...filters, showDemolished: !filters.showDemolished },
          })
        }
      >
        toggle-demolished
      </button>
    </div>
  );
}

describe("useURLMapState — Phase 3 (Show demolished)", () => {
  afterEach(() => {
    cleanup();
  });

  it("hydrates showDemolished=true from URL", () => {
    render(
      <MemoryRouter initialEntries={["/search?showDemolished=true"]}>
        <Routes>
          <Route path="/search" element={<ShowDemolishedProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("show-demolished")).toHaveTextContent("true");
  });

  it("defaults showDemolished to false when param is absent", () => {
    render(
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={<ShowDemolishedProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("show-demolished")).toHaveTextContent("false");
  });

  it("writes showDemolished=true to URL when toggled on, removes it when toggled off", () => {
    render(
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={<ShowDemolishedProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "toggle-demolished" }));
    expect(screen.getByTestId("search")).toHaveTextContent("showDemolished=true");

    fireEvent.click(screen.getByRole("button", { name: "toggle-demolished" }));
    expect(screen.getByTestId("search").textContent).not.toContain("showDemolished");
  });
});
