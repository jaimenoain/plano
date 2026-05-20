export type FeedbackType = "bug" | "ux_improvement" | "feature_idea" | "other";

export type FeedbackStatus =
  | "open"
  | "in_review"
  | "testing"
  | "resolved"
  | "wont_fix"
  | "duplicate"
  | "backlog";

export type DateRange = "7d" | "30d" | "all";
export type FeedbackViewMode = "kanban" | "table";

export const TERMINAL_STATUSES: FeedbackStatus[] = [
  "resolved",
  "wont_fix",
  "duplicate",
];

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
  status: FeedbackStatus;
  status_changed_at: string | null;
  outcome_notes: string | null;
  needs_user_input: boolean;
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

export const TYPE_LABELS_SHORT: Record<FeedbackType, string> = {
  bug: "Bug",
  ux_improvement: "UX",
  feature_idea: "Feature",
  other: "Other",
};

export const TYPE_COLORS: Record<FeedbackType, string> = {
  bug: "bg-feedback-destructive/10 text-feedback-destructive border-feedback-destructive/30",
  ux_improvement: "bg-brand-secondary text-text-primary border-border-default",
  feature_idea: "bg-surface-muted text-text-primary border-border-default",
  other: "bg-surface-muted text-text-secondary border-border-default",
};

export const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_review", label: "In review" },
  { value: "testing", label: "Testing" },
  { value: "resolved", label: "Resolved" },
  { value: "wont_fix", label: "Won't fix" },
  { value: "backlog", label: "Backlog" },
  { value: "duplicate", label: "Duplicate" },
];

export const KANBAN_STATUSES = STATUS_OPTIONS.filter((o) => o.value !== "duplicate");

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "Open",
  in_review: "In review",
  testing: "Testing",
  resolved: "Resolved",
  wont_fix: "Won't fix",
  duplicate: "Duplicate",
  backlog: "Backlog",
};

export const STATUS_COLORS: Record<FeedbackStatus, string> = {
  open: "bg-amber-500/10 text-amber-800 border-amber-500/30",
  in_review: "bg-brand-primary/10 text-brand-primary border-brand-primary/30",
  testing: "bg-violet-500/10 text-violet-800 border-violet-500/30",
  resolved: "bg-feedback-success/10 text-feedback-success border-feedback-success/30",
  wont_fix: "bg-surface-muted text-text-secondary border-border-default",
  duplicate: "bg-feedback-destructive/10 text-feedback-destructive border-feedback-destructive/30",
  backlog: "bg-surface-muted text-text-secondary border-border-default",
};

export const COLUMN_DOT: Record<FeedbackStatus, string> = {
  open: "bg-amber-400",
  in_review: "bg-brand-primary",
  testing: "bg-violet-400",
  resolved: "bg-feedback-success",
  wont_fix: "bg-border-strong",
  duplicate: "bg-feedback-destructive",
  backlog: "bg-text-disabled",
};
