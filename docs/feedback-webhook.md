# Feedback Webhook

Every new feedback submission fires an HTTP POST to the configured webhook URL. This lets you route notifications to Slack, Discord, Linear, or any HTTP endpoint.

## Configuration

Set the `FEEDBACK_WEBHOOK_URL` environment variable to any HTTPS endpoint:

```bash
# .env.local (development)
FEEDBACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Vercel / production — add via project settings
FEEDBACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

The variable is read at request time by the feedback API route (`src/features/feedback/api/feedback.route.ts`). If it is unset or empty, no webhook call is made.

## Payload

The POST body is JSON with `Content-Type: application/json`:

```json
{
  "type":       "bug",
  "message":    "The save button doesn't work on mobile…",
  "pageUrl":    "https://plano.app/building/123",
  "createdAt":  "2026-04-27T12:00:00.000Z"
}
```

| Field | Type | Description |
|---|---|---|
| `type` | `"bug" \| "ux_improvement" \| "feature_idea" \| "other"` | Feedback category selected by the user |
| `message` | `string` | First 200 characters of the feedback message |
| `pageUrl` | `string \| null` | URL of the page where the widget was submitted from |
| `createdAt` | `string` (ISO 8601) | Submission timestamp |

## Error handling

Webhook errors are swallowed — a bad URL, unreachable server, or non-2xx response will log a warning to the server console but will **not** affect the user's submission. Users always receive a 201 success response regardless of webhook outcome.
