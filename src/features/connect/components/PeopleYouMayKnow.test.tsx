import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PeopleYouMayKnow } from "./PeopleYouMayKnow";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({ user: { id: "u1" } })),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/features/connect/components/UserRow", () => ({
  UserRow: ({ user }: { user: { id: string } }) => (
    <div data-testid="user-row">{user.id}</div>
  ),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => {
      // Thenable builder resolving empty sets for follows/hides lookups.
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        then: (resolve: (value: { data: unknown[] }) => unknown) =>
          Promise.resolve({ data: [] }).then(resolve),
      };
      return builder;
    }),
    rpc: vi.fn(() =>
      Promise.resolve({
        data: Array.from({ length: 5 }, (_, i) => ({
          id: `candidate-${i}`,
          username: `user${i}`,
          avatar_url: null,
        })),
      }),
    ),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PeopleYouMayKnow limit", () => {
  it("renders up to 4 suggestions by default (the /connect behavior)", async () => {
    render(<PeopleYouMayKnow />);
    const rows = await screen.findAllByTestId("user-row");
    expect(rows).toHaveLength(4);
  });

  it("caps suggestions at the given limit", async () => {
    render(<PeopleYouMayKnow layout="stacked" limit={2} heading="People to follow" />);
    const rows = await screen.findAllByTestId("user-row");
    expect(rows).toHaveLength(2);
    expect(screen.getByText("People to follow")).toBeInTheDocument();
  });
});
