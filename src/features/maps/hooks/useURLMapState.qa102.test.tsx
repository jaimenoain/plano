// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
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

describe("useURLMapState (QA 10.2 — credit filter URL params)", () => {
  afterEach(() => {
    cleanup();
  });

  it("hydrates creditCompany and creditRoles from search params for bookmarkable map state", () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/search?creditCompany=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee&creditRoles=structural_engineer,mep_engineer",
        ]}
      >
        <Routes>
          <Route path="/search" element={<CreditFiltersProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("credit-company-id")).toHaveTextContent("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(screen.getByTestId("credit-roles")).toHaveTextContent("structural_engineer|mep_engineer");
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
});
