create table public.review_links (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.user_buildings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  title text,
  created_at timestamptz default now()
);

alter table public.review_links enable row level security;

create policy "Public can view review links"
  on public.review_links for select
  using (true);

create policy "Users can insert their own review links"
  on public.review_links for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own review links"
  on public.review_links for update
  using (auth.uid() = user_id);

create policy "Users can delete their own review links"
  on public.review_links for delete
  using (auth.uid() = user_id);

create table public.link_likes (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.review_links(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(link_id, user_id)
);

alter table public.link_likes enable row level security;

create policy "Public can view link likes"
  on public.link_likes for select
  using (true);

create policy "Users can insert their own link likes"
  on public.link_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own link likes"
  on public.link_likes for delete
  using (auth.uid() = user_id);

create or replace function public.get_building_top_links(
  p_building_id uuid,
  p_limit int default 5
)
returns table (
  link_id uuid,
  url text,
  title text,
  like_count bigint,
  user_username text,
  user_avatar text
)
language plpgsql
as $$
begin
  return query
  select
    rl.id as link_id,
    rl.url,
    rl.title,
    count(ll.id) as like_count,
    p.username as user_username,
    p.avatar_url as user_avatar
  from
    public.review_links rl
  join
    public.user_buildings ub on rl.review_id = ub.id
  left join
    public.link_likes ll on rl.id = ll.link_id
  join
    public.profiles p on rl.user_id = p.id
  where
    ub.building_id = p_building_id
  group by
    rl.id, rl.url, rl.title, p.username, p.avatar_url
  order by
    like_count desc,
    rl.created_at desc
  limit p_limit;
end;
$$;
