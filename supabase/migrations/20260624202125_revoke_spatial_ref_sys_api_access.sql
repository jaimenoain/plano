-- Security fix attempt: rls_disabled_in_public on public.spatial_ref_sys
--
-- spatial_ref_sys is a PostGIS reference table owned by `supabase_admin`. RLS cannot be
-- enabled from the migration role ("ERROR 42501: must be owner of table spatial_ref_sys"),
-- so Supabase's recommended remediation is to remove API-role access instead.
--
-- IMPORTANT: when run as the `postgres` migration role these REVOKEs are a NO-OP -- the
-- grants were made by `supabase_admin`, and a role can only revoke grants it made (or that
-- were made by a role it belongs to). `postgres` is not a member of `supabase_admin`, so
-- PostgreSQL emits a warning and changes nothing. This statement is the *correct* fix and
-- will take effect only when executed by `supabase_admin` (i.e. via Supabase Support).
--
-- The actual exploitable risk -- API roles being able to mutate this table -- is closed in
-- the companion migration 20260624202545_guard_spatial_ref_sys_writes_from_api_roles.sql,
-- which installs a write-guard trigger (CREATE TRIGGER needs only the TRIGGER privilege,
-- which `postgres` does hold on this table).
--
-- Ref: https://github.com/supabase/supabase/issues/29122#issuecomment-2334780778

revoke all privileges on table public.spatial_ref_sys from anon;
revoke all privileges on table public.spatial_ref_sys from authenticated;
revoke all privileges on table public.spatial_ref_sys from public;
