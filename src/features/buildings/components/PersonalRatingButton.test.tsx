
// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { PersonalRatingButton } from "./PersonalRatingButton";

// Mock framer-motion to avoid animation issues in test environment
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, whileTap, whileHover, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("PersonalRatingButton", () => {
  const mockOnRate = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with initial rating", () => {
    render(
      <PersonalRatingButton
        buildingId="123"
        initialRating={2}
        onRate={mockOnRate}
        variant="inline"
      />
    );

    // Should show 3 buttons
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("calls onRate when clicked", () => {
    render(
      <PersonalRatingButton
        buildingId="123"
        initialRating={null}
        onRate={mockOnRate}
        variant="inline"
      />
    );

    const buttons = screen.getAllByRole("button");
    // Click the 3rd star
    fireEvent.click(buttons[2]);

    expect(mockOnRate).toHaveBeenCalledWith("123", 3);
  });
});
