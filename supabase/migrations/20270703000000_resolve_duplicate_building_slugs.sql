-- Find all buildings that share a slug with at least one other building and
-- append a hyphen and their short_id to the existing slug to ensure uniqueness.

WITH duplicate_slugs AS (
    SELECT slug
    FROM public.buildings
    WHERE slug IS NOT NULL
    GROUP BY slug
    HAVING COUNT(*) > 1
)
UPDATE public.buildings b
SET slug = b.slug || '-' || b.short_id::text
FROM duplicate_slugs ds
WHERE b.slug = ds.slug;
