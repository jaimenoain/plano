import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchInput } from "./search-input";

afterEach(cleanup);

describe("SearchInput", () => {
  it("exposes the label as the accessible name", () => {
    render(<SearchInput value="" onValueChange={vi.fn()} label="Search this collection" />);
    expect(screen.getByLabelText("Search this collection")).toBeInTheDocument();
  });

  it("reports each keystroke as a plain value", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchInput value="" onValueChange={onValueChange} label="Search" />);

    await user.type(screen.getByLabelText("Search"), "z");

    expect(onValueChange).toHaveBeenCalledWith("z");
  });

  it("only offers the clear button once there is something to clear", () => {
    const { rerender } = render(
      <SearchInput value="" onValueChange={vi.fn()} label="Search" />,
    );
    expect(screen.queryByLabelText("Clear search")).toBeNull();

    rerender(<SearchInput value="zaha" onValueChange={vi.fn()} label="Search" />);
    expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
  });

  it("empties the value from the clear button", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchInput value="zaha" onValueChange={onValueChange} label="Search" />);

    await user.click(screen.getByLabelText("Clear search"));

    expect(onValueChange).toHaveBeenCalledWith("");
  });

  it("empties the value on Escape", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchInput value="zaha" onValueChange={onValueChange} label="Search" />);

    await user.type(screen.getByLabelText("Search"), "{Escape}");

    expect(onValueChange).toHaveBeenCalledWith("");
  });

  it("leaves Escape alone when the field is already empty, so dialogs still close", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchInput value="" onValueChange={onValueChange} label="Search" />);

    await user.type(screen.getByLabelText("Search"), "{Escape}");

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
