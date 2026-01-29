CREATE OR REPLACE FUNCTION migrate_tags_to_collections()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    tag_text TEXT;
    new_collection_id UUID;
    new_slug TEXT;
    base_slug TEXT;
    slug_counter INT;
BEGIN
    -- Iterate over every unique (user_id, tag) pair
    FOR r IN
        SELECT DISTINCT user_id, unnest(tags) AS tag
        FROM user_buildings
        WHERE tags IS NOT NULL AND tags <> '{}'
    LOOP
        tag_text := r.tag;

        -- Check if a collection with this name already exists for the user
        SELECT id INTO new_collection_id
        FROM collections
        WHERE owner_id = r.user_id AND name = tag_text;

        -- If not, create it
        IF new_collection_id IS NULL THEN
            -- Generate a base slug
            base_slug := lower(regexp_replace(tag_text, '[^a-zA-Z0-9]+', '-', 'g'));
            base_slug := trim(both '-' from base_slug);
            IF base_slug = '' THEN base_slug := 'collection'; END IF;

            new_slug := base_slug;
            slug_counter := 0;

            -- Check for global slug uniqueness
            LOOP
                IF NOT EXISTS (SELECT 1 FROM collections WHERE slug = new_slug) THEN
                    EXIT;
                END IF;
                slug_counter := slug_counter + 1;
                new_slug := base_slug || '-' || slug_counter;
            END LOOP;

            INSERT INTO collections (owner_id, name, slug, is_public)
            VALUES (r.user_id, tag_text, new_slug, false)
            RETURNING id INTO new_collection_id;
        END IF;

        -- Add buildings with this tag to the collection
        INSERT INTO collection_items (collection_id, building_id)
        SELECT new_collection_id, ub.building_id
        FROM user_buildings ub
        WHERE ub.user_id = r.user_id
          AND tag_text = ANY(ub.tags)
          AND NOT EXISTS (
              SELECT 1 FROM collection_items ci
              WHERE ci.collection_id = new_collection_id
              AND ci.building_id = ub.building_id
          );

    END LOOP;
END;
$$;

-- Execute the migration
SELECT migrate_tags_to_collections();
