update buildings
set size_category = case size_category
  when 'micro' then 'xs'
  when 'residential' then 's'
  when 'boutique' then 'm'
  when 'institutional' then 'l'
  when 'mega' then 'xl'
  when 'high_rise' then 'xxl'
  else size_category
end
where size_category in ('micro', 'residential', 'boutique', 'institutional', 'mega', 'high_rise');
