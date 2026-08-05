-- ============================================================================
-- Who saved / visited a building — payload for the detail page Overview tab
-- ============================================================================
-- The Overview tab's "Community" stream is anchored on `building_posts` and
-- drops contentless entries, so a member who merely saved or visited a
-- building has never appeared anywhere on the building's page. This function
-- is that missing read path: the people behind the silent saves and visits.
--
-- WHY `security definer` (the elevation is the whole point, so it is spelled
-- out here rather than assumed):
--   The SELECT policy on `user_buildings` (20270872000000_building_posts.sql)
--   only exposes another member's row when that member ALSO has a visible
--   `building_posts` row for the same building — the `visibility` column was
--   dropped from `user_buildings` in that same migration, so there is no
--   per-row visibility left to relax. Under RLS this query would return the
--   caller's own row and nothing else, which is precisely the case the
--   feature exists to surface. Elevating here, with a fixed and narrow
--   projection, is the smaller change than reintroducing a visibility column.
--
-- WHY this is not a new disclosure:
--   The same facts are already public person-first. `building_matches_contact_filters`
--   (20271164000000) is SECURITY DEFINER and backs the map/search `rated_by=@username`
--   filter, which reveals exactly which buildings a named member saved, visited
--   or rated. This function reorganises those facts building-first.
--
-- WHAT IS DELIBERATELY WITHHELD:
--   * `status = 'ignored'` (hidden) NEVER leaves this function. A member's
--     hidden list is private, consistent with 20261222000000 (excluded from
--     save_count), 20260910000000 and 20270517000000.
--   * `anon` gets no EXECUTE. Naming members to logged-out visitors would
--     publish a scrapeable list; activity is a signal for members.
--
-- See docs/decisions/0029-building-activity-is-visible-to-members.md.
-- ============================================================================

create or replace function public.get_building_activity(
  p_building_id uuid,
  p_limit int default 12
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with viewer as (
  select (select auth.uid()) as id
),
-- One row per member with a non-hidden interest in this building. `rank_key`
-- puts the viewer first, then people they follow, then everyone else, so the
-- capped list is the most meaningful faces rather than the most recent ones.
activity as (
  select
    ub.user_id,
    ub.status,
    ub.rating,
    ub.visited_at,
    ub.created_at,
    p.username,
    p.avatar_url,
    exists (
      select 1
      from public.follows f
      where f.follower_id = (select id from viewer)
        and f.following_id = ub.user_id
    ) as is_followed,
    case
      when ub.user_id = (select id from viewer) then 0
      when exists (
        select 1
        from public.follows f
        where f.follower_id = (select id from viewer)
          and f.following_id = ub.user_id
      ) then 1
      else 2
    end as rank_key
  from public.user_buildings ub
  join public.profiles p on p.id = ub.user_id
  where ub.building_id = p_building_id
    -- 'ignored' is a private hidden-list entry and must never be returned.
    and ub.status in ('pending', 'visited')
    and p.username is not null
),
ranked as (
  select
    a.*,
    row_number() over (
      partition by a.status
      order by a.rank_key, coalesce(a.rating, -1) desc, a.created_at desc
    ) as rn
  from activity a
),
people as (
  select
    r.status,
    jsonb_build_object(
      'user_id', r.user_id,
      'username', r.username,
      'avatar_url', r.avatar_url,
      'rating', r.rating,
      'visited_at', r.visited_at,
      'is_followed', r.is_followed
    ) as person,
    r.rn
  from ranked r
  where r.rn <= greatest(coalesce(p_limit, 12), 1)
)
select jsonb_build_object(
  'visited', coalesce(
    (select jsonb_agg(pe.person order by pe.rn) from people pe where pe.status = 'visited'),
    '[]'::jsonb
  ),
  'saved', coalesce(
    (select jsonb_agg(pe.person order by pe.rn) from people pe where pe.status = 'pending'),
    '[]'::jsonb
  ),
  'total_visited', (select count(*) from activity a where a.status = 'visited'),
  'total_saved', (select count(*) from activity a where a.status = 'pending')
);
$$;

comment on function public.get_building_activity(uuid, int) is
  'Members who saved (status=pending) or visited a building, capped per group, viewer and followed members first. SECURITY DEFINER because user_buildings RLS is post-anchored; never returns status=ignored. Authenticated only.';

-- Re-assert privileges: create or replace resets them, and `public` alone is
-- not default-deny here — anon and authenticated hold DIRECT grants from
-- ALTER DEFAULT PRIVILEGES and must be named (see _TEMPLATE_rpc.sql.txt).
revoke all on function public.get_building_activity(uuid, int) from public, anon, authenticated;
grant execute on function public.get_building_activity(uuid, int) to authenticated;
