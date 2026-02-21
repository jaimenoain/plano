// @vitest-environment happy-dom
import * as matchers from "@testing-library/jest-dom/matchers";
import { render, screen, act, cleanup } from "@testing-library/react";
import { ItineraryGenerationOverlay } from "./ItineraryGenerationOverlay";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

expect.extend(matchers);

// Mock the UI components to avoid Radix/Portal complexity in unit tests
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (
    open ? <div data-testid="dialog-root">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-title">{children}</div>,
  DialogOverlay: () => <div data-testid="dialog-overlay" />,
  DialogPortal: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-portal">{children}</div>,
}));

// Mock framer-motion to avoid animation issues and opacity: 0
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    circle: ({ children, ...props }: any) => <circle {...props}>{children}</circle>,
    path: ({ children, ...props }: any) => <path {...props}>{children}</path>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("ItineraryGenerationOverlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders the first message initially", () => {
    render(<ItineraryGenerationOverlay open={true} />);
    expect(screen.getByText("Analyzing geographical zones...")).toBeInTheDocument();
  });

  it("cycles through messages over time", () => {
    render(<ItineraryGenerationOverlay open={true} />);

    expect(screen.getByText("Analyzing geographical zones...")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Charting the perfect route...")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Optimizing travel times...")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(<ItineraryGenerationOverlay open={false} />);
    expect(screen.queryByText("Analyzing geographical zones...")).not.toBeInTheDocument();
  });

  it("resets message index when closed and reopened", () => {
      const { rerender } = render(<ItineraryGenerationOverlay open={true} />);

      act(() => {
          vi.advanceTimersByTime(2000);
      });
      expect(screen.getByText("Charting the perfect route...")).toBeInTheDocument();

      rerender(<ItineraryGenerationOverlay open={false} />);
      expect(screen.queryByText("Charting the perfect route...")).not.toBeInTheDocument();

      rerender(<ItineraryGenerationOverlay open={true} />);
      expect(screen.getByText("Analyzing geographical zones...")).toBeInTheDocument();
  });
});
