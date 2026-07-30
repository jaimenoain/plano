-- ============================================================================
-- Country guide payload for /architecture/:cc
-- ============================================================================
-- The country page used to be a bare grid of every city in the country. This
-- function backs the redesigned guide in ONE round trip: headline counts, the
-- cities (with their own top buildings), the essential buildings to start
-- with, the era spread, the practices with the most work in the country, the
-- members who catalogued it, and the collections that cover it.
--
-- Country membership: a building counts when EITHER its own `country_code`
-- says so OR its locality's does. Neither column alone covers the catalogue —
-- ~2.7k live buildings have no country_code at all, and (for ES) 15 rows have
-- a country_code but no locality.
--
-- `security invoker` on purpose: every table read here is public-readable by
-- policy (buildings, localities, companies, building_credits, profiles,
-- review_images, building_posts, and `is_public` collections), so the caller's
-- own RLS is sufficient and no elevation is warranted. Note this is why no
-- rating/visit aggregate appears in the payload — `user_buildings` is private
-- per member and reading it here would require SECURITY DEFINER.
-- ============================================================================

-- The guide filters buildings by country_code; only `country` (the display
-- name) was indexed.
create index if not exists idx_buildings_country_code
  on public.buildings (country_code)
  where country_code is not null;

create or replace function public.get_country_guide(p_country_code text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with code as (
  select upper(trim(p_country_code)) as cc
),
-- `buildings_count > 0` drops orphan localities — rows left behind when their
-- buildings were renamed, moved or deleted (127 of 6,420; 121 of them in ES
-- alone, all verified to have zero live buildings). Listing them would give a
-- visitor dead-end links and a city count 18% higher than the reality.
city as (
  -- No `hero_image_url`: it is set on 1 locality in 6,420, so a city's photo
  -- comes from its best-photographed building (see `city_cards`).
  select l.id, l.city, l.city_slug, l.country, l.buildings_count, l.lat, l.lng
  from public.localities l
  where l.country_code = (select cc from code)
    and l.buildings_count > 0
),
bld as (
  select
    b.id,
    b.name,
    b.slug,
    b.short_id,
    b.year_completed,
    b.popularity_score,
    b.created_by,
    b.locality_id,
    coalesce(b.city, l.city) as city,
    l.city_slug,
    coalesce(b.hero_image_url, b.community_preview_url) as image_url
  from public.buildings b
  left join public.localities l on l.id = b.locality_id
  where b.is_deleted is not true
    and (
      b.country_code = (select cc from code)
      or l.country_code = (select cc from code)
    )
),
-- Photo-led sections look broken on a photo-less lead, so buildings with an
-- image sort first and popularity decides within each group.
essentials as (
  select b.id, b.name, b.slug, b.short_id, b.city, b.city_slug,
         b.year_completed, b.image_url
  from bld b
  order by (b.image_url is null), b.popularity_score desc, b.name
  limit 7
),
eras as (
  select
    t.from_year,
    t.to_year,
    count(*)::int as count
  from (
    select
      case
        when b.year_completed < 1900 then null
        when b.year_completed < 1945 then 1900
        when b.year_completed < 1975 then 1945
        when b.year_completed < 2000 then 1975
        else 2000
      end as from_year,
      case
        when b.year_completed < 1900 then 1899
        when b.year_completed < 1945 then 1944
        when b.year_completed < 1975 then 1974
        when b.year_completed < 2000 then 1999
        else null
      end as to_year
    from bld b
    where b.year_completed is not null
  ) t
  group by t.from_year, t.to_year
),
practices as (
  select c.id, c.name, c.slug, count(distinct b.id)::int as buildings
  from public.building_credits bc
  join bld b on b.id = bc.building_id
  join public.companies c on c.id = bc.company_id
  where bc.status = 'active'
    and bc.role = 'design_architecture'
  group by c.id, c.name, c.slug
  order by count(distinct b.id) desc, c.name
  limit 8
),
authors as (
  select b.created_by as user_id, count(*)::int as cnt
  from bld b
  where b.created_by is not null
  group by b.created_by
),
photographers as (
  select ri.user_id, count(*)::int as cnt
  from public.review_images ri
  join public.building_posts bp on bp.id = ri.review_id
  join bld b on b.id = bp.building_id
  group by ri.user_id
),
country_ambassadors as (
  select distinct am.user_id
  from public.ambassador_memberships am
  join public.ambassador_chapters ac on ac.id = am.chapter_id
  where ac.country_code = (select cc from code)
    and am.status = 'active'
),
contributor_ids as (
  select user_id from authors
  union
  select user_id from photographers
),
contributors as (
  select
    p.id as user_id,
    p.username,
    p.avatar_url,
    coalesce(a.cnt, 0) as buildings_logged,
    coalesce(ph.cnt, 0) as photos_uploaded,
    (amb.user_id is not null) as is_ambassador
  from contributor_ids ci
  join public.profiles p on p.id = ci.user_id
  left join authors a on a.user_id = ci.user_id
  left join photographers ph on ph.user_id = ci.user_id
  left join country_ambassadors amb on amb.user_id = ci.user_id
  order by (coalesce(a.cnt, 0) * 3 + coalesce(ph.cnt, 0)) desc, p.username
  limit 8
),
-- A collection "covers" the country the same way it covers a city in
-- get_locality_collections: at least two of its pins land here.
collection_counts as (
  select ci.collection_id, count(*)::int as matched
  from public.collection_items ci
  join bld b on b.id = ci.building_id
  group by ci.collection_id
  having count(*) >= 2
),
ranked_collections as (
  select c.id, c.slug, c.name, p.username as owner_username,
         p.avatar_url as owner_avatar_url, cc.matched as building_count
  from collection_counts cc
  join public.collections c on c.id = cc.collection_id and c.is_public = true
  join public.profiles p on p.id = c.owner_id
  order by cc.matched desc, c.name
  limit 6
),
collection_previews as (
  select
    ci.collection_id,
    (array_agg(b.image_url order by ci.order_index)
       filter (where b.image_url is not null))[1:3] as urls
  from public.collection_items ci
  join bld b on b.id = ci.building_id
  where ci.collection_id in (select id from ranked_collections)
  group by ci.collection_id
),
-- Only the cities the page shows as cards get highlights and a photo; the long
-- tail renders as names and counts alone.
ranked_cities as (
  select c.*, row_number() over (order by c.buildings_count desc, c.city) as rn
  from city c
),
city_cards as (
  select
    rc.id,
    (
      select array_agg(h.name)
      from (
        select b.name
        from bld b
        where b.locality_id = rc.id
        order by (b.image_url is null), b.popularity_score desc, b.name
        limit 3
      ) h
    ) as names,
    -- `localities.hero_image_url` is set on 1 of 6,420 rows, so a city's photo
    -- comes from its best-photographed building instead.
    (
      select b.image_url
      from bld b
      where b.locality_id = rc.id and b.image_url is not null
      order by b.popularity_score desc
      limit 1
    ) as preview_image_url
  from ranked_cities rc
  where rc.rn <= 8
)
select jsonb_build_object(
  'country', jsonb_build_object(
    'code', (select cc from code),
    'name', (select rc.country from ranked_cities rc where rc.rn = 1),
    'cities', (select count(*)::int from city),
    'buildings', (select count(*)::int from bld),
    'dated', (select count(b.year_completed)::int from bld b),
    'first_year', (select min(b.year_completed)::int from bld b),
    'last_year', (select max(b.year_completed)::int from bld b),
    'practices', (
      select count(distinct bc.company_id)::int
      from public.building_credits bc
      join bld b on b.id = bc.building_id
      where bc.status = 'active' and bc.role = 'design_architecture'
    ),
    'contributors', (select count(*)::int from contributor_ids),
    'photos', (select coalesce(sum(ph.cnt), 0)::int from photographers ph)
  ),
  -- Every city ships (they are the country's internal links), so the tail is
  -- kept lean: a photo and highlights only for the rows rendered as cards,
  -- coordinates rounded to ~11 m — enough for a city marker.
  'cities', coalesce((
    select jsonb_agg(jsonb_build_object(
      'city', rc.city,
      'city_slug', rc.city_slug,
      'buildings_count', rc.buildings_count,
      'preview_image_url', cc.preview_image_url,
      'lat', round(rc.lat::numeric, 4),
      'lng', round(rc.lng::numeric, 4),
      'highlights', coalesce(to_jsonb(cc.names), '[]'::jsonb)
    ) order by rc.rn)
    from ranked_cities rc
    left join city_cards cc on cc.id = rc.id
  ), '[]'::jsonb),
  'essentials', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id,
      'name', e.name,
      'slug', e.slug,
      'short_id', e.short_id,
      'city', e.city,
      'city_slug', e.city_slug,
      'year_completed', e.year_completed,
      'image_url', e.image_url
    ))
    from essentials e
  ), '[]'::jsonb),
  'eras', coalesce((
    select jsonb_agg(jsonb_build_object(
      'from_year', e.from_year,
      'to_year', e.to_year,
      'count', e.count
    ) order by coalesce(e.from_year, 0))
    from eras e
  ), '[]'::jsonb),
  'practices', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', pr.id,
      'name', pr.name,
      'slug', pr.slug,
      'buildings', pr.buildings
    ) order by pr.buildings desc, pr.name)
    from practices pr
  ), '[]'::jsonb),
  'contributors', coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', co.user_id,
      'username', co.username,
      'avatar_url', co.avatar_url,
      'buildings_logged', co.buildings_logged,
      'photos_uploaded', co.photos_uploaded,
      'is_ambassador', co.is_ambassador
    ) order by (co.buildings_logged * 3 + co.photos_uploaded) desc, co.username)
    from contributors co
  ), '[]'::jsonb),
  'collections', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'slug', r.slug,
      'name', r.name,
      'owner_username', r.owner_username,
      'owner_avatar_url', r.owner_avatar_url,
      'building_count', r.building_count,
      'preview_image_urls', coalesce(to_jsonb(cp.urls), '[]'::jsonb)
    ) order by r.building_count desc, r.name)
    from ranked_collections r
    left join collection_previews cp on cp.collection_id = r.id
  ), '[]'::jsonb)
);
$$;

comment on function public.get_country_guide(text) is
  'Whole-page payload for the /architecture/:cc country guide: counts, cities with highlights, essential buildings, era spread, top practices, contributors, collections. Returns cities=[] for an unknown country code.';

-- Re-assert privileges: create-or-replace resets them. The country guide is a
-- public SEO page, so anon needs execute.
revoke execute on function public.get_country_guide(text) from public;
grant  execute on function public.get_country_guide(text) to anon;
grant  execute on function public.get_country_guide(text) to authenticated;
