import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { NotFoundView } from "./NotFoundView";

afterEach(cleanup);

function renderView() {
  return render(
    <MemoryRouter>
      <NotFoundView />
    </MemoryRouter>,
  );
}

describe("NotFoundView", () => {
  it("shows the mono ERROR · 404 eyebrow and the .display headline", () => {
    renderView();
    expect(screen.getByText("ERROR · 404").className).toContain("meta-code");
    const heading = screen.getByRole("heading", { name: "Not built." });
    expect(heading.className).toContain("display");
  });

  it("offers exactly two actions — Go back and Open the feed", () => {
    renderView();
    expect(screen.getByRole("button", { name: /Go back/ })).toBeInTheDocument();
    const feed = screen.getByRole("link", { name: "Open the feed" });
    expect(feed).toHaveAttribute("href", "/");
  });

  it("drops the old scope-reduction illustration and its joke copy", () => {
    const { container } = renderView();
    expect(screen.queryByText(/Scope reduction/i)).not.toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/value engineering/i);
    // No large decorative graphic — the states.html 404 has no illustration.
    expect(container.querySelector('svg[viewBox="0 0 400 300"]')).toBeNull();
  });
});
