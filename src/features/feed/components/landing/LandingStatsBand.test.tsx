import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LandingStatsBand } from "./LandingStatsBand";

const mocks = vi.hoisted(() => ({ useLandingStats: vi.fn() }));

vi.mock("../../hooks/useLandingStats", () => ({ useLandingStats: mocks.useLandingStats }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LandingStatsBand", () => {
  it("formats live counts with thousands separators", () => {
    mocks.useLandingStats.mockReturnValue({
      data: [{ label: "Buildings catalogued", value: 12408, minimum: 1 }],
      isPending: false,
      isError: false,
    });

    render(<LandingStatsBand />);

    expect(screen.getByText("12,408")).toBeInTheDocument();
    expect(screen.getByText("Buildings catalogued")).toBeInTheDocument();
  });

  it("omits a cell whose count is zero rather than showing a hollow 0", () => {
    mocks.useLandingStats.mockReturnValue({
      data: [
        { label: "Cities", value: 184, minimum: 1 },
        { label: "Buildings catalogued", value: 0, minimum: 1 },
      ],
      isPending: false,
      isError: false,
    });

    render(<LandingStatsBand />);

    expect(screen.getByText("184")).toBeInTheDocument();
    expect(screen.queryByText("Buildings catalogued")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("withholds a cell until its count clears the cell's own minimum", () => {
    mocks.useLandingStats.mockReturnValue({
      data: [{ label: "Members", value: 999, minimum: 1000 }],
      isPending: false,
      isError: false,
    });

    const { container } = render(<LandingStatsBand />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the cell once its count reaches the minimum", () => {
    mocks.useLandingStats.mockReturnValue({
      data: [{ label: "Members", value: 1000, minimum: 1000 }],
      isPending: false,
      isError: false,
    });

    render(<LandingStatsBand />);

    expect(screen.getByText("1,000")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
  });

  it("renders a skeleton while counts load, never zeros", () => {
    mocks.useLandingStats.mockReturnValue({ data: undefined, isPending: true, isError: false });

    const { container } = render(<LandingStatsBand />);

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders nothing when the counts cannot be read", () => {
    mocks.useLandingStats.mockReturnValue({ data: undefined, isPending: false, isError: true });

    const { container } = render(<LandingStatsBand />);

    expect(container).toBeEmptyDOMElement();
  });

  it("drops to a three-column band when only three counts are live", () => {
    mocks.useLandingStats.mockReturnValue({
      data: [
        { label: "Buildings catalogued", value: 10, minimum: 1 },
        { label: "Cities", value: 2, minimum: 1 },
        { label: "Architects & practices", value: 7, minimum: 1 },
        { label: "Members", value: 15, minimum: 1000 },
      ],
      isPending: false,
      isError: false,
    });

    render(<LandingStatsBand />);

    expect(screen.getByRole("region", { name: "Plano in numbers" })).toHaveClass("md:grid-cols-3");
  });
});
