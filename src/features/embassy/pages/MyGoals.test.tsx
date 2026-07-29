import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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

const rpc = vi.fn(async (name: string) => {
  if (name === "get_chapter_tasks") return { data: CHAPTER_TASKS, error: null };
  if (name === "get_my_ambassador_goals") return { data: [], error: null };
  return { data: null, error: null };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseQuery(MEMBERSHIP)),
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

vi.mock("@/features/embassy/api/suggestedGoals", () => ({
  fetchSuggestedGoals: vi.fn(async () => []),
}));

import MyGoalsPage from "./MyGoals";

describe("MyGoalsPage (ambassador dashboard)", () => {
  beforeEach(() => {
    rpc.mockClear();
  });

  it("leads with open tasks, above the suggested 'Start here' queue", async () => {
    renderWithProviders(<MyGoalsPage />);

    const openTasks = await screen.findByRole("heading", { name: /open tasks/i });
    const startHere = await screen.findByRole("heading", { name: /start here/i });

    // DOCUMENT_POSITION_FOLLOWING (4) — "Start here" comes after "Open tasks".
    expect(openTasks.compareDocumentPosition(startHere) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  it("puts tasks assigned to the viewer ahead of the rest of the chapter's", async () => {
    renderWithProviders(<MyGoalsPage />);

    await waitFor(() => expect(screen.getByText("My assigned task")).toBeInTheDocument());
    const mine = screen.getByText("My assigned task");
    const theirs = screen.getByText("Someone else's task");

    expect(mine.compareDocumentPosition(theirs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
