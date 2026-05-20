-- Migration: Harden PostGIS reference table `spatial_ref_sys` in `public`.
--
-- Supabase advisor `rls_disabled_in_public` suggests enabling RLS. On hosted
-- Supabase the table owner is typically `supabase_admin`, so:
--   ALTER TABLE … ENABLE ROW LEVEL SECURITY
-- and `CREATE POLICY` fail with 42501 (must be owner).
--
-- Workaround (same as `20270807000000_enable_rls_spatial_ref_sys.sql` and
-- `20270818000000_ensure_spatial_ref_sys_rls.sql`): revoke direct table privileges
-- from API roles so PostgREST cannot expose bare reads/writes while PostGIS keeps
-- using the catalogue internally via superuser/definer contexts.
--
-- Apply in Dashboard → SQL as role **postgres**. If REVOKE returns 42501, contact Supabase support.
-- https://github.com/supabase/supabase/issues/29122#issuecomment-2334780778

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'spatial_ref_sys'
          AND c.relkind = 'r'
    ) THEN
        EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.spatial_ref_sys FROM anon, authenticated';
        EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.spatial_ref_sys FROM PUBLIC';
    END IF;
END $$;
