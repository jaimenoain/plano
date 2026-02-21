-- Create RPC to fetch collection buildings with clean coordinates
create or replace function get_collection_buildings(p_collection_id uuid)
returns table (
  id uuid,
  name text,
  lat double precision,
  lng double precision
)
language plpgsql
as $$
begin
  return query
  select
    b.id,
    b.name,
    st_y(b.location::geometry) as lat,
    st_x(b.location::geometry) as lng
  from
    collection_items ci
    join buildings b on ci.building_id = b.id
  where
    ci.collection_id = p_collection_id
  order by
    ci.order_index;
end;
$$;
