
-- Migration: Add slug to groups
-- Description: Adds a slug column to the groups table and auto-generates slugs for existing groups.

-- 1. Add column as nullable first
ALTER TABLE groups ADD COLUMN IF NOT EXISTS slug text;

-- 2. Create function to generate unique slugs
CREATE OR REPLACE FUNCTION generate_unique_slug(name text, group_id uuid)
RETURNS text AS $$
DECLARE
    new_slug text;
    base_slug text;
    counter integer := 0;
    slug_exists boolean;
BEGIN
    -- Normalize name to slug (lowercase, replace non-alphanumeric with _, trim)
    base_slug := lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '_', 'g'));
    -- Remove leading/trailing underscores
    base_slug := trim(both '_' from base_slug);

    -- Fallback if empty
    IF base_slug = '' THEN
        base_slug := 'group';
    END IF;

    new_slug := base_slug;

    LOOP
        -- Check if slug exists in OTHER groups
        SELECT EXISTS (
            SELECT 1 FROM groups
            WHERE slug = new_slug
            AND id != group_id
        ) INTO slug_exists;

        EXIT WHEN NOT slug_exists;

        counter := counter + 1;
        new_slug := base_slug || '_' || counter;
    END LOOP;

    RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- 3. Backfill existing groups
DO $$
DECLARE
    g record;
BEGIN
    FOR g IN SELECT id, name FROM groups WHERE slug IS NULL LOOP
        UPDATE groups
        SET slug = generate_unique_slug(g.name, g.id)
        WHERE id = g.id;
    END LOOP;
END $$;

-- 4. Add constraint unique and not null
ALTER TABLE groups ALTER COLUMN slug SET NOT NULL;
ALTER TABLE groups ADD CONSTRAINT groups_slug_key UNIQUE (slug);

-- 5. Trigger to auto-update slug on insert/update of name (if slug not provided)
CREATE OR REPLACE FUNCTION set_group_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if slug is null or empty string
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_unique_slug(NEW.name, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_set_group_slug
BEFORE INSERT ON groups
FOR EACH ROW
EXECUTE FUNCTION set_group_slug();

-- Optional: If you want slug to update when name changes (user might not want this to preserve links)
-- Currently I will only set it on INSERT if missing.
-- User requirement: "automatically generated from the name... admins can change this in group settings"
