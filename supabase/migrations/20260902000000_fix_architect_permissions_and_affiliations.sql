-- Allow updates to architects
create policy "Authenticated users can update architects"
    on public.architects for update
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

-- Create affiliations table
create table public.architect_affiliations (
    studio_id uuid not null references public.architects(id) on delete cascade,
    individual_id uuid not null references public.architects(id) on delete cascade,
    created_at timestamp with time zone not null default now(),
    constraint architect_affiliations_pkey primary key (studio_id, individual_id)
);

-- RLS for affiliations
alter table public.architect_affiliations enable row level security;

create policy "Affiliations are viewable by everyone"
    on public.architect_affiliations for select
    using (true);

create policy "Authenticated users can manage affiliations"
    on public.architect_affiliations for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');
