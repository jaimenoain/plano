export type FeedbackType = "bug" | "ux_improvement" | "feature_idea" | "other";
export type DateRange = "7d" | "30d" | "all";
export type FeedbackViewMode = "table" | "kanban";

export interface FeedbackRow {
  id: string;
  type: FeedbackType;
  message: string;
  page_url: string | null;
  user_agent: string | null;
  console_errors: string[];
  metadata: Record<string, unknown>;
  screenshot_path: string | null;
  created_at: string;
  user_id: string;
  profiles: { username: string | null } | null;
}

export const FEEDBACK_TYPES: FeedbackType[] = [
  "bug",
  "ux_improvement",
  "feature_idea",
  "other",
];

export const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug report",
  ux_improvement: "UX improvement",
  feature_idea: "Feature idea",
  other: "Other",
};

export const TYPE_COLORS: Record<FeedbackType, string> = {
  bug: "bg-feedback-destructive/10 text-feedback-destructive border-feedback-destructive/30",
  ux_improvement: "bg-brand-secondary text-text-primary border-border-default",
  feature_idea: "bg-surface-muted text-text-primary border-border-default",
  other: "bg-surface-muted text-text-secondary border-border-default",
};
