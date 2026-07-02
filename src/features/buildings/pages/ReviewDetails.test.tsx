// @vitest-environment happy-dom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ReviewDetails from "./ReviewDetails";
import { MemoryRouter, Route, Routes } from "react-router";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock hooks
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user-id", email: "test@example.com" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock other components
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/buildings/components/ImageDetailsDialog", () => ({
  ImageDetailsDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="image-details-dialog" onClick={onClose}>Image Details Dialog</div> : null
  ),
}));

describe("ReviewDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders review details correctly", async () => {
    // The review "post" now lives in `building_posts` (body, not content), with the
    // rating/status pulled from a separate `user_buildings` lookup. The building embed
    // uses `hero_image_url` and `people`/`companies` credit joins.
    const mockPost = {
      id: "test-review-id",
      body: "Test review content",
      tags: ["test-tag"],
      created_at: new Date().toISOString(),
      user_id: "test-user-id",
      building_id: "test-building-id",
      user: {
        username: "testuser",
        avatar_url: "https://example.com/avatar.jpg",
      },
      building: {
        id: "test-building-id",
        short_id: 42,
        slug: "test-building",
        name: "Test Building",
        year_completed: 2020,
        address: "123 Test St",
        hero_image_url: "building.jpg",
        building_credits: [
          {
            status: "active",
            credit_tier: "primary",
            person: { id: "arch-1", name: "Test Architect" },
            company: null,
          },
        ],
      },
      images: [
        { id: "img-1", storage_path: "path/to/img1.jpg", is_generated: false, caption: null },
        { id: "img-2", storage_path: "path/to/img2.jpg", is_generated: true, caption: null },
      ],
    };

    // Robust chainable mock builder.
    //  - `singleData` is what a terminal `.single()` / `.maybeSingle()` resolves to.
    //  - `listData` is what an awaited chain (`then`) resolves to (list queries).
    const createMockChain = (
        singleData: any = null,
        listData: any = [],
        extra: any = {},
    ) => {
        const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            neq: vi.fn(() => chain),
            in: vi.fn(() => chain),
            order: vi.fn(() => chain),
            limit: vi.fn(() => chain),
            single: vi.fn(() => Promise.resolve({ data: singleData, error: null, ...extra })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: singleData, error: null, ...extra })),
            delete: vi.fn(() => chain),
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            then: (resolve: any) => Promise.resolve({ data: listData, error: null, count: 0, ...extra }).then(resolve)
        };
        return chain;
    };

    // @ts-ignore
    supabase.from.mockImplementation((table: string) => {
        // building_posts: the main review fetch uses `.single()` → the post; the
        // related-review queries are awaited lists → empty.
        if (table === "building_posts") {
            return createMockChain(mockPost, []);
        }

        // rating/status lookup (.maybeSingle) + related-review ratings (awaited list).
        if (table === "user_buildings") {
            return createMockChain({ rating: 5, status: "visited" }, []);
        }

        // Count / like queries resolve empty with a count.
        if (table === "likes" || table === "comments") {
             return createMockChain(null, [], { count: 0 });
        }

        return createMockChain(null, []);
    });

    render(
      <MemoryRouter initialEntries={["/review/test-review-id"]}>
        <Routes>
          <Route path="/review/:id" element={<ReviewDetails />} />
        </Routes>
      </MemoryRouter>
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
