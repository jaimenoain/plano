
ALTER TABLE polls ADD COLUMN slug text;

-- Basic slug generation for existing polls
UPDATE polls
SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'));

-- Remove leading/trailing hyphens
UPDATE polls SET slug = trim(both '-' from slug);

-- If slug is empty (e.g. title was "???"), fall back to id
UPDATE polls SET slug = id WHERE slug IS NULL OR slug = '';

-- Handle duplicates within group by appending a counter
-- We use a CTE to identify duplicates and generate a new slug
WITH duplicates AS (
  SELECT
    id,
    slug,
    group_id,
    ROW_NUMBER() OVER (PARTITION BY group_id, slug ORDER BY created_at) as rn
  FROM polls
)
UPDATE polls
SET slug = polls.slug || '-' || (duplicates.rn - 1)::text
FROM duplicates
WHERE polls.id = duplicates.id
  AND duplicates.rn > 1;

-- Add the unique constraint.
ALTER TABLE polls ADD CONSTRAINT polls_group_id_slug_key UNIQUE (group_id, slug);
