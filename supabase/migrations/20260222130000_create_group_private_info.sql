create table if not exists "public"."group_private_info" (
    "group_id" uuid not null references "public"."groups"("id") on delete cascade,
    "home_base" text,
    constraint "group_private_info_pkey" primary key ("group_id")
);

alter table "public"."group_private_info" enable row level security;

create policy "Members can view private info"
on "public"."group_private_info"
as permissive
for select
to authenticated
using (
    (auth.uid() IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_private_info.group_id
        AND group_members.status = 'active'
    ))
);

create policy "Admins can update private info"
on "public"."group_private_info"
as permissive
for all
to authenticated
using (
    (auth.uid() IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_private_info.group_id
        AND group_members.role = 'admin'
    ))
);
