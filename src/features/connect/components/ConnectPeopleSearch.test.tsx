import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ConnectPeopleSearch, isSearchActive } from "./ConnectPeopleSearch";
import type { UserSearchResult } from "@/features/search";

const mocks = vi.hoisted(() => ({
  useUserSearch: vi.fn<
    () => { users: UserSearchResult[]; isLoading: boolean }
  >(() => ({ users: [], isLoading: false })),
}));

vi.mock("@/features/search", () => ({
  useUserSearch: mocks.useUserSearch,
}));
vi.mock("./UserRow", () => ({
  UserRow: ({ user }: { user: { id: string } }) => (
    <div data-testid="user-row">{user.id}</div>
  ),
}));

const noop = () => {};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("isSearchActive", () => {
  it("is inactive below the minimum query length and active at/above it", () => {
    expect(isSearchActive("")).toBe(false);
    expect(isSearchActive("ab")).toBe(false);
    expect(isSearchActive("  ab ")).toBe(false);
    expect(isSearchActive("abc")).toBe(true);
  });
});

describe("ConnectPeopleSearch", () => {
  it("shows only the input (no results region) below the threshold", () => {
    render(<ConnectPeopleSearch query="ab" onQueryChange={noop} />);
    expect(screen.getByPlaceholderText("Search people by username")).toBeInTheDocument();
    expect(screen.queryByTestId("user-row")).not.toBeInTheDocument();
    expect(screen.queryByText(/result/i)).not.toBeInTheDocument();
  });

  it("renders results with a pluralized count", () => {
    mocks.useUserSearch.mockReturnValue({
      users: [
        { id: "a", username: "alice", avatar_url: null },
        { id: "b", username: "bob", avatar_url: null },
      ],
      isLoading: false,
    });
    render(<ConnectPeopleSearch query="ali" onQueryChange={noop} />);
    expect(screen.getAllByTestId("user-row")).toHaveLength(2);
    expect(screen.getByText("2 results")).toBeInTheDocument();
  });

  it("shows the empty state when an active search returns nothing", () => {
    mocks.useUserSearch.mockReturnValue({ users: [], isLoading: false });
    render(<ConnectPeopleSearch query="zzzzz" onQueryChange={noop} />);
    expect(screen.getByText("No people found")).toBeInTheDocument();
    expect(screen.queryByTestId("user-row")).not.toBeInTheDocument();
  });
});
