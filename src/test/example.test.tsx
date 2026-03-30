/**
 * Example tests demonstrating Plano testing patterns.
 * Copy as a starting point for new component/hook tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders, createTestQueryClient } from "@/test/utils";

describe("Example component test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with providers", () => {
    renderWithProviders(<div data-testid="hello">Hello Plano</div>);
    expect(screen.getByTestId("hello")).toBeInTheDocument();
  });

  it("supports custom initial route", () => {
    renderWithProviders(<div>Content</div>, {
      initialRoute: "/building/123",
    });
  });

  it("supports custom query client for pre-seeded cache", () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["profile", "user-123"], {
      id: "user-123",
      username: "testuser",
      avatar_url: null,
      bio: "Test bio",
    });

    renderWithProviders(<div>Content</div>, { queryClient });
  });
});
