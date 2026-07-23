
// @vitest-environment happy-dom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { PersonalRatingButton } from "./PersonalRatingButton";

// Mock framer-motion to avoid animation issues in test environment. Covers
// MichelinRatingInput's internal motion.button usage too.
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
    cleanup();
  });

  it("renders the four MichelinRatingInput tiers, with the current rating checked", () => {
    render(
      <PersonalRatingButton
        buildingId="123"
        initialRating={2}
        onRate={mockOnRate}
        variant="inline"
      />
    );

    // Discrete four-tier radiogroup — a reward ladder, not three toggle slots.
    const group = screen.getByRole("radiogroup", { name: /award rating/i });
    const tiers = screen.getAllByRole("radio");
    expect(tiers).toHaveLength(4);
    expect(tiers.map((t) => t.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Interesting"),
        expect.stringContaining("Impressive"),
        expect.stringContaining("Essential"),
        expect.stringContaining("Masterpiece"),
      ]),
    );

    // initialRating=2 -> "Essential" tier is the checked radio.
    const essential = screen.getByRole("radio", { name: /essential/i });
    expect(essential.getAttribute("aria-checked")).toBe("true");
    expect(group).toContainElement(essential);
  });

  it("calls onRate with the clicked tier's value", () => {
    render(
      <PersonalRatingButton
        buildingId="123"
        initialRating={null}
        onRate={mockOnRate}
        variant="inline"
      />
    );

    // Click "Essential" (tier value 2) by its accessible name, not a positional index.
    fireEvent.click(screen.getByRole("radio", { name: /essential/i }));

    expect(mockOnRate).toHaveBeenCalledWith("123", 2);
  });

  it("popover variant: opens on trigger click and reports the selected tier", () => {
    render(
      <PersonalRatingButton
        buildingId="123"
        initialRating={null}
        onRate={mockOnRate}
        variant="popover"
        label="Rate"
      />
    );

    // No rating yet — trigger shows the plain label, not RatingDots.
    const trigger = screen.getByRole("button", { name: "Rate" });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("radio", { name: /impressive/i }));

    expect(mockOnRate).toHaveBeenCalledWith("123", 1);
  });

  describe("collapsible variant", () => {
    it("collapsed: shows only the selected tier summary, no radiogroup until clicked", () => {
      render(
        <PersonalRatingButton
          buildingId="123"
          initialRating={2}
          onRate={mockOnRate}
          variant="collapsible"
        />
      );

      // Summary shows the chosen tier's label + hint...
      const summary = screen.getByRole("button", { name: /edit rating/i });
      expect(summary.textContent).toContain("Essential");
      expect(summary.textContent).toContain("Worth a journey");

      // ...and the full four-tier picker is NOT rendered yet.
      expect(screen.queryByRole("radiogroup")).toBeNull();
    });

    it("expands on click, reports the selected tier, then collapses", () => {
      render(
        <PersonalRatingButton
          buildingId="123"
          initialRating={2}
          onRate={mockOnRate}
          variant="collapsible"
        />
      );

      // Click the summary to reveal the four-tier radiogroup.
      fireEvent.click(screen.getByRole("button", { name: /edit rating/i }));
      expect(screen.getByRole("radiogroup", { name: /award rating/i })).toBeTruthy();
      expect(screen.getAllByRole("radio")).toHaveLength(4);

      // Selecting a tier reports it and collapses back to the summary.
      fireEvent.click(screen.getByRole("radio", { name: /impressive/i }));
      expect(mockOnRate).toHaveBeenCalledWith("123", 1);
      expect(screen.queryByRole("radiogroup")).toBeNull();
    });

    it("unrated: shows a prompt to rate rather than a tier summary", () => {
      render(
        <PersonalRatingButton
          buildingId="123"
          initialRating={null}
          onRate={mockOnRate}
          variant="collapsible"
        />
      );

      const summary = screen.getByRole("button", { name: /edit rating/i });
      expect(summary.textContent).toContain("Rate this building");
      expect(screen.queryByRole("radiogroup")).toBeNull();
    });
  });
});
