// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { VerifyCompanyClaimLoaderData } from "./VerifyCompanyClaim.loader";
import VerifyCompanyClaim from "./VerifyCompanyClaim";

const mocks = vi.hoisted(() => ({
  loaderData: { outcome: "invalid_format" } as VerifyCompanyClaimLoaderData,
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useLoaderData: () => mocks.loaderData,
    ScrollRestoration: () => null,
  };
});

const TOKEN_PATH = `/verify-company-claim/${"c".repeat(64)}`;

function renderPage() {
  return render(
    <MemoryRouter>
      <VerifyCompanyClaim />
    </MemoryRouter>,
  );
}

describe("VerifyCompanyClaim (QA 7.2)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mocks.loaderData = { outcome: "invalid_format" };
  });

  it("invalid_format shows Invalid link copy", () => {
    mocks.loaderData = { outcome: "invalid_format" };
    renderPage();
    expect(screen.getByRole("heading", { name: /^invalid link$/i })).toBeInTheDocument();
  });

  it("needs_auth shows Log in with encoded return path", () => {
    mocks.loaderData = { outcome: "needs_auth", returnPath: TOKEN_PATH };
    renderPage();
    expect(screen.getByRole("heading", { name: /sign in to continue/i })).toBeInTheDocument();
    const login = screen.getByRole("link", { name: /log in/i });
    expect(login.getAttribute("href")).toContain("/auth?");
    expect(login.getAttribute("href")).toContain(encodeURIComponent(TOKEN_PATH));
  });

  it("expired token shows error heading and expired message", () => {
    mocks.loaderData = { outcome: "error", error: "expired" };
    renderPage();
    expect(screen.getByRole("heading", { name: /we could not verify your claim/i })).toBeInTheDocument();
    expect(screen.getByText(/this link has expired/i)).toBeInTheDocument();
  });
});
