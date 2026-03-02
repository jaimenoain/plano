import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useArchitectPortfolio } from "./useArchitectPortfolio";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("useArchitectPortfolio", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should return an empty array if no architectId is provided", async () => {
    const { result } = renderHook(() => useArchitectPortfolio(null), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.buildings).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("should fetch and format buildings correctly", async () => {
    const mockData = [
      {
        id: "b1",
        name: "Building 1",
        city: "New York",
        country: "USA",
        building_images: [
          { id: "img1", storage_path: "path/to/img1.jpg" },
        ],
      },
      {
        id: "b2",
        name: "Building 2",
        city: "London",
        country: "UK",
        building_images: null, // Test handling null images
      },
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: mockData, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    });

    const { result } = renderHook(() => useArchitectPortfolio("arch-123"), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supabase.from).toHaveBeenCalledWith("buildings");
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining("building_images("));
    expect(mockEq).toHaveBeenCalledWith("architect_id", "arch-123");

    expect(result.current.buildings).toHaveLength(2);
    expect(result.current.buildings[0]).toEqual({
      id: "b1",
      name: "Building 1",
      city: "New York",
      country: "USA",
      building_images: [{ id: "img1", storage_path: "path/to/img1.jpg" }],
    });
    expect(result.current.buildings[1]).toEqual({
      id: "b2",
      name: "Building 2",
      city: "London",
      country: "UK",
      building_images: null,
    });
    expect(result.current.error).toBeNull();
  });

  it("should return an empty array if no buildings are found", async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    });

    const { result } = renderHook(() => useArchitectPortfolio("arch-123"), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(supabase.from).toHaveBeenCalledWith("buildings");
    expect(mockEq).toHaveBeenCalledWith("architect_id", "arch-123");
    expect(result.current.buildings).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("should return error if fetching fails", async () => {
    const mockError = new Error("Database error");

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: mockError });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
    });

    const { result } = renderHook(() => useArchitectPortfolio("arch-123"), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.buildings).toEqual([]);
  });
});
