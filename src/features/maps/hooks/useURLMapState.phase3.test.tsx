import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { MapProvider, useMapContext } from "../providers/MapContext";

function ShowLostProbe() {
  const { state, methods } = useMapContext();
  const { filters } = state;
  const [searchParams] = useSearchParams();
  return (
    <>
      <span data-testid="show-lost">{filters.showLost ? "true" : "false"}</span>
      <span data-testid="search">{searchParams.toString()}</span>
      <button
        type="button"
        onClick={() =>
          methods.setMapState({
            filters: { ...filters, showLost: !filters.showLost },
          })
        }
      >
        toggle-lost
      </button>
    </>
  );
}

describe("useURLMapState — show lost buildings", () => {
  afterEach(() => {
    cleanup();
  });

  const renderProbe = (initialEntry: string) =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/map"
            element={
              <MapProvider>
                <ShowLostProbe />
              </MapProvider>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

  it("hydrates showLost=true from showLost URL param", () => {
    renderProbe("/map?showLost=true");
    expect(screen.getByTestId("show-lost")).toHaveTextContent("true");
  });

  it("hydrates showLost=true from legacy showDemolished URL param", () => {
    renderProbe("/map?showDemolished=true");
    expect(screen.getByTestId("show-lost")).toHaveTextContent("true");
  });

  it("defaults showLost to false when param is absent", () => {
    renderProbe("/map");
    expect(screen.getByTestId("show-lost")).toHaveTextContent("false");
  });

  it("writes showLost=true to URL when toggled on, removes legacy param when toggled off", () => {
    render(
      <MemoryRouter initialEntries={["/map"]}>
        <Routes>
          <Route
            path="/map"
            element={
              <MapProvider>
                <ShowLostProbe />
              </MapProvider>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "toggle-lost" }));
    expect(screen.getByTestId("search")).toHaveTextContent("showLost=true");
    expect(screen.getByTestId("search").textContent).not.toContain("showDemolished");

    fireEvent.click(screen.getByRole("button", { name: "toggle-lost" }));
    expect(screen.getByTestId("search").textContent).not.toContain("showLost");
    expect(screen.getByTestId("search").textContent).not.toContain("showDemolished");
  });
});
