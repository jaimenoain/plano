-- Migration: Seed Style Attributes

-- 1. Create Attribute Group: Style
INSERT INTO attribute_groups (name, slug)
VALUES ('Style', 'style')
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed Attributes for Style
DO $$
DECLARE
    style_group_id UUID;
BEGIN
    -- Get the ID of the 'Style' group
    SELECT id INTO style_group_id FROM attribute_groups WHERE slug = 'style';

    -- Insert attributes if the group exists
    IF style_group_id IS NOT NULL THEN
        INSERT INTO attributes (group_id, name, slug) VALUES
        (style_group_id, 'Modernist', 'modernist'),
        (style_group_id, 'Brutalist', 'brutalist'),
        (style_group_id, 'Minimalist', 'minimalist'),
        (style_group_id, 'Contemporary', 'contemporary'),
        (style_group_id, 'Industrial', 'industrial'),
        (style_group_id, 'Classical', 'classical'),
        (style_group_id, 'Deconstructivist', 'deconstructivist'),
        (style_group_id, 'Organic', 'organic'),
        (style_group_id, 'Vernacular', 'vernacular')
        ON CONFLICT (group_id, slug) DO NOTHING;
    END IF;
END $$;
