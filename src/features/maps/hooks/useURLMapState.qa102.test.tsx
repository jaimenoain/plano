// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { useURLMapState } from "./useURLMapState";

function CreditFiltersProbe() {
  const { filters } = useURLMapState();
  return (
    <div>
      <span data-testid="credit-company-id">{filters.creditCompany?.id ?? ""}</span>
      <span data-testid="credit-roles">{(filters.creditRoles ?? []).join("|")}</span>
    </div>
  );
}

function QuerySyncProbe() {
  const { filters, setMapURL } = useURLMapState();
  const location = useLocation();

  return (
    <div>
      <span data-testid="query">{filters.query ?? ""}</span>
      <span data-testid="search">{location.search}</span>
      <button
        type="button"
        onClick={() => setMapURL({ filters: { query: "barbican" } })}
      >
        set-query
      </button>
    </div>
  );
}

describe("useURLMapState (QA 10.2 — credit filter URL params)", () => {
  afterEach(() => {
    cleanup();
  });

  it("hydrates creditCompany and creditRoles from search params for bookmarkable map state", () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/search?creditCompany=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee&creditRoles=structural_engineering,mep_engineering",
        ]}
      >
        <Routes>
          <Route path="/search" element={<CreditFiltersProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("credit-company-id")).toHaveTextContent("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(screen.getByTestId("credit-roles")).toHaveTextContent("structural_engineering|mep_engineering");
  });

  it("leaves credit filters empty when params absent", () => {
    render(
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={<CreditFiltersProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("credit-company-id")).toHaveTextContent("");
    expect(screen.getByTestId("credit-roles")).toHaveTextContent("");
  });

  it("persists query filter when setMapURL receives filters", () => {
    render(
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={<QuerySyncProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "set-query" }));

    expect(screen.getByTestId("query")).toHaveTextContent("barbican");
    expect(screen.getByTestId("search")).toHaveTextContent("q=barbican");
  });
});
