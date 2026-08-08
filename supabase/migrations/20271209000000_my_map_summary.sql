-- ============================================================================
-- get_my_map_summary — pre-aggregated data for the feed's "My Map" widget
-- ============================================================================
-- Replaces a client-side fetch of the member's ENTIRE library (up to 4000
-- rows, full location payload) for a 320px sidebar thumbnail. This RPC does
-- the binning and roll-up in Postgres and returns a few dozen rows total:
--   kind='total' — three rows (label='library'/'plottable'/'places'): total
--                  library size (any status, mappable or not — drives the
--                  header count and empty state), total mappable pins, and
--                  total distinct places
--   kind='city'  — top 3 places (city, falling back to country)
--   kind='cell'  — coarse 5°x5° grid cells with an averaged centroid, so a
--                  lone building in a cell lands at its own coordinates
--                  rather than snapping to the cell's corner
--
-- SECURITY INVOKER (not DEFINER): the existing RLS policies already scope
-- user_buildings SELECT to `auth.uid() = user_id` (plus a public-post
-- carve-out that doesn't matter here since we filter to the caller's own
-- rows explicitly), and buildings SELECT is open to everyone. No elevated
-- privilege is needed, so there is nothing to lock down beyond the normal
-- EXECUTE grant.
-- ============================================================================

create or replace function public.get_my_map_summary()
returns table(kind text, label text, lat double precision, lng double precision, weight int)
language sql
stable
security invoker
set search_path = ''
as $$
  with plottable as (
    select
      ub.status,
      b.city,
      b.country,
      public.st_y(b.location::public.geometry) as lat,
      public.st_x(b.location::public.geometry) as lng
    from public.user_buildings ub
    join public.buildings b on b.id = ub.building_id
    where ub.user_id = auth.uid()
      and ub.status in ('pending', 'visited')
      and coalesce(b.is_deleted, false) = false
  ),
  mappable as (
    select *
    from plottable
    where lat is not null
      and lng is not null
      and not (lat = 0 and lng = 0)
  ),
  places as (
    select coalesce(nullif(trim(city), ''), nullif(trim(country), '')) as name
    from plottable
  ),
  place_counts as (
    select name, count(*) as cnt
    from places
    where name is not null
    group by name
  ),
  top_places as (
    select name, cnt, row_number() over (order by cnt desc, name asc) as rn
    from place_counts
  ),
  cells as (
    select
      floor(lat / 5.0) as cy,
      floor(lng / 5.0) as cx,
      avg(lat) as lat,
      avg(lng) as lng,
      count(*) as weight
    from mappable
    group by 1, 2
  )
  select 'total'::text, 'library'::text, null::double precision, null::double precision,
         (select count(*) from plottable)::int
  union all
  select 'total'::text, 'plottable'::text, null::double precision, null::double precision,
         (select count(*) from mappable)::int
  union all
  select 'total'::text, 'places'::text, null::double precision, null::double precision,
         (select count(*) from place_counts)::int
  union all
  select 'city'::text, name, null::double precision, null::double precision, cnt::int
  from top_places
  where rn <= 3
  union all
  select 'cell'::text, null::text, lat, lng, weight::int
  from cells;
$$;

-- Re-assert privileges every time (DROP/CREATE resets them). Default-deny,
-- then grant narrowly — anon and authenticated hold direct grants from
-- ALTER DEFAULT PRIVILEGES here, so `revoke ... from public` alone is not
-- enough (see supabase/migrations/_TEMPLATE_rpc.sql.txt).
revoke all on function public.get_my_map_summary() from public, anon, authenticated;
grant execute on function public.get_my_map_summary() to authenticated;
