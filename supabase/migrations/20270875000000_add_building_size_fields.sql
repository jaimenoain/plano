alter table buildings
  add column if not exists size_sqm numeric,
  add column if not exists size_category text;
