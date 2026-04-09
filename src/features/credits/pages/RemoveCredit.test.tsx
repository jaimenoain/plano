// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { RemoveCreditLoaderData } from "./RemoveCredit.loader";
import RemoveCredit from "./RemoveCredit";

const mocks = vi.hoisted(() => ({
  loaderData: { outcome: "invalid_format" } as RemoveCreditLoaderData,
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useLoaderData: () => mocks.loaderData,
    /** `ScrollRestoration` requires a data router; this page is covered by the real route in app. */
    ScrollRestoration: () => null,
  };
});

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

function renderPage() {
  return render(
    <MemoryRouter>
      <RemoveCredit />
    </MemoryRouter>,
  );
}

describe("RemoveCredit (QA 6.4)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mocks.loaderData = { outcome: "invalid_format" };
  });

  it("success state shows building name and View building link", () => {
    mocks.loaderData = {
      outcome: "success",
      buildingName: "Gherkin Hall",
      buildingHref: `/building/${BUILDING_ID}/gherkin`,
    };
    renderPage();
    expect(screen.getByRole("heading", { name: /credit removed — thank you/i })).toBeInTheDocument();
    expect(screen.getByText("Gherkin Hall")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /view building/i });
    expect(link).toHaveAttribute("href", `/building/${BUILDING_ID}/gherkin`);
  });

  it("invalid_format shows Invalid link (malformed URL token)", () => {
    mocks.loaderData = { outcome: "invalid_format" };
    renderPage();
    expect(screen.getByRole("heading", { name: /^invalid link$/i })).toBeInTheDocument();
  });

  it("already_used error shows the reused-link message", () => {
    mocks.loaderData = { outcome: "error", error: "already_used" };
    renderPage();
    expect(screen.getByRole("heading", { name: /we could not remove the credit/i })).toBeInTheDocument();
    expect(screen.getByText(/this link was already used/i)).toBeInTheDocument();
  });

  it("expired error shows the expired message", () => {
    mocks.loaderData = { outcome: "error", error: "expired" };
    renderPage();
    expect(screen.getByText(/this link has expired/i)).toBeInTheDocument();
  });

  it("unknown_token error shows not-found style copy", () => {
    mocks.loaderData = { outcome: "error", error: "unknown_token" };
    renderPage();
    expect(screen.getByText(/we could not find this link/i)).toBeInTheDocument();
  });
});
