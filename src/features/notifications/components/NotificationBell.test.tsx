import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { NotificationBell } from "./NotificationBell";

describe("NotificationBell", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders no badge when there are no unread notifications", () => {
    render(<NotificationBell count={0} />);
    expect(screen.queryByText(/unread/)).toBeNull();
  });

  it("shows the exact count when 9 or fewer", () => {
    render(<NotificationBell count={3} />);
    expect(screen.getByText("3", { selector: "[aria-hidden]" })).toBeInTheDocument();
    expect(screen.getByText("3 unread")).toBeInTheDocument();
  });

  it("caps the visible number at 9+ once past nine", () => {
    render(<NotificationBell count={42} />);
    expect(screen.getByText("9+", { selector: "[aria-hidden]" })).toBeInTheDocument();
    expect(screen.getByText("42 unread")).toBeInTheDocument();
  });
});
