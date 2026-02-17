-- Add alt_name column for secondary display (subtitle)
ALTER TABLE buildings
ADD COLUMN alt_name text;

-- Add aliases column for search indexing only
ALTER TABLE buildings
ADD COLUMN aliases text[] NOT NULL DEFAULT '{}';

-- Add comments to the columns
COMMENT ON COLUMN buildings.alt_name IS 'Secondary display name (subtitle), e.g. "The Gherkin"';
COMMENT ON COLUMN buildings.aliases IS 'Hidden search aliases for indexing only, e.g. "Mary Axe"';
