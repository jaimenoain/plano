-- Mitigation for rls_disabled_in_public on public.spatial_ref_sys (PostGIS reference table).
--
-- We cannot ENABLE RLS (table owned by supabase_admin; "must be owner") nor REVOKE the
-- grants supabase_admin made to anon/authenticated (postgres is not the grantor/owner).
-- But postgres DOES hold the TRIGGER privilege on this table, and CREATE TRIGGER only
-- requires that privilege -- not ownership. So we install a guard that blocks the API
-- roles (anon, authenticated) from mutating this reference table, neutralizing the real
-- risk: a holder of the public anon key corrupting or TRUNCATEing the SRID catalog that
-- every geo/map query depends on. Reads are unaffected (PostGIS only needs SELECT).
--
-- NOTE: this does NOT clear the advisor lint, which checks RLS state, not triggers.
-- Fully clearing it requires supabase_admin (Supabase Support) to enable RLS or revoke
-- grants -- see 20260624202125_revoke_spatial_ref_sys_api_access.sql.

create or replace function public.spatial_ref_sys_block_api_writes()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    raise exception 'public.spatial_ref_sys is read-only reference data and cannot be modified by API roles'
      using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists spatial_ref_sys_block_api_writes_row on public.spatial_ref_sys;
create trigger spatial_ref_sys_block_api_writes_row
  before insert or update or delete on public.spatial_ref_sys
  for each row execute function public.spatial_ref_sys_block_api_writes();

drop trigger if exists spatial_ref_sys_block_api_writes_truncate on public.spatial_ref_sys;
create trigger spatial_ref_sys_block_api_writes_truncate
  before truncate on public.spatial_ref_sys
  for each statement execute function public.spatial_ref_sys_block_api_writes();
