-- Create Extension (Ensure it exists)
create extension if not exists pg_trgm;

-- Create Enum
create type public.architect_type as enum ('individual', 'studio');

-- Create Architects Table
create table public.architects (
    id uuid not null default gen_random_uuid(),
    name text not null,
    type public.architect_type not null default 'individual',
    created_at timestamp with time zone not null default now(),
    created_by uuid references auth.users(id),
    constraint architects_pkey primary key (id),
    constraint architects_name_key unique (name)
);

-- Create Junction Table
create table public.building_architects (
    building_id uuid not null references public.buildings(id) on delete cascade,
    architect_id uuid not null references public.architects(id) on delete cascade,
    created_at timestamp with time zone not null default now(),
    constraint building_architects_pkey primary key (building_id, architect_id)
);

-- Indexes
create index architects_name_idx on public.architects using gin (name gin_trgm_ops);

-- RLS
alter table public.architects enable row level security;
alter table public.building_architects enable row level security;

-- Policies for Architects
create policy "Architects are viewable by everyone"
    on public.architects for select
    using (true);

create policy "Authenticated users can create architects"
    on public.architects for insert
    with check (auth.role() = 'authenticated');

-- Policies for Building Architects
create policy "Building Architects are viewable by everyone"
    on public.building_architects for select
    using (true);

create policy "Authenticated users can link architects"
    on public.building_architects for insert
    with check (auth.role() = 'authenticated');
