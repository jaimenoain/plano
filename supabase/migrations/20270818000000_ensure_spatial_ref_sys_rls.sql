-- PostGIS `public.spatial_ref_sys` is exposed to PostgREST. Enabling RLS often fails on hosted Supabase with:
--   ERROR 42501: must be owner of table spatial_ref_sys
-- because the table is owned by `supabase_admin`, not the SQL Editor role.
-- Recommended workaround: revoke access from API roles (same outcome for clients — no direct table access).
-- https://github.com/supabase/supabase/issues/29122#issuecomment-2334780778
--
-- Run in Dashboard → SQL with role **postgres** (bottom of editor). If REVOKE still fails, contact Supabase support.
REVOKE ALL PRIVILEGES ON TABLE public.spatial_ref_sys FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.spatial_ref_sys FROM PUBLIC;
