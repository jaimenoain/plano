insert into storage.buckets (id, name, public)
values ('group_covers', 'group_covers', true)
on conflict (id) do nothing;

create policy "Group covers are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'group_covers' );

create policy "Authenticated users can upload group covers"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'group_covers' );

create policy "Authenticated users can update group covers"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'group_covers' );

create policy "Authenticated users can delete group covers"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'group_covers' );
