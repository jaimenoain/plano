import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useBuildingActivity } from "./useBuildingActivity";
import { BUILDING_ACTIVITY_LIMIT } from "../api/buildingActivity";

const { fetchMock, useAuthMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("../api/buildingActivity", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../api/buildingActivity")>();
  return { ...actual, fetchBuildingActivity: fetchMock };
});

vi.mock("@/features/auth", () => ({ useAuth: useAuthMock }));

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { id: "viewer-1" } });
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

describe("useBuildingActivity", () => {
  it("reads the saved/visited members for the building it was given", async () => {
    fetchMock.mockResolvedValue({
      visited: [
        {
          user_id: "u1",
          username: "anna",
          avatar_url: null,
          rating: 2,
          visited_at: null,
          is_followed: false,
        },
      ],
      saved: [],
      totalVisited: 9,
      totalSaved: 4,
    });

    const { result } = renderHook(() => useBuildingActivity("b1"), { wrapper });

    await waitFor(() => expect(result.current.data?.totalVisited).toBe(9));
    expect(fetchMock).toHaveBeenCalledWith("b1", BUILDING_ACTIVITY_LIMIT);
    expect(result.current.data?.visited).toHaveLength(1);
    expect(result.current.data?.totalSaved).toBe(4);
  });

  it("stays disabled for logged-out visitors — the RPC is authenticated-only", () => {
    useAuthMock.mockReturnValue({ user: null });

    renderHook(() => useBuildingActivity("b1"), { wrapper });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
