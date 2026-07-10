import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MichelinRatingInput } from "./michelin-rating-input";

afterEach(cleanup);

describe("MichelinRatingInput", () => {
  it("offers the four award tiers as discrete labelled choices", () => {
    render(<MichelinRatingInput value={0} onChange={() => {}} />);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    for (const label of ["Interesting", "Impressive", "Essential", "Masterpiece"]) {
      expect(screen.getByRole("radio", { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it("marks the current value as checked", () => {
    render(<MichelinRatingInput value={2} onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: /Essential/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Interesting/ })).not.toBeChecked();
  });

  it("renders only each tier's earned dots — no empty rings", () => {
    render(<MichelinRatingInput value={0} onChange={() => {}} />);
    // Interesting (0) shows nothing; the higher tiers show exactly their dots.
    expect(screen.queryByRole("img", { name: /0 distinction/ })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "1 distinction" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2 distinctions" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "3 distinctions" })).toBeInTheDocument();
  });

  it("calls onChange with the tier value when a choice is clicked", () => {
    const onChange = vi.fn();
    render(<MichelinRatingInput value={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /Masterpiece/ }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
