-- Create collection_favorites table
create table if not exists collection_favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  collection_id uuid references collections(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, collection_id)
);

-- Enable RLS
alter table collection_favorites enable row level security;

-- Policies
create policy "Favorites are viewable by everyone"
  on collection_favorites for select
  using ( true );

create policy "Users can insert their own favorites"
  on collection_favorites for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own favorites"
  on collection_favorites for delete
  using ( auth.uid() = user_id );
