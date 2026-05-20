import { describe, expect, it } from "vitest";
import { buildFeedbackClaudePrompt } from "./buildFeedbackClaudePrompt";
import type { FeedbackRow } from "./feedbackTypes";

const baseRow: FeedbackRow = {
  id: "fb-123",
  type: "bug",
  message: "The map pin does not show on building detail.",
  page_url: "https://plano.app/buildings/abc",
  user_agent: "Mozilla/5.0",
  console_errors: ["TypeError: Cannot read property 'x'"],
  metadata: { screenWidth: 1440, language: "en-GB" },
  screenshot_path: "user-1/shot.png",
  created_at: "2026-05-19T12:00:00.000Z",
  user_id: "user-uuid",
  profiles: { username: "jane" },
  status: "open",
  status_changed_at: null,
  outcome_notes: null,
  needs_user_input: false,
};

describe("buildFeedbackClaudePrompt", () => {
  it("states user-submitted feedback and includes key metadata", () => {
    const prompt = buildFeedbackClaudePrompt(baseRow);

    expect(prompt).toContain("user-submitted feedback");
    expect(prompt).toContain(baseRow.message);
    expect(prompt).toContain("Bug report");
    expect(prompt).toContain("fb-123");
    expect(prompt).toContain("@jane");
    expect(prompt).toContain("user-uuid");
    expect(prompt).toContain(baseRow.page_url!);
    expect(prompt).toContain("Mozilla/5.0");
    expect(prompt).toContain("TypeError: Cannot read property 'x'");
    expect(prompt).toContain("screenWidth");
    expect(prompt).toContain("user-1/shot.png");
    expect(prompt).toContain("Claude Code");
  });
});
