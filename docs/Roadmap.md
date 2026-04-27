# Feedback System — Implementation Brief

A complete, production-ready in-app feedback widget that authenticated users can use to
submit bug reports, UX improvements, and feature ideas directly from any page of the web
app. Submissions are stored in the database alongside automatically captured diagnostic
context (user identity, browser, page URL, console errors). An admin view lets the team
triage feedback without leaving the app. A webhook fires on every submission so
notifications can be sent to Slack or any HTTP endpoint.

---

## Phase 0 — Codebase reconnaissance (do this first)

Before writing any code, read the codebase to answer these questions. Record the answers
as inline comments in your plan — they determine how every subsequent file is structured.

1. **Framework & router** — Is this Next.js App Router, Pages Router, Remix, SvelteKit,
   or something else? Where do API/server routes live?

2. **Database** — Is this Supabase (Postgres + RLS), Prisma, Drizzle, raw SQL, or
   another ORM? Where do migrations live? Is there an existing pattern for running them?

3. **Auth** — How is the current user identified on the server? Find the helper (e.g.
   `requireSession()`, `getServerSession()`, `auth()`) used in existing API routes and
   use the same one.

4. **Type generation** — If using Supabase, find the command that regenerates
   `database.types.ts`. If using Prisma, the command is `prisma generate`. Record the
   exact command.

5. **Design system** — Is there Tailwind CSS? Shadcn/ui? A custom component library?
   What CSS variables are in use (e.g. `--primary`, `--background`, `--border`)? Find
   an existing dialog or modal component and match its style exactly.

6. **Admin section** — Is there an `/admin` route group or equivalent? Find where the
   admin navigation links are defined and what role/permission gate protects the section.

7. **File naming conventions** — Are components PascalCase `.tsx`? Are server actions in
   `lib/actions/`? Are API routes in `app/api/` or `pages/api/`? Match whatever is used.

8. **Monorepo structure** — Are there multiple packages (e.g. `packages/supabase`,
   `apps/web`)? If so, where do shared types live and how are they imported?

Do not proceed to Phase 1 until all eight questions are answered.

---

## Phase 1 — Database

### 1.1 Create the feedback table

Create a migration file in the project's migrations directory. Name it with a timestamp
prefix following the existing convention (e.g. `20260416000000_create_feedback.sql` for
Supabase, or `YYYYMMDDHHMMSS_create_feedback` for Prisma/Drizzle).

The table must have these columns:

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key, default to a random UUID |
| `user_id` | UUID / FK | Foreign key to the users table. NOT NULL |
| `type` | Enum or varchar | One of: `bug`, `ux_improvement`, `feature_idea`, `other` |
| `message` | Text | NOT NULL. Minimum 10 characters enforced at DB level if possible |
| `page_url` | Text | Nullable |
| `user_agent` | Text | Nullable |
| `console_errors` | JSON / Text[] | Defaults to empty array |
| `metadata` | JSON | Defaults to empty object |
| `screenshot_path` | Text | Nullable. Storage path for optional screenshot |
| `created_at` | Timestamptz | NOT NULL, default now() |

If the project is multi-tenant (has a `tenant_id` column pattern elsewhere), add a
`tenant_id` column with the same type and foreign key as other tables in the schema.
Check existing tables to confirm whether multi-tenancy applies.

Add indexes on `user_id` and `created_at DESC`.

**If using Supabase**, also add Row Level Security:

```sql
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users may only insert their own feedback
CREATE POLICY "Users insert own feedback" ON feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins may read all feedback for the tenant
-- Adapt the role check to match the existing RLS pattern in this project
CREATE POLICY "Admins read feedback" ON feedback
  FOR SELECT TO authenticated
  USING (/* match the existing admin role check pattern */);
```

Look at two or three existing RLS policies in the project and replicate their exact
`auth.jwt()` access pattern rather than inventing a new one.

**If using Prisma or Drizzle**, add the model/schema definition in the appropriate
schema file and run `prisma migrate dev` or `drizzle-kit generate`.

### 1.2 Regenerate types

After applying the migration, run the project's type generation command. If it is a
Supabase project, this is typically:

```bash
supabase gen types typescript --local > <path to database.types.ts>
```

Find the exact output path by looking at where `database.types.ts` currently lives.

---

## Phase 2 — Console error capture

**File:** `<components directory>/providers/console-error-interceptor.tsx` (or `.svelte`,
`.vue`, etc. — match the project's component file extension)

This is a client-side component that intercepts `console.error` calls and stores the last
10 messages in a **module-level array** so the feedback widget can read them at submit time
without prop drilling.

Requirements:
- Export a `capturedErrors: string[]` array at module level (not inside the component).
- On mount, replace `console.error` with a wrapper that: formats `Error` instances as
  `"ErrorName: message"`, pushes to the front of `capturedErrors`, trims the array to
  10 items, and then calls the original `console.error`.
- On unmount, restore the original `console.error`.
- Export the component as the default or named export following the project's convention.
- The component renders nothing (returns `null`).

Mount this component once, high in the component tree, so it captures errors from the
entire app. In a Next.js App Router project this means adding it to the root or
authenticated layout. In Remix, add it to the root route. Match wherever global
providers are mounted.

---

## Phase 3 — API / server route

Create a server-side endpoint at a logical URL such as `/api/feedback` (Next.js),
`/feedback` (Remix action), or equivalent.

The endpoint must:

1. **Authenticate** — Use the same auth helper found in Phase 0. If the user is not
   authenticated, return 401. Extract `userId` (and `tenantId` if multi-tenant).

2. **Validate input** — Use the project's existing validation library (Zod, Yup, Valibot,
   or native). Schema:
   - `type`: one of the four enum values (required)
   - `message`: string, min 10, max 2000 (required)
   - `pageUrl`: string (optional)
   - `userAgent`: string (optional)
   - `consoleErrors`: string array (optional)
   - `metadata`: record of unknown values (optional)
   - `screenshotDataUrl`: string (optional)

3. **Rate limit** — Before inserting, count the user's submissions in the last hour.
   If 10 or more exist, return 429 with `{ error: 'Too many submissions' }`.

4. **Insert** — Insert a row into `feedback` with all provided fields plus `user_id`
   (and `tenant_id` if applicable). Use `.select('id').single()` or equivalent to get
   the new row's ID back.

5. **Handle screenshot** — If `screenshotDataUrl` is present:
   - Strip the `data:image/webp;base64,` prefix.
   - Decode the remaining base64 string to bytes.
   - Upload to a private storage bucket named `feedback-screenshots` at the path
     `<tenantId or userId>/<feedbackId>.webp` using the service/admin client (not the
     user-scoped client, since the bucket is private).
   - Update the inserted row's `screenshot_path` with the storage path.
   - If the upload fails, log the error and continue — do not fail the request.

6. **Return** `{ ok: true }` with status 201 on success.

---

## Phase 4 — The widget component

Create `<components directory>/feedback/FeedbackWidget.tsx` (or equivalent). This is a
client component.

### 4.1 Visibility

Only render the widget if the user is authenticated. Use whatever client-side auth hook
the project already has (e.g. `useSession()`, `useAuth()`, `useUser()`). Return `null`
if there is no session.

### 4.2 Corner trigger

A `position: fixed; bottom: 0; right: 0; z-index: 50` container with `overflow: hidden`.

Inside it, an SVG triangle where the right angle sits at the bottom-right corner of the
screen. The three polygon points are: top-right, bottom-right (the right angle), and
bottom-left of the bounding box. Fill with the project's primary colour at ~75% opacity.

At rest the container is 24×24px. On hover it expands to 64×64px. Use a CSS transition
(`transition: width 0.2s ease, height 0.2s ease`) driven by a hover state. When the
dialog is open, keep the trigger at 64×64px regardless of hover state — do not let it
collapse while the dialog is visible.

Clicking the trigger opens the dialog.

### 4.3 Dialog

A fixed overlay with a semi-transparent black backdrop. Clicking the backdrop closes the
dialog (attach the click handler to the backdrop element, not the panel).

The panel is a card matching the project's existing modal/dialog style. Max width 448px.
On desktop: centered. On mobile: anchored to the bottom of the screen.

Dialog contents in order:

**Header** — "Send feedback" heading on the left, a close button (×) on the right.

**Type selector** — A 2×2 grid of toggle buttons. Each shows an emoji and a label:
- 🐛 Bug report
- ✨ UX improvement  
- 💡 Feature idea
- 💬 Other

The selected button gets a primary-colour border and a light primary-colour background
tint. Use the project's existing active/selected button style if one exists.

**Screenshot button** — Between the type selector and the textarea. Three states:
- Default: "📎 Attach screenshot" (outlined secondary button)
- Loading: subtle spinner + "Capturing…" (disabled)
- Attached: "✓ Screenshot attached" in green + an "✕ Remove" link inline

**Textarea** — 4 rows, no resize, placeholder: "Describe what happened, what you
expected, or your idea…". Use the project's existing textarea/input styles.

**Error message** — Only visible when submission fails. Show "Too many submissions,
please try again later." for 429 responses; "Something went wrong. Please try again."
otherwise.

**Footer** — Right-aligned. Cancel button (secondary) + Send feedback button (primary).

The Send button behaviour:
- If `message.trim().length < 10` on click: trigger a shake animation (see §4.4) and
  return without submitting.
- While submitting (`status === 'loading'`): disable both buttons, show "Sending…".
- On success: replace dialog contents with "✅ Thanks for the feedback!", then after
  1800ms close the dialog and reset all state (type back to `bug`, message cleared,
  screenshot cleared, status back to `idle`).

### 4.4 Shake animation

Add a `shake` keyframe to the project's CSS/Tailwind config:

```
0%, 100%  → translateX(0)
25%       → translateX(-4px)
75%       → translateX(4px)
duration: 0.3s ease-in-out
```

Apply this animation class to the Send button when the user clicks it with fewer than
10 characters. Remove the class 300ms later (toggle a boolean state).

### 4.5 Screenshot capture

```ts
async function captureScreenshot(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser' },
    })
    const video = document.createElement('video')
    video.srcObject = stream
    await new Promise<void>(resolve => { video.onloadedmetadata = () => resolve() })
    await video.play()
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    stream.getTracks().forEach(t => t.stop())
    return canvas.toDataURL('image/webp', 0.7)
  } catch {
    return null  // user denied or browser doesn't support — fail silently
  }
}
```

### 4.6 Submit payload

```ts
{
  type,
  message: message.trim(),
  pageUrl: window.location.href,
  userAgent: navigator.userAgent,
  consoleErrors: [...capturedErrors],   // from the module-level array in Phase 2
  metadata: {
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language,
    referrer: document.referrer,
  },
  ...(screenshotDataUrl ? { screenshotDataUrl } : {}),
}
```

---

## Phase 5 — Webhook notification

### 5.1 Trigger

**If using Supabase** (which has `pg_net` available), create a migration:

```sql
CREATE OR REPLACE FUNCTION notify_feedback_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  webhook_url text := current_setting('app.feedback_webhook_url', true);
BEGIN
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url     := webhook_url,
    body    := json_build_object(
                 'type',       NEW.type,
                 'message',    left(NEW.message, 200),
                 'page_url',   NEW.page_url,
                 'created_at', NEW.created_at
               )::text,
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- never let a failed webhook abort the insert
END;
$$;

CREATE TRIGGER feedback_insert_notify
  AFTER INSERT ON feedback
  FOR EACH ROW EXECUTE FUNCTION notify_feedback_insert();
```

**If not using Supabase**, add a non-blocking HTTP call at the end of the API route
instead (after the 201 response is sent, or using `waitUntil` / `context.waitUntil`
in edge runtimes):

```ts
const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL
if (webhookUrl) {
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, message: message.slice(0, 200), pageUrl, createdAt: new Date().toISOString() }),
  }).catch(err => console.error('Webhook failed:', err))
}
```

### 5.2 Documentation

Create `docs/feedback-webhook.md` (or add a section to an existing ops doc) explaining:

- How to set the webhook URL (`ALTER DATABASE` for Supabase, `.env` for others)
- The exact JSON payload shape with field descriptions
- That errors are swallowed — a bad URL will not affect users

---

## Phase 6 — Admin view

### 6.1 Data fetching

Create a server-side data fetcher (server action, loader, or tRPC procedure — match the
project's pattern). It must:

- Require authentication and confirm the user has an admin or owner role.
- Query `feedback` joined to the users table, selecting name and email fields.
- Order by `created_at DESC`, limit 200.
- Return typed rows.

### 6.2 Page

Create a page at the project's admin URL prefix (e.g. `/admin/feedback`). Pass the
fetched rows to a client component.

### 6.3 Client component

**Filter bar:**
- Type filter: "All" + one toggle per type. Client-side filtering.
- Date range: "Last 7 days" / "Last 30 days" / "All time" (default).

**Table columns:** Type (coloured pill), User (name + email), Message (80 char truncation
with ellipsis), Page URL, Submitted at (relative time preferred, e.g. "3 hours ago").

**Type pill colours:**
- `bug` — red
- `ux_improvement` — blue
- `feature_idea` — purple
- `other` — gray

Match the shade and weight to the project's existing badge/pill components if they exist.

**Expandable rows:** Clicking a row reveals a detail panel:
- Full message text
- Browser (user agent string)
- Console errors — monospace list, or the text "None" if the array is empty
- Metadata — key/value pairs
- Screenshot — if `screenshot_path` is not null, a "View screenshot" button that
  generates a 60-second signed URL and opens it in a new tab on click

**Empty state:** Centred "No feedback yet." message in the table body.

### 6.4 Navigation

Add a link labelled "Feedback" to the admin navigation. Find the exact file that renders
admin nav links and add the new entry there. Do not add it to the main app sidebar.

---

## Phase 7 — Wire everything together

Add `<ConsoleErrorInterceptor />` and `<FeedbackWidget />` to the authenticated app
layout — the same layout file that wraps all protected pages. Both components must render
inside any auth context providers so the auth hook works correctly.

Verify the import paths match the project's path alias convention (e.g. `@/components/`,
`~/components/`, or relative imports).

---

## Storage setup (if using Supabase)

Create a private storage bucket called `feedback-screenshots`. Objects should not be
publicly accessible. Add a storage INSERT policy for authenticated users scoped to their
own user/tenant path prefix. The SELECT policy should be restricted to service role only —
signed URLs are generated server-side or via admin-scoped client calls.

---

## Environment variables

Document any new environment variables introduced (e.g. `FEEDBACK_WEBHOOK_URL`,
`SUPABASE_SERVICE_ROLE_KEY` if not already present). Add them to `.env.example` or
the project's equivalent config documentation file.

---

## What NOT to do

- Do not install any new npm packages. Use libraries already in `package.json`.
- Do not invent new auth patterns — use the existing auth helper found in Phase 0.
- Do not invent new RLS policy patterns — replicate the existing ones verbatim.
- Do not add the admin feedback link to the main app navigation.
- Do not make screenshot capture blocking — always fail silently if the user denies or
  the browser does not support `getDisplayMedia`.
- Do not fail the feedback submission if the screenshot upload fails — log and continue.
- Do not add any new database columns to existing tables.

---

## Definition of done

Work through this checklist before declaring the implementation complete.

**Database**
- [ ] Migration file exists at the correct path with the correct timestamp prefix.
- [ ] All columns are present with correct types, defaults, and constraints.
- [ ] Indexes exist on `user_id` and `created_at`.
- [ ] RLS policies (if Supabase) replicate the existing project pattern.
- [ ] Types have been regenerated and there are no `as any` casts in the new code.

**Console capture**
- [ ] `capturedErrors` module-level array is exported from the interceptor component.
- [ ] `console.error` is monkey-patched on mount and restored on unmount.
- [ ] Component is mounted in the authenticated layout.

**API / server route**
- [ ] Unauthenticated requests return 401.
- [ ] Malformed input returns 400 with validation details.
- [ ] More than 10 submissions in an hour returns 429.
- [ ] Successful submission inserts a row and returns 201.
- [ ] Screenshot is uploaded to storage and `screenshot_path` is set when provided.
- [ ] Screenshot upload failure does not prevent a 201 response.

**Widget**
- [ ] Widget is invisible when the user is not authenticated.
- [ ] Triangle trigger is 24px at rest, 64px on hover, stays expanded while dialog is open.
- [ ] All four type buttons render and selection is visually indicated.
- [ ] Screenshot button cycles through all three states correctly.
- [ ] Clicking Send with < 10 characters triggers shake animation, does not submit.
- [ ] Successful submission shows success state then closes after 1800ms.
- [ ] 429 response shows the rate-limit message; other errors show the generic message.
- [ ] Submit payload includes `pageUrl`, `userAgent`, `consoleErrors`, and `metadata`.

**Webhook**
- [ ] Trigger or API-level webhook call fires on every new submission.
- [ ] A missing or invalid webhook URL does not affect the submission flow.
- [ ] `docs/feedback-webhook.md` (or equivalent) documents configuration and payload.

**Admin view**
- [ ] `/admin/feedback` (or equivalent) is accessible to admin/owner roles only.
- [ ] Rows are filterable by type and date range client-side.
- [ ] Expanding a row shows full details including console errors and metadata.
- [ ] Screenshot "View screenshot" button generates a signed URL and opens it.
- [ ] Empty state renders when there are no rows.
- [ ] A nav link to the feedback page exists in the admin navigation.

**Final checks**
- [ ] The project's type checker passes with no new errors (`tsc --noEmit` or equivalent).
- [ ] The project's linter passes with no new errors.
- [ ] No new npm packages were installed.
- [ ] `.env.example` (or equivalent) documents any new environment variables.