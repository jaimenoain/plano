// @vitest-environment happy-dom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ReviewDetails from "./ReviewDetails";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HelmetProvider } from "react-helmet-async";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock hooks
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user-id", email: "test@example.com" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock other components
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ImageDetailsDialog", () => ({
  ImageDetailsDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="image-details-dialog" onClick={onClose}>Image Details Dialog</div> : null
  ),
}));

describe("ReviewDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders review details correctly", async () => {
    // Setup mock data
    const mockReview = {
      id: "test-review-id",
      content: "Test review content",
      rating: 5,
      tags: ["test-tag"],
      created_at: new Date().toISOString(),
      user_id: "test-user-id",
      building_id: "test-building-id",
      status: "visited",
      user: {
        username: "testuser",
        avatar_url: "https://example.com/avatar.jpg",
      },
      building: {
        id: "test-building-id",
        name: "Test Building",
        year_completed: 2020,
        address: "123 Test St",
        main_image_url: "building.jpg",
        architects: [
             { architect: { id: "arch-1", name: "Test Architect" } }
        ],
      },
      images: [
        { id: "img-1", storage_path: "path/to/img1.jpg", is_generated: false },
        { id: "img-2", storage_path: "path/to/img2.jpg", is_generated: true },
      ],
    };

    // Robust mock builder
    const createMockChain = (data: any = { data: [] }, extra: any = {}) => {
        const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            neq: vi.fn(() => chain),
            in: vi.fn(() => chain),
            order: vi.fn(() => chain),
            limit: vi.fn(() => chain),
            single: vi.fn(() => Promise.resolve({ data, error: null, ...extra })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            then: (resolve: any) => Promise.resolve({ data, error: null, count: 0, ...extra }).then(resolve)
        };
        return chain;
    };

    // @ts-ignore
    supabase.from.mockImplementation((table: string) => {
        if (table === "user_buildings") {
            return {
                select: () => ({
                    eq: (col: string, val: string) => {
                        if (col === "id" && val === "test-review-id") {
                            return {
                                single: () => Promise.resolve({ data: mockReview, error: null }),
                            };
                        }
                        // Handle related reviews
                        return createMockChain([]);
                    },
                    in: () => createMockChain([]),
                })
            };
        }

        if (table === "likes" || table === "comments") {
             return createMockChain([], { count: 0 });
        }

        return createMockChain([]);
    });

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/review/test-review-id"]}>
          <Routes>
            <Route path="/review/:id" element={<ReviewDetails />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );

    // Wait for data loading
    await waitFor(() => {
      expect(screen.getByText("Test review content")).toBeTruthy();
    });

    // Check if images are rendered
    const images = screen.getAllByAltText("Review attachment");
    expect(images).toHaveLength(2);

    // Check if clicking an image opens the dialog
    fireEvent.click(images[0]);
    await waitFor(() => {
      expect(screen.getByTestId("image-details-dialog")).toBeTruthy();
    });
  });
});
