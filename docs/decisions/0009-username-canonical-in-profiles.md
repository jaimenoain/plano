# 0009 — `profiles.username` is canonical; auth metadata is a synced mirror

**Status:** accepted (2026-07-17)

## Context

A user's username lives in two places:

- `public.profiles.username` — editable at any time (Settings, Onboarding, admin
  anonymize), and the value every feature actually queries against.
- `auth.users.raw_user_meta_data.username` — a snapshot stamped once at signup
  (`supabase.auth.signUp({ options: { data: { username } } })`), copied into
  `profiles` by the `handle_new_user` trigger, and thereafter surfaced inside
  every issued JWT as `user_metadata.username`.

Nothing kept the two in sync after signup. A rename updated only `profiles`, so
the metadata/JWT copy silently went stale. This was not cosmetic: the /search
"My Library" filter seeded its `rated_by` curator parameter from the stale
metadata copy, while the map/list RPCs match `rated_by` against
`profiles.username`. Stale name → matched nobody → zero pins, for **7 of 18**
production accounts (PR #1573 fixed that read path; this ADR covers the systemic
cleanup in the follow-up PR).

The deeper question: which copy is authoritative, and how do we prevent *any*
future consumer from trusting a stale JWT username?

## Decision

**`profiles.username` is the single source of truth. `auth.users` metadata is a
best-effort mirror kept in sync by the database — never itself authoritative.**

Two independent guarantees ("belt and suspenders"):

1. **Belt — sync at the source.** A trigger
   `on_profile_username_sync_metadata` (`AFTER UPDATE OF username ON
   public.profiles`, calling the SECURITY DEFINER function
   `sync_username_to_auth_metadata`) mirrors every username change into
   `auth.users.raw_user_meta_data.username`. A single DB trigger covers *all*
   write paths at once — Settings, Onboarding, admin anonymize, and any future
   one — instead of patching each client call site (which is exactly how the
   drift accumulated). A one-time backfill in the same migration
   (`20271176000000`) corrects the existing drift.

2. **Suspenders — reads prefer profiles.** Application code reads the username
   from `profiles` (via `useUserProfile`), never from the JWT. As of this work
   there are **zero** load-bearing reads of `user_metadata.username` anywhere in
   the codebase (audited across `src/`, `app/`, SQL RPCs, and edge functions);
   the only remaining metadata username references are the signup-time *write*
   in `handle_new_user`.

### JWT re-issue is deliberately NOT forced

Updating `raw_user_meta_data` does not rewrite already-issued access tokens; an
active session keeps its old `user_metadata.username` until its next token
refresh (access tokens are short-lived). We accept that lag rather than force a
global sign-out, because:

- there are no load-bearing server-side reads of the JWT username (no RLS policy
  or RPC reads `auth.jwt() -> user_metadata -> username`), and
- app reads prefer `profiles`, so a stale in-flight JWT changes no behavior.

GoTrue reads `raw_user_meta_data` when it mints the next token, so the corrected
value propagates naturally on refresh.

## Consequences

- Any new feature MUST read the username from `profiles`. Treat any read of
  `user_metadata.username` / `raw_user_meta_data ->> 'username'` (outside the
  signup seed and this sync function) as a bug — it can be stale within the
  session even with the trigger in place.
- The trigger is SECURITY DEFINER and writes to `auth.users`; a reviewer should
  confirm any change to it keeps `set search_path = ''`, stays scoped to the
  username key, and never nulls out metadata for name-less rows.
- The sync is one-directional (`profiles` → `auth`). Do not add a reverse trigger
  on `auth.users` — it would create a write loop and re-introduce metadata as an
  authority.
- If a future flow genuinely needs the username inside the JWT for a server-side
  decision, it can rely on the mirror being current *at issue time*, but must
  still tolerate the refresh lag described above.
