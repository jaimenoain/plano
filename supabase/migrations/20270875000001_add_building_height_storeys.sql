alter table buildings
  add column if not exists height_m numeric,
  add column if not exists storeys integer;
