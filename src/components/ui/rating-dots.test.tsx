import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RatingDots } from "./rating-dots";

afterEach(cleanup);

describe("RatingDots", () => {
  it("renders nothing for zero / null / undefined (never an empty ring)", () => {
    expect(render(<RatingDots rating={0} />).container).toBeEmptyDOMElement();
    expect(render(<RatingDots rating={null} />).container).toBeEmptyDOMElement();
    expect(render(<RatingDots rating={undefined} />).container).toBeEmptyDOMElement();
  });

  it("renders exactly the earned dots — never padded with placeholders", () => {
    render(<RatingDots rating={2} />);
    const group = screen.getByRole("img", { name: "2 distinctions" });
    expect(group.querySelectorAll("span[aria-hidden]")).toHaveLength(2);
  });

  it("uses a singular label for one distinction", () => {
    render(<RatingDots rating={1} />);
    const group = screen.getByRole("img", { name: "1 distinction" });
    expect(group.querySelectorAll("span[aria-hidden]")).toHaveLength(1);
  });

  it("clamps values above three", () => {
    render(<RatingDots rating={5} />);
    const group = screen.getByRole("img", { name: "3 distinctions" });
    expect(group.querySelectorAll("span[aria-hidden]")).toHaveLength(3);
  });
});
