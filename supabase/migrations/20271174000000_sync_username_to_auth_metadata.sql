-- Keep auth.users.raw_user_meta_data.username in sync with the canonical
-- public.profiles.username, and backfill the drift that has already accumulated.
--
-- Background
-- ----------
-- `raw_user_meta_data.username` is a snapshot stamped once at signup
-- (useAuth signUp `options.data.username`) and copied into `profiles` by the
-- `handle_new_user` trigger. NOTHING kept the two in sync afterward, so any
-- rename — Settings self-edit, Onboarding, or the admin anonymize path — left
-- the JWT/user_metadata copy stale. That stale copy silently broke the /search
-- "My Library" `rated_by` filter for 7 of 18 production accounts: the map/list
-- RPCs match `rated_by` against `profiles.username`, but the client seeded the
-- filter from the stale metadata copy → matched nobody → zero pins.
--
-- PR #1573 fixed the READ path (the client now sources `profiles.username` via
-- useUserProfile). This migration removes the drift AT THE SOURCE so no other
-- JWT-only consumer can go stale again. See docs/decisions/0007-username-canonical-in-profiles.md.
--
-- Design: profiles.username is the single source of truth; auth metadata is a
-- best-effort mirror. A trigger keeps the mirror current on every write path at
-- once (belt); app reads already prefer profiles (suspenders). Existing sessions
-- pick up the corrected metadata on their next token refresh — no forced JWT
-- re-issue is required, and there are zero load-bearing server-side reads of the
-- JWT username to begin with.

-- 1. Sync function: mirror profiles.username -> auth.users.raw_user_meta_data.
--    SECURITY DEFINER so the AFTER trigger can update auth.users even when the
--    rename is performed by an authenticated user who has no rights on the auth
--    schema (RLS lets them update only their own profiles row).
create or replace function public.sync_username_to_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.username is distinct from old.username and new.username is not null then
    update auth.users
    set raw_user_meta_data = jsonb_set(
      coalesce(raw_user_meta_data, '{}'::jsonb),
      '{username}',
      to_jsonb(new.username)
    )
    where id = new.id;
  end if;
  return new;
end;
$$;

-- Trigger functions are invoked by the trigger, not called directly; default-deny
-- EXECUTE so it can never be run as a bare RPC.
revoke execute on function public.sync_username_to_auth_metadata() from public;

-- 2. Trigger: fire only when the username column actually changes. Runs AFTER
--    the existing BEFORE-UPDATE role guard (on_profile_update_check). No
--    recursion: it writes to auth.users, which has no trigger that writes back
--    to public.profiles.
drop trigger if exists on_profile_username_sync_metadata on public.profiles;
create trigger on_profile_username_sync_metadata
  after update of username on public.profiles
  for each row
  execute function public.sync_username_to_auth_metadata();

-- 3. One-time backfill: correct existing drift (7 of 18 accounts as of
--    2026-07-17). Set-based single UPDATE. Only touches rows where the profile
--    has a real username — never nulls out metadata for profile-less/name-less
--    accounts (e2e test artifacts).
update auth.users u
set raw_user_meta_data = jsonb_set(
  coalesce(u.raw_user_meta_data, '{}'::jsonb),
  '{username}',
  to_jsonb(p.username)
)
from public.profiles p
where p.id = u.id
  and p.username is not null
  and (u.raw_user_meta_data ->> 'username') is distinct from p.username;
