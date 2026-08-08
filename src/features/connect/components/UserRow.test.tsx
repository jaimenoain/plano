import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { UserRow } from "./UserRow";

vi.mock("@/features/profile/components/FollowButton", () => ({
  FollowButton: () => <button type="button">Follow</button>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }),
    },
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const user = { id: "u1", username: "Ada", avatar_url: null };

describe("UserRow stacked layout", () => {
  it("links the identity block to the user's profile", () => {
    render(
      <MemoryRouter>
        <UserRow user={user} layout="stacked" />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /ada/i });
    expect(link).toHaveAttribute("href", "/profile/ada");
  });

  it("omits the mutual-follows line when there are no mutuals", () => {
    render(
      <MemoryRouter>
        <UserRow user={user} layout="stacked" />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/followed by/i)).not.toBeInTheDocument();
  });

  it("shows mutual follows when provided", () => {
    render(
      <MemoryRouter>
        <UserRow
          user={user}
          layout="stacked"
          mutualFollows={[{ id: "m1", username: "Bea", avatar_url: null }]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/followed by bea/i)).toBeInTheDocument();
  });

  it("calls onHide without navigating", () => {
    const onHide = vi.fn();
    render(
      <MemoryRouter>
        <UserRow user={user} layout="stacked" onHide={onHide} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTitle("Hide suggestion"));
    expect(onHide).toHaveBeenCalledTimes(1);
  });
});
