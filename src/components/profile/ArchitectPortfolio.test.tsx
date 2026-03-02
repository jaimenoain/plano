import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArchitectPortfolio } from "./ArchitectPortfolio";
import { useArchitectPortfolio } from "@/hooks/useArchitectPortfolio";
import { BrowserRouter } from "react-router-dom";
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the hook
vi.mock("@/hooks/useArchitectPortfolio", () => ({
  useArchitectPortfolio: vi.fn(),
}));

vi.mock("@/hooks/useUserBuildingStatuses", () => ({
  useUserBuildingStatuses: () => ({ statuses: {}, ratings: {} }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

const mockBuildings = [
  {
    id: "1",
    name: "Test Building 1",
    city: "New York",
    country: "USA",
    building_images: [{ id: "img1", storage_path: "path/to/img1.jpg" }],
  },
  {
    id: "2",
    name: "Test Building 2",
    city: "London",
    country: "UK",
    building_images: null,
  },
];

describe("ArchitectPortfolio", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    // Explicitly cleanup to avoid DOM state leakage between tests
    document.body.innerHTML = '';
  });

  it("renders loading skeletons when isLoading is true", () => {
    vi.mocked(useArchitectPortfolio).mockReturnValue({
      buildings: [],
      isLoading: true,
      error: null,
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ArchitectPortfolio architectId="arch-123" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Portfolio")).toBeInTheDocument();

    // Check for skeletons
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(6);
  });

  it("renders empty state when there are no buildings and isLoading is false", () => {
    vi.mocked(useArchitectPortfolio).mockReturnValue({
      buildings: [],
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ArchitectPortfolio architectId="arch-123" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("No buildings added to portfolio yet.")).toBeInTheDocument();
  });

  it("renders buildings in the populated state", () => {
    vi.mocked(useArchitectPortfolio).mockReturnValue({
      buildings: mockBuildings,
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ArchitectPortfolio architectId="arch-123" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Test Building 1")).toBeInTheDocument();
    expect(screen.getByText("Test Building 2")).toBeInTheDocument();
    expect(screen.queryByText("No buildings added to portfolio yet.")).not.toBeInTheDocument();
  });
});
