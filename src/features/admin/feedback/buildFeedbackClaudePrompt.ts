import { TYPE_LABELS, type FeedbackRow, type FeedbackType } from "./feedbackTypes";

function formatMetadata(metadata: Record<string, unknown>): string {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return "None captured.";
  return entries.map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join("\n");
}

function formatConsoleErrors(errors: string[]): string {
  if (errors.length === 0) return "None captured.";
  return errors.map((e, i) => `${i + 1}. ${e}`).join("\n");
}

function taskForType(type: FeedbackType): string {
  switch (type) {
    case "bug":
      return "Investigate and fix the bug described below.";
    case "ux_improvement":
      return "Improve the UX described below using existing design tokens and component patterns.";
    case "feature_idea":
      return "Implement the feature or improvement described below as a focused vertical slice.";
    case "other":
      return "Address the user feedback described below appropriately.";
  }
}

/** Pre-written prompt for pasting into Claude Code from admin feedback review. */
export function buildFeedbackClaudePrompt(row: FeedbackRow): string {
  const username = row.profiles?.username ?? null;
  const reporter = username
    ? `@${username} (user_id: ${row.user_id})`
    : `user_id: ${row.user_id}`;
  const submittedAt = new Date(row.created_at).toISOString();
  const browserBlock = row.user_agent
    ? `\n- Browser / user agent: ${row.user_agent}`
    : "";
  const screenshotBlock = row.screenshot_path
    ? `\n## Screenshot\nA screenshot was attached (storage path: \`${row.screenshot_path}\`). Open it in Admin → Feedback if visual context is needed.\n`
    : "";

  return `This is user-submitted feedback from the Plano app (architecture mapping SaaS). ${taskForType(row.type)}

## User message
${row.message.trim()}

## Feedback classification
- Type: ${TYPE_LABELS[row.type]}
- Feedback ID: ${row.id}
- Submitted (UTC): ${submittedAt}
- Reporter: ${reporter}

## Where it happened
- Page URL: ${row.page_url ?? "(not captured)"}${browserBlock}

## Environment & metadata
${formatMetadata(row.metadata)}

## Console errors (captured in-browser)
${formatConsoleErrors(row.console_errors)}
${screenshotBlock}## Instructions for Claude Code
1. Read docs/AI_STATUS.md (KNOWN_ISSUES) and follow .cursor/rules/ for this repo.
2. Search the codebase for the route, component, or API related to the page URL before changing code.
3. Use docs/DATA_CONTRACT.md and existing patterns; do not invent schema fields.
4. Implement the smallest correct fix or slice; run turbo build, typecheck, and lint before finishing.
5. In your summary, note that this work came from user feedback id ${row.id}.
`.trim();
}
