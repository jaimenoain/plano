-- See `20270818000000_ensure_spatial_ref_sys_rls.sql` for rationale.
-- RLS on `spatial_ref_sys` is not applicable when the table owner is `supabase_admin` (hosted Supabase).
REVOKE ALL PRIVILEGES ON TABLE public.spatial_ref_sys FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.spatial_ref_sys FROM PUBLIC;
