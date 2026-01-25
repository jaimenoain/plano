-- Create Architectural Styles Table
CREATE TABLE IF NOT EXISTS architectural_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Junction Table
CREATE TABLE IF NOT EXISTS building_styles (
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    style_id UUID NOT NULL REFERENCES architectural_styles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (building_id, style_id)
);

-- Enable RLS
ALTER TABLE architectural_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_styles ENABLE ROW LEVEL SECURITY;

-- Policies for architectural_styles
CREATE POLICY "Public read access for architectural_styles" ON architectural_styles
    FOR SELECT USING (true);

-- Allow authenticated users to create new styles (like Architects)
CREATE POLICY "Authenticated insert access for architectural_styles" ON architectural_styles
    FOR INSERT TO authenticated WITH CHECK (true);

-- Only admins can update/delete styles to maintain taxonomy quality
CREATE POLICY "Admin update access for architectural_styles" ON architectural_styles
    FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete access for architectural_styles" ON architectural_styles
    FOR DELETE TO authenticated USING (public.is_admin());

-- Policies for building_styles
CREATE POLICY "Public read access for building_styles" ON building_styles
    FOR SELECT USING (true);

-- Allow building creators (or anyone adding a building) to link styles
CREATE POLICY "Authenticated insert access for building_styles" ON building_styles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can delete their own building links" ON building_styles
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM buildings WHERE id = building_styles.building_id AND created_by = auth.uid())
        OR public.is_admin()
    );

-- Migration Logic
DO $$
DECLARE
    r RECORD;
    s TEXT;
    style_uuid UUID;
    slug_val TEXT;
BEGIN
    -- Loop through all buildings with styles
    FOR r IN SELECT id, styles FROM buildings WHERE styles IS NOT NULL AND array_length(styles, 1) > 0 LOOP
        FOREACH s IN ARRAY r.styles LOOP
            -- Normalize style name (trim)
            s := trim(s);
            IF length(s) > 0 THEN
                -- Generate slug: lowercase, replace non-alphanumeric with dash, trim dashes
                slug_val := lower(regexp_replace(s, '[^a-zA-Z0-9]+', '-', 'g'));
                slug_val := trim(both '-' from slug_val);

                IF length(slug_val) > 0 THEN
                    -- Insert style if not exists
                    -- We use ON CONFLICT DO UPDATE to ensure we get a return, or separate SELECT
                    INSERT INTO architectural_styles (name, slug)
                    VALUES (s, slug_val)
                    ON CONFLICT (slug) DO NOTHING;

                    SELECT id INTO style_uuid FROM architectural_styles WHERE slug = slug_val;

                    -- Insert junction
                    IF style_uuid IS NOT NULL THEN
                        INSERT INTO building_styles (building_id, style_id)
                        VALUES (r.id, style_uuid)
                        ON CONFLICT DO NOTHING;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END $$;
