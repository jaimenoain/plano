import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExploreTeaserBlock } from "./ExploreTeaserBlock";
import { useDiscoveryFeed } from "@/hooks/useDiscoveryFeed";
import { BrowserRouter } from "react-router-dom";

// @vitest-environment happy-dom

// Mock the hook
vi.mock("@/hooks/useDiscoveryFeed", () => ({
  useDiscoveryFeed: vi.fn(),
}));

// Mock Lucide icons
vi.mock("lucide-react", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    ArrowRight: () => <div data-testid="arrow-right" />,
    MapPin: () => <div data-testid="map-pin" />,
    Loader2: () => <div data-testid="loader" />,
  };
});

describe("ExploreTeaserBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    (useDiscoveryFeed as any).mockReturnValue({
      isLoading: true,
      data: undefined,
    });

    render(
      <BrowserRouter>
        <ExploreTeaserBlock />
      </BrowserRouter>
    );

    expect(screen.getByTestId("loader")).toBeTruthy();
  });

  it("renders nothing if no buildings", () => {
    (useDiscoveryFeed as any).mockReturnValue({
      isLoading: false,
      data: { pages: [[]] },
    });

    const { container } = render(
      <BrowserRouter>
        <ExploreTeaserBlock />
      </BrowserRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders buildings correctly", () => {
    const mockBuildings = [
      {
        id: "1",
        name: "Building 1",
        city: "City 1",
        slug: "slug-1",
        main_image_url: "image1.jpg",
      },
      {
        id: "2",
        name: "Building 2",
        city: "City 2",
        slug: "slug-2",
        main_image_url: "image2.jpg",
      },
    ];

    (useDiscoveryFeed as any).mockReturnValue({
      isLoading: false,
      data: { pages: [mockBuildings] },
    });

    render(
      <BrowserRouter>
        <ExploreTeaserBlock />
      </BrowserRouter>
    );

    expect(screen.getByText("Trending Architecture")).toBeTruthy();
    expect(screen.getByText("Building 1")).toBeTruthy();
    expect(screen.getByText("City 1")).toBeTruthy();
    expect(screen.getByText("Building 2")).toBeTruthy();
  });
});
