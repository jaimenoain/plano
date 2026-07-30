import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import { mockSupabaseQuery } from "@/test/mocks/supabase";

const MEMBERSHIP = {
  role: "ambassador",
  status: "active",
  onboarded_at: "2026-01-01T00:00:00Z",
  chapter_id: "chapter-1",
  preferred_tools: ["research"],
  chapter: { name: "London" },
};

// The RPC returns the chapter's tasks ordered by status then due date; the one
// assigned to the viewer deliberately comes back last so the mine-first
// ordering the dashboard applies is what's being asserted, not the RPC's.
const CHAPTER_TASKS = [
  {
    id: "t-someone-else",
    title: "Someone else's task",
    description: null,
    due_date: null,
    visibility: "chapter",
    status: "todo",
    created_by: "other",
    creator_username: "other",
    assigned_to: "other",
    assignee_username: "other",
    assignee_avatar_url: null,
    project_id: null,
    project_title: null,
    company_id: null,
    company_name: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  },
  {
    id: "t-mine",
    title: "My assigned task",
    description: null,
    due_date: null,
    visibility: "chapter",
    status: "in_progress",
    created_by: "other",
    creator_username: "other",
    assigned_to: "me",
    assignee_username: "me",
    assignee_avatar_url: null,
    project_id: null,
    project_title: null,
    company_id: null,
    company_name: null,
    created_at: "2026-07-02T00:00:00Z",
    updated_at: "2026-07-02T00:00:00Z",
  },
];

// One active goal on the photos metric — enough to render a GoalCard and to
// suppress the photos suggestion chip below.
const PHOTOS_GOAL = {
  id: "g-photos",
  user_id: "me",
  title: "Photo sprint",
  target_value: 12,
  current_value: 3,
  metric: "photos",
  status: "active",
  due_date: null,
  created_at: "2026-07-01T00:00:00Z",
};

const rpc = vi.fn(async (name: string) => {
  if (name === "get_chapter_tasks") return { data: CHAPTER_TASKS, error: null };
  if (name === "get_my_ambassador_goals") return { data: [PHOTOS_GOAL], error: null };
  return { data: null, error: null };
});

// Goal removal is a plain table delete (RLS scopes it to the owner), so record
// the ids it targets rather than asserting on a fluent-chain spy.
const deletedGoalIds: string[] = [];

type GoalsTableChain = {
  delete: () => GoalsTableChain;
  eq: (column: string, value: string) => Promise<{ error: null }>;
};

function goalsTableMock(): GoalsTableChain {
  const chain: GoalsTableChain = {
    delete: () => chain,
    eq: (_column, value) => {
      deletedGoalIds.push(value);
      return Promise.resolve({ error: null });
    },
  };
  return chain;
}

const from = vi.fn((table: string) =>
  table === "ambassador_goals" ? goalsTableMock() : mockSupabaseQuery(MEMBERSHIP),
);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => from(table),
    rpc: (name: string) => rpc(name),
  },
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "me" } }),
}));

vi.mock("@/features/embassy/api/taskFeed", () => ({
  fetchAmbassadorMyAuditTimeline: vi.fn(async () => []),
}));

vi.mock("@/features/embassy/api/startHere", () => ({
  fetchStartHereTasks: vi.fn(async () => [
    {
      id: "sh-1",
      toolKey: "research",
      title: "A suggested research item",
      context: "London",
      href: "/embassy/contribute",
      backlogCount: 3,
    },
  ]),
}));

// Only the fetch is stubbed — SuggestedGoalChips also imports the real
// filterSuggestedGoals from this module, which is what the dedupe test exercises.
vi.mock("@/features/embassy/api/suggestedGoals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/embassy/api/suggestedGoals")>()),
  fetchSuggestedGoals: vi.fn(async () => [
    { metric: "research" as const, title: "Review 3 pending research items", target: 3 },
    { metric: "photos" as const, title: "Upload 12 missing photos", target: 12 },
  ]),
}));

import MyGoalsPage from "./MyGoals";

// The dashboard chains membership → chapter tasks → suggestions, so the last
// assertion in a test can be several query round-trips deep. RTL's 1s default
// is tight enough to flake when the whole suite runs in parallel.
const SLOW = { timeout: 10_000 };

describe("MyGoalsPage (ambassador dashboard)", () => {
  beforeEach(() => {
    rpc.mockClear();
    from.mockClear();
    deletedGoalIds.length = 0;
  });

  // vitest runs without `globals`, so RTL's auto-cleanup afterEach never
  // registers — without this, one test's cards and chips leak into the next.
  afterEach(cleanup);

  it("leads with open tasks, above the suggested 'Start here' queue", async () => {
    renderWithProviders(<MyGoalsPage />);

    const openTasks = await screen.findByRole("heading", { name: /open tasks/i }, SLOW);
    const startHere = await screen.findByRole("heading", { name: /start here/i }, SLOW);

    // DOCUMENT_POSITION_FOLLOWING (4) — "Start here" comes after "Open tasks".
    expect(openTasks.compareDocumentPosition(startHere) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  it("puts tasks assigned to the viewer ahead of the rest of the chapter's", async () => {
    renderWithProviders(<MyGoalsPage />);

    await waitFor(() => expect(screen.getByText("My assigned task")).toBeInTheDocument(), SLOW);
    const mine = screen.getByText("My assigned task");
    const theirs = screen.getByText("Someone else's task");

    expect(mine.compareDocumentPosition(theirs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("removes an active goal once the confirmation is accepted", async () => {
    renderWithProviders(<MyGoalsPage />);

    const remove = await screen.findByRole("button", { name: "Remove goal: Photo sprint" }, SLOW);
    await userEvent.click(remove);

    await screen.findByRole("heading", { name: "Remove goal" }, SLOW);
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(deletedGoalIds).toEqual(["g-photos"]), SLOW);
  });

  it("keeps the goal when the confirmation is cancelled", async () => {
    renderWithProviders(<MyGoalsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Remove goal: Photo sprint" }, SLOW),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }, SLOW));

    expect(deletedGoalIds).toEqual([]);
    expect(screen.getByText("Photo sprint")).toBeInTheDocument();
  });

  it("hides the suggested chip for a metric that already has an active goal", async () => {
    renderWithProviders(<MyGoalsPage />);

    // research has no goal yet, so its chip stays; photos is already covered.
    await screen.findByRole("button", { name: "Review 3 pending research items" }, SLOW);
    expect(
      screen.queryByRole("button", { name: "Upload 12 missing photos" }),
    ).not.toBeInTheDocument();
  });
});
