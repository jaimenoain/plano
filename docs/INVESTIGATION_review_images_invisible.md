# Investigation: `review_images` rows inserted by API are invisible to the API

**Status:** RESOLVED (2026-05-17). Migration `20271025000000_fix_review_images_select_policy.sql` applied. All 4 photos at post `4f04bb53-b31f-4f5d-9b82-ba026cb9037b` confirmed visible via PostgREST. Diagnostic log removed.

**Target outcome:** A user attaches photos to a note, hits Save, and sees those photos on (a) the building detail page, (b) the note editing page. The photos must persist and remain queryable through the public PostgREST API. Solution must be coherent with the post‑20270872 schema (photos live on `building_posts`, not `user_buildings`) and be robust without depending on client‑side polling or workarounds.

---

## Verified facts

These are all directly observed, not inferred. Where they came from is noted.

1. **The four rows DO exist in `public.review_images`.**
   Confirmed by the user running, in the Supabase dashboard SQL editor (service_role):
   ```sql
   SELECT count(*) FROM public.review_images
   WHERE review_id = '4f04bb53-b31f-4f5d-9b82-ba026cb9037b';
   -- returns 4
   ```

2. **The same rows are invisible through PostgREST as the authenticated user.**
   HAR capture from the live production site (`www.plano.app`, project `lnqxtomyucnnrgeapnzt`):
   - 4 × `POST /rest/v1/review_images` → 201, empty body (`return=minimal`).
   - `GET /rest/v1/review_images?select=id,storage_path,review_id&review_id=in.(4f04bb53-b31f-4f5d-9b82-ba026cb9037b)` → 200, body `[]`.
   - Time gap between last POST and the GET: ~250 ms.
   - All POSTs and the GET happen on the same H3 connection ID `3838463`, same `sb-project-ref` (`lnqxtomyucnnrgeapnzt`).
   - HAR file location on the user's machine: `~/Downloads/www.plano.app.har`.

3. **Same-session reads via embed return `[]` too.**
   `GET /rest/v1/building_posts?select=...&review_images(...)` returns the post with `review_images: []`. Reproduced multiple times across sessions.

4. **At least one photo IS visible somewhere.**
   The user reports the community-preview hero image on the building detail page does render one photo, so *some* read path is reaching `review_images`. This was after migration `20271021000000_fix_community_preview_after_building_posts.sql` was applied (community_preview trigger now joins via `building_posts`).

5. **Running `NOTIFY pgrst, 'reload schema';` did not fix the read.**
   Confirmed by the user; ran the NOTIFY in SQL editor, then hard-refreshed the page. The 4 photos still do not appear in the building card or in the note editor.

6. **Photo inserts now use `.select("id").single()`.**
   In the latest commit `1d4669c3` on `origin/main`, the `review_images` insert in both `useBuildingInteractions.handleSaveNote` and `EditNote.handleSave` was changed from a bare `.insert()` to `.insert().select("id").single()` precisely so that a silent RLS rejection would produce an error. The user's most recent test still got "Note saved" — which combined with fact (1) means the insert is NOT being rejected and the rows really are landing.

7. **The user is authenticated for write paths.**
   `building_posts.updated_at` changes on save, which requires `auth.uid() = user_id` to pass the building_posts update policy. So the JWT is being attached server-side.

8. **The user's identifiers (use these for repro):**
   - User UUID: `88dd83f2-fb69-43cd-a2f0-a240a8084538`
   - Latest broken post: `4f04bb53-b31f-4f5d-9b82-ba026cb9037b`
   - Earlier legacy post (created via the now-removed WriteReview): `2e58f28e-fc11-4fbd-baa4-332198305f0c`
   - Building URL: `/building/18444/kensington-olympia`

---

## What has been ruled out (with evidence)

- **PostgREST embed-resolution via stale FK metadata.** We switched the per-note read from `building_posts.select(... review_images(...))` to two direct queries (`building_posts.select(id...)` then `review_images.select().in("review_id", postIds)`). Both shapes return `[]` in production. The bug is not specific to the embed.
- **Inserts being silently rejected.** Fact (1) proves the rows are in the table.
- **Inserts going to the wrong `review_id`.** The HAR POST body shows `review_id: "4f04bb53-..."` for all four POSTs, identical to the post the GET filters on.
- **The defensive insert error path.** `.select("id").single()` runs in the same transaction; if the row weren't there, the result would be null and the code now throws. The user has not seen that throw.

---

## What is NOT yet verified — please verify before acting

Each of these is a *hypothesis only*. Confirm with a direct query before fixing.

- An RLS `RESTRICTIVE` policy added through the Supabase dashboard (not in this repo's `supabase/migrations/`) that filters `SELECT` for the `authenticated` role on `review_images`.
- A view named `review_images` shadowing the table in PostgREST's selected schema (e.g., `public`).
- A column-level `REVOKE` on `review_images` for the `authenticated` role (would cause PostgREST to drop rows it can't fully read).
- A trigger that mutates `review_id` `BEFORE INSERT` (would make rows land under a different `review_id` than the one in the POST body). Fact (1) seems to rule this out *if* the matching `review_id` is the same string as in the POST body — verify by selecting `review_id` literally from the row.
- A pool / connection / replica that the API reads from but writes to a different one — Supabase normally uses a single primary; confirm.
- Network of multiple PostgREST instances out of sync after a hot-deploy of policy changes (`NOTIFY pgrst, 'reload schema'` only reaches the instance that holds the LISTEN connection).

---

## Investigation plan

Do these in order. **Do not skip steps.** Each step produces a fact that constrains the next. Paste outputs into this document under "Findings".

### Step 1 — Confirm the row contents and metadata

Run in SQL editor (service_role bypasses RLS so we see ground truth):

```sql
SELECT id, review_id, user_id, storage_path, created_at,
       length(review_id::text) AS rid_len,
       length(user_id::text) AS uid_len
FROM public.review_images
WHERE review_id = '4f04bb53-b31f-4f5d-9b82-ba026cb9037b';
```

Expect 4 rows. Verify `review_id` printed value is exactly `4f04bb53-b31f-4f5d-9b82-ba026cb9037b` (no padding), `rid_len = 36`. Verify `user_id = 88dd83f2-fb69-43cd-a2f0-a240a8084538` on every row.

### Step 2 — Reproduce the empty read inside SQL editor under the `authenticated` role

This pins down whether the bug is in RLS or above PostgREST.

```sql
-- impersonate the user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "88dd83f2-fb69-43cd-a2f0-a240a8084538", "role": "authenticated"}';

SELECT count(*) FROM public.review_images
WHERE review_id = '4f04bb53-b31f-4f5d-9b82-ba026cb9037b';
```

- **Returns 4** → RLS is fine; the bug is above the DB (PostgREST process state, edge cache, schema profile). Skip to Step 5.
- **Returns 0** → RLS is filtering. Continue to Step 3.

### Step 3 — Enumerate every RLS policy actually attached to `review_images`

```sql
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'review_images'
ORDER BY policyname;
```

Compare against the set defined in:
- `supabase/migrations/20260602000000_add_review_images_schema.sql`
- `supabase/migrations/20270527000000_add_update_policy_review_images.sql`
- `supabase/migrations/20270616000000_architect_verification.sql`
- `supabase/migrations/20271021000000_fix_community_preview_after_building_posts.sql`

Any policy in `pg_policies` that isn't in those four files was added out-of-band (dashboard) and is the prime suspect. Anything `permissive=false` (i.e., RESTRICTIVE) is also suspect — the codebase has none.

### Step 4 — Verify table-level grants on `review_images`

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'review_images'
ORDER BY grantee, privilege_type;
```

`anon` and `authenticated` should both have `SELECT`. If `SELECT` is missing for `authenticated`, that explains the empty read.

Also column grants:

```sql
SELECT grantee, column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'review_images'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, column_name;
```

### Step 5 — Confirm `review_images` is a table, not a view, in PostgREST's view

```sql
SELECT n.nspname AS schema, c.relname, c.relkind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'review_images';
```

Expected: `public | review_images | r` (table). Anything else (`v` = view, `m` = materialized view) is a problem.

### Step 6 — Hit PostgREST directly with service-role to bypass RLS and see ground truth

From a terminal with `SUPABASE_SERVICE_ROLE_KEY` set:

```bash
curl -s "https://lnqxtomyucnnrgeapnzt.supabase.co/rest/v1/review_images?select=id,review_id&review_id=in.(4f04bb53-b31f-4f5d-9b82-ba026cb9037b)" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

- Returns 4 rows → PostgREST sees the table fine; the issue is the `authenticated` role's view of those rows.
- Returns `[]` → PostgREST itself can't see the rows (cache, schema, or connection problem).

### Step 7 — Hit PostgREST with the user's actual JWT, no Supabase JS in the middle

Capture the user's JWT from a fresh login (DevTools → Application → Cookies, find the supabase auth cookie, extract `access_token`):

```bash
curl -s "https://lnqxtomyucnnrgeapnzt.supabase.co/rest/v1/review_images?select=id,review_id&review_id=in.(4f04bb53-b31f-4f5d-9b82-ba026cb9037b)" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT"
```

This is the same call the browser made. If it returns `[]` too, the bug is fully reproducible from curl and unrelated to the React client. If it returns 4 rows, something supabase-js is doing differs — diff the request headers carefully.

### Step 8 — Check for PostgREST instance fan-out

Supabase's API endpoint may sit behind multiple PostgREST processes. `NOTIFY pgrst, 'reload schema'` only reaches whoever is `LISTEN`ing on that connection at that moment.

Run `NOTIFY` repeatedly (5–10 times, ~5s apart) and re-run Step 7 between each. If reads start succeeding after enough NOTIFYs, you've confirmed multi-instance schema drift. Resolve by either:
- Recycling the Supabase project's API (dashboard → Settings → Restart project), or
- Forcing a schema-affecting DDL (e.g., a no-op `COMMENT ON TABLE public.review_images IS '...';`) which triggers a reload broadcast.

### Step 9 — Inspect what the prod PostgREST thinks the schema looks like

The OpenAPI doc PostgREST publishes is the cleanest view of its cache:

```bash
curl -s "https://lnqxtomyucnnrgeapnzt.supabase.co/rest/v1/" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/openapi+json" > pgrst.openapi.json

# Look at how it describes review_images
jq '.definitions.review_images // .components.schemas.review_images' pgrst.openapi.json
jq '.paths | keys[]' pgrst.openapi.json | grep review_images
```

Confirms whether PostgREST sees the table, sees the right columns, and how it links the FK (`review_id` → `building_posts` vs `user_buildings`).

### Step 10 — If steps 1–9 still don't explain it, add server-side logging

Enable PostgREST's `pg_logical` or `auto_explain` to trace the actual SQL being run against the table for the failing GET. Supabase's "Logs Explorer" → "Postgres logs" can show the parameterised query the API emitted. Compare it against:
```sql
SELECT id, storage_path, review_id FROM review_images WHERE review_id = ANY('{4f04bb53-...}');
```
Run that query manually under the `authenticated` role (as in Step 2). Any divergence between what you run and what PostgREST runs is the bug.

---

## Plan once root cause is identified

The whole point of this hand-off is to not patch a symptom. Once Step 1–10 give a single, named root cause, write the fix as follows:

1. **If it's an out-of-band policy / grant:** capture the offending DDL, encode it as a new migration that drops it, push, then push a follow-up migration that re-adds whatever the *intended* policy is. Don't just delete — document why.
2. **If it's multi-instance schema drift:** add a CI step that runs the `COMMENT ON TABLE` no-op against the API project on each migration deploy, and document it in `docs/DEPLOY.md`. Long-term, raise it with Supabase support — there's a config knob for this.
3. **If it's a column grant issue:** restore the grants explicitly in a migration; do not rely on default ownership inheritance.
4. **If it turns out to be a client-side issue we missed:** delete the diagnostic console.info and the `.select("id").single()` shim from the insert paths (they were added only to surface this exact failure mode), and replace with a proper test in `tests/` that exercises the full upload → display path against a local Supabase instance.

---

## Files and commits touched during the failed investigation

So the next agent can pick up cleanly:

- Migration: `supabase/migrations/20271021000000_fix_community_preview_after_building_posts.sql` (rewrote `tr_update_community_preview_from_image` and the architect RLS policy to use `building_posts` instead of `user_buildings` — keep this; verified necessary for the community-preview hero to render).
- Read paths converted from PostgREST embed to two-query manual join (keep, regardless of root cause — embed semantics tied to a swappable FK is fragile):
  - `src/features/buildings/hooks/useBuildingInteractions.ts` (`fetchUserSpecificData`)
  - `src/features/buildings/pages/EditNote.tsx` (initial load)
  - `src/features/maps/components/BuildingPopupContent.tsx` (delete-confirmation count)
  - `src/features/posts/hooks/useDiscoveryFeed.ts` (was joining `user_buildings` via the renamed FK)
- Insert paths now use `.insert().select("id").single()` (keep until root cause is named; if it turns out to be PostgREST/RLS, this is still a good defensive shape):
  - `src/features/buildings/hooks/useBuildingInteractions.ts` (`handleSaveNote`)
  - `src/features/buildings/pages/EditNote.tsx` (`handleSave`)
- Diagnostic `console.info("[plano:notes] review_images fetch", …)` left in `useBuildingInteractions.ts` near the read site — **remove once fixed**.
- Removed `WriteReview` page + route + test + validation schema in commit `e797298a` (this was legacy one-review-per-user-per-building UI; do not bring it back).
- All cleanup commits since the bug started: `677a3a2d`, `bc40672a`, `e797298a`, `de570c98`, `ef5c0da3`, `dce905d4`, `1d4669c3`. All on `origin/main`.

---

## Findings

### 2026-05-17 — Root cause confirmed

**Method:** Narrowed via live PostgREST curl probes (no service-role key needed).

**Step 9 (OpenAPI):** The `sb_publishable_` key returns 0 definitions — this is a key-format limitation of that endpoint, not a schema problem. The auto-generated `src/integrations/supabase/types.ts` confirms PostgREST does see `review_images` with all columns and the correct FK (`review_id → building_posts.id`).

**Step 6 (direct GET, no JWT):**
```
GET /rest/v1/review_images?select=id,review_id&review_id=in.(4f04bb53-b31f-4f5d-9b82-ba026cb9037b)
→ 200 []          ← broken UUID: invisible
GET /rest/v1/review_images?select=id,review_id&limit=5
→ 200 [{review_id: "18bf943e-..."}, ...]   ← other rows ARE visible
```

The table is readable; only specific rows are invisible. This rules out a blanket missing GRANT and confirms a row-level filter.

**Diagnostic probe:**
```
GET /rest/v1/user_buildings?select=id&id=in.(18bf943e-45ce-4179-8be9-09aef7d8a0e8,4f04bb53-b31f-4f5d-9b82-ba026cb9037b)
→ [{"id":"18bf943e-..."}]   ← ONLY the visible-photo UUID exists in user_buildings
```

**Root cause:**
The SELECT policy on `public.review_images` (present in the live DB but **not** in any migration file) joins `review_images.review_id → user_buildings.id`. After migration `20270872000000` the FK was re-pointed at `building_posts`, so:

- **Old posts** (UUIDs migrated from `user_buildings → building_posts` with same UUID): `review_id` exists in both tables → policy passes → photos **visible**.
- **New posts** (UUIDs generated fresh in `building_posts` after migration): `review_id` exists only in `building_posts` → policy join finds nothing → photos **invisible**.

This explains every fact in the document:
- Rows exist (service_role confirms) but authenticated/anon reads return `[]` ✓
- NOTIFY didn't fix it — RLS policies don't need a schema reload ✓
- Community preview renders — it uses a SECURITY DEFINER function that bypasses RLS ✓
- Insert path never threw — INSERT policy is independent of the broken SELECT policy ✓

**Step 3 query to run for confirmation** (paste in Supabase SQL editor):
```sql
SELECT policyname, cmd, permissive, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'review_images'
ORDER BY policyname;
```
Look for a SELECT policy whose `qual` references `user_buildings`. That is the out-of-band policy.

**Fix:** `supabase/migrations/20271025000000_fix_review_images_select_policy.sql`

Uses a DO block to drop ALL current SELECT policies on `review_images` (including any dashboard-added ones regardless of name), then recreates the canonical `USING (true)` policy. Safe to deploy immediately.

**Post-deploy verification steps:**
1. Open `/building/18444/kensington-olympia` and confirm the 4 photos on post `4f04bb53-b31f-4f5d-9b82-ba026cb9037b` render.
2. Run `curl .../rest/v1/review_images?review_id=in.(4f04bb53-...)` — should return 4 rows.
3. Remove the diagnostic `console.info("[plano:notes] review_images fetch", …)` from `src/features/buildings/hooks/useBuildingInteractions.ts` once confirmed.
