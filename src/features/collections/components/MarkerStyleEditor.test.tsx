import { render, screen, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { MarkerStyleEditor } from "./MarkerStyleEditor";

afterEach(cleanup);

describe("MarkerStyleEditor", () => {
  it("renders one row per fixed bucket for a non-custom method", () => {
    render(
      <MarkerStyleEditor method="rating_member" customCategories={[]} value={{}} onChange={vi.fn()} />,
    );
    // rating_member has 3 fixed buckets: r3, r2, other
    expect(screen.getAllByLabelText(/marker colour/i)).toHaveLength(3);
  });

  it("renders one row per existing custom category, none when there are none", () => {
    const { rerender } = render(
      <MarkerStyleEditor method="custom" customCategories={[]} value={{}} onChange={vi.fn()} />,
    );
    expect(screen.queryAllByLabelText(/marker colour/i)).toHaveLength(0);
    expect(screen.getByText(/add a category above/i)).toBeInTheDocument();

    rerender(
      <MarkerStyleEditor
        method="custom"
        customCategories={[
          { id: "cat-1", label: "Must Visit", color: "#123456" },
          { id: "cat-2", label: "Maybe", color: "#654321" },
        ]}
        value={{}}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getAllByLabelText(/marker colour/i)).toHaveLength(2);
    expect(screen.getByText("Must Visit")).toBeInTheDocument();
    expect(screen.getByText("Maybe")).toBeInTheDocument();
  });

  it("shows the owner's saved colour, not the default, when an override exists", () => {
    render(
      <MarkerStyleEditor
        method="uniform"
        customCategories={[]}
        value={{ uniform: { all: { color: "#00ff00", size: "sm" } } }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/marker colour/i)).toHaveValue("#00ff00");
    expect(screen.getByRole("radio", { name: /marker size sm/i })).toHaveAttribute("data-state", "on");
  });
});
