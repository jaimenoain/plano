import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ArchitectStatement } from "@/components/ArchitectStatement";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

describe("ArchitectStatement Component", () => {
  // Mock scrollHeight/clientHeight
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      value: 200, // Large content
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: 100, // Small container (clamped)
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing if statement is empty and not editing", () => {
    const { container } = render(
      <ArchitectStatement statement="" isEditing={false} onChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders statement when provided", () => {
    const text = "This is a statement.";
    render(<ArchitectStatement statement={text} isEditing={false} onChange={vi.fn()} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("shows 'Read more' button when content overflows", () => {
    const longText = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6";
    render(<ArchitectStatement statement={longText} isEditing={false} onChange={vi.fn()} />);

    // Check if Read more button is present
    const readMoreBtn = screen.getByText("Read more");
    expect(readMoreBtn).toBeInTheDocument();
  });

  it("toggles content expansion when 'Read more' is clicked", () => {
    const longText = "Long content...";
    render(<ArchitectStatement statement={longText} isEditing={false} onChange={vi.fn()} />);

    const button = screen.getByText("Read more");
    fireEvent.click(button);

    expect(screen.getByText("Read less")).toBeInTheDocument();

    // Verify line-clamp class is removed (implementation detail check)
    const p = screen.getByText(longText);
    expect(p).not.toHaveClass("line-clamp-5");

    // Toggle back
    fireEvent.click(screen.getByText("Read less"));
    expect(screen.getByText("Read more")).toBeInTheDocument();
    expect(p).toHaveClass("line-clamp-5");
  });

  it("renders textarea when in editing mode", () => {
    render(<ArchitectStatement statement="Edit me" isEditing={true} onChange={vi.fn()} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("Edit me");
  });
});
