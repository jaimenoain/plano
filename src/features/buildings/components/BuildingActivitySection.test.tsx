// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { BuildingActivitySection } from "./BuildingActivitySection";
import type { BuildingActivityPerson } from "../api/buildingActivity";

// The connected wrapper in the same module fetches; the presentational section
// under test does not, so the hook only needs to exist.
vi.mock("../hooks/useBuildingActivity", () => ({
  useBuildingActivity: () => ({ data: undefined }),
}));

function person(
  username: string,
  overrides: Partial<BuildingActivityPerson> = {},
): BuildingActivityPerson {
  return {
    user_id: `id-${username}`,
    username,
    avatar_url: null,
    rating: null,
    visited_at: null,
    is_followed: false,
    ...overrides,
  };
}

function renderSection(props: Partial<{
  visited: BuildingActivityPerson[];
  saved: BuildingActivityPerson[];
  totalVisited: number;
  totalSaved: number;
}> = {}) {
  const visited = props.visited ?? [];
  const saved = props.saved ?? [];
  render(
    <MemoryRouter>
      <BuildingActivitySection
        visited={visited}
        saved={saved}
        totalVisited={props.totalVisited ?? visited.length}
        totalSaved={props.totalSaved ?? saved.length}
      />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BuildingActivitySection", () => {
  it("names the members who visited and who saved, linking to their profiles", () => {
    renderSection({
      visited: [person("annalaurent")],
      saved: [person("marcoruiz")],
    });

    expect(screen.getByText("Saved & visited")).toBeTruthy();
    // The two groups never overlap — one row per member per building.
    expect(screen.getByText("2 members")).toBeTruthy();
    expect(screen.getByText("1 visited")).toBeTruthy();
    expect(screen.getByText("1 saved")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /annalaurent/ }).getAttribute("href"),
    ).toBe("/profile/annalaurent");
    expect(
      screen.getByRole("link", { name: /marcoruiz/ }).getAttribute("href"),
    ).toBe("/profile/marcoruiz");
  });

  it("renders nothing at all when nobody has saved or visited", () => {
    const { container } = render(
      <MemoryRouter>
        <BuildingActivitySection
          visited={[]}
          saved={[]}
          totalVisited={0}
          totalSaved={0}
        />
      </MemoryRouter>,
    );

    // The Community empty state directly above already invites the first
    // contribution — a second empty state here would be a dead end.
    expect(container.textContent).toBe("");
  });

  it("omits a group that has nobody in it rather than showing a zero", () => {
    renderSection({ visited: [person("annalaurent")], saved: [] });

    expect(screen.getByText("1 visited")).toBeTruthy();
    expect(screen.queryByText("0 saved")).toBeNull();
  });

  it("counts the members it could not fit as '+N more'", () => {
    const visited = Array.from({ length: 8 }, (_, i) => person(`member${i}`));

    renderSection({ visited, totalVisited: 31 });

    expect(screen.getByText("31 visited")).toBeTruthy();
    expect(screen.getByText("+23 more")).toBeTruthy();
  });

  it("shows award dots only for members who marked the building", () => {
    renderSection({
      visited: [
        person("annalaurent", { rating: 3 }),
        person("marcoruiz", { rating: null }),
      ],
    });

    // RatingDots renders nothing for null/0, so exactly one member has dots.
    const dots = screen.getAllByRole("img");
    expect(dots).toHaveLength(1);
    expect(dots[0].getAttribute("aria-label")).toBe("3 distinctions");
  });
});
