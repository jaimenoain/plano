import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FeedPostByline } from "./FeedPostByline";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({ user: { id: "u1" } })),
  useToast: vi.fn(() => ({ toast: vi.fn() })),
  useUserBuildingStatuses: vi.fn(() => ({ statuses: {} })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/hooks/use-toast", () => ({ useToast: mocks.useToast }));
vi.mock("@/features/profile/hooks/useUserBuildingStatuses", () => ({
  useUserBuildingStatuses: mocks.useUserBuildingStatuses,
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: mocks.useQueryClient }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const baseProps = {
  username: "jaime",
  timestamp: "2026-07-01T00:00:00.000Z",
  buildingId: "b1",
};

describe("FeedPostByline rating dots", () => {
  it("renders one dot per earned distinction", () => {
    render(<FeedPostByline {...baseProps} rating={2} />);

    const dots = screen.getByRole("img", { name: "2 distinctions" });
    expect(dots.querySelectorAll("span[aria-hidden]")).toHaveLength(2);
  });

  it("renders nothing for an unrated post — never an empty ring", () => {
    render(<FeedPostByline {...baseProps} rating={0} />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders nothing when the rating is absent", () => {
    render(<FeedPostByline {...baseProps} rating={null} />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
