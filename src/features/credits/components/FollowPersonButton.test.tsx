// @vitest-environment happy-dom
// Person ↔ user page alignment PR 2: follow an unclaimed person, and the
// person_claimed notification rendering.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FollowPersonButton } from "./FollowPersonButton";
import {
  notificationIcon,
  notificationTitle,
  notificationText,
} from "@/features/notifications/components/notificationContent";
import type { Notification } from "@/features/notifications/types";

const mocks = vi.hoisted(() => ({
  followPerson: vi.fn(),
  unfollowPerson: vi.fn(),
  getPersonFollowState: vi.fn(),
  user: { id: "viewer-1", email: "v@test.com" } as { id: string; email: string } | null,
}));

vi.mock("../api/personFollows", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/personFollows")>();
  return {
    ...actual,
    followPerson: (...args: unknown[]) => mocks.followPerson(...args),
    unfollowPerson: (...args: unknown[]) => mocks.unfollowPerson(...args),
    getPersonFollowState: (...args: unknown[]) => mocks.getPersonFollowState(...args),
  };
});

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function renderButton() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <FollowPersonButton personId="p1" personName="Jane Doe" />
    </QueryClientProvider>,
  );
}

describe("FollowPersonButton", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mocks.followPerson.mockReset().mockResolvedValue(undefined);
    mocks.unfollowPerson.mockReset().mockResolvedValue(undefined);
    mocks.getPersonFollowState.mockReset().mockResolvedValue(false);
    mocks.user = { id: "viewer-1", email: "v@test.com" };
  });

  it("renders nothing when logged out", () => {
    mocks.user = null;
    const { container } = renderButton();
    expect(container).toBeEmptyDOMElement();
  });

  it("follows on click and flips to Following", async () => {
    const user = userEvent.setup();
    renderButton();

    const btn = await screen.findByRole("button", { name: /Follow/i });
    await user.click(btn);

    await waitFor(() => {
      expect(mocks.followPerson).toHaveBeenCalledWith("p1", "viewer-1");
    });
    // Pointer is still over the button after the click, so the following state
    // renders its hover affordance ("Unfollow").
    expect(await screen.findByRole("button", { name: /Following|Unfollow/i })).toBeInTheDocument();
  });

  it("unfollows when already following", async () => {
    mocks.getPersonFollowState.mockResolvedValue(true);
    const user = userEvent.setup();
    renderButton();

    const btn = await screen.findByRole("button", { name: /Following/i });
    await user.click(btn);

    await waitFor(() => {
      expect(mocks.unfollowPerson).toHaveBeenCalledWith("p1", "viewer-1");
    });
  });
});

describe("person_claimed notification content", () => {
  const base: Notification = {
    id: "n1",
    created_at: "2026-07-29T00:00:00Z",
    type: "person_claimed",
    is_read: false,
    actor_id: "claimer-1",
    actor: { username: "jane", avatar_url: null },
    metadata: { person_id: "p1", person_name: "Jane Doe", person_slug: "jane-doe" },
  };

  it("renders title, icon, and body with the person name", () => {
    expect(notificationTitle(base)).toBe("Profile Claimed");
    expect(notificationIcon(base.type)).toBeTruthy();

    render(<div>{notificationText(base)}</div>);
    expect(screen.getByText("jane")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText(/you now follow/)).toBeInTheDocument();
  });
});
