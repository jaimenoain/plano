-- Migration: Faceted Classification System

-- 1. Create Tables

-- Level 1: Functional Categories
CREATE TABLE IF NOT EXISTS functional_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Level 2: Functional Typologies
CREATE TABLE IF NOT EXISTS functional_typologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_category_id UUID NOT NULL REFERENCES functional_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(parent_category_id, slug)
);

-- Attribute Groups
CREATE TABLE IF NOT EXISTS attribute_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Attributes
CREATE TABLE IF NOT EXISTS attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES attribute_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_id, slug)
);

-- Junction: Building <-> Functional Typologies
CREATE TABLE IF NOT EXISTS building_functional_typologies (
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    typology_id UUID NOT NULL REFERENCES functional_typologies(id) ON DELETE CASCADE,
    PRIMARY KEY (building_id, typology_id)
);

-- Junction: Building <-> Attributes
CREATE TABLE IF NOT EXISTS building_attributes (
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    PRIMARY KEY (building_id, attribute_id)
);

-- 2. Enable RLS

ALTER TABLE functional_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE functional_typologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribute_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_functional_typologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_attributes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- functional_categories
CREATE POLICY "Public read access for functional_categories" ON functional_categories FOR SELECT USING (true);
CREATE POLICY "Admin write access for functional_categories" ON functional_categories FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update access for functional_categories" ON functional_categories FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete access for functional_categories" ON functional_categories FOR DELETE TO authenticated USING (public.is_admin());

-- functional_typologies
CREATE POLICY "Public read access for functional_typologies" ON functional_typologies FOR SELECT USING (true);
CREATE POLICY "Admin write access for functional_typologies" ON functional_typologies FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update access for functional_typologies" ON functional_typologies FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete access for functional_typologies" ON functional_typologies FOR DELETE TO authenticated USING (public.is_admin());

-- attribute_groups
CREATE POLICY "Public read access for attribute_groups" ON attribute_groups FOR SELECT USING (true);
CREATE POLICY "Admin write access for attribute_groups" ON attribute_groups FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update access for attribute_groups" ON attribute_groups FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete access for attribute_groups" ON attribute_groups FOR DELETE TO authenticated USING (public.is_admin());

-- attributes
CREATE POLICY "Public read access for attributes" ON attributes FOR SELECT USING (true);
CREATE POLICY "Admin write access for attributes" ON attributes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update access for attributes" ON attributes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete access for attributes" ON attributes FOR DELETE TO authenticated USING (public.is_admin());

-- building_functional_typologies
CREATE POLICY "Public read access for building_functional_typologies" ON building_functional_typologies FOR SELECT USING (true);
CREATE POLICY "Admin write access for building_functional_typologies" ON building_functional_typologies FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update access for building_functional_typologies" ON building_functional_typologies FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete access for building_functional_typologies" ON building_functional_typologies FOR DELETE TO authenticated USING (public.is_admin());

-- building_attributes
CREATE POLICY "Public read access for building_attributes" ON building_attributes FOR SELECT USING (true);
CREATE POLICY "Admin write access for building_attributes" ON building_attributes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin update access for building_attributes" ON building_attributes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete access for building_attributes" ON building_attributes FOR DELETE TO authenticated USING (public.is_admin());


-- 4. Seed Data

-- Categories
INSERT INTO functional_categories (name, slug) VALUES
('Residential', 'residential'),
('Commercial', 'commercial'),
('Cultural', 'cultural'),
('Hospitality', 'hospitality'),
('Educational', 'educational'),
('Public/Civic', 'public-civic')
ON CONFLICT (slug) DO NOTHING;

-- Typologies
DO $$
DECLARE
    res_id UUID;
    cul_id UUID;
BEGIN
    SELECT id INTO res_id FROM functional_categories WHERE slug = 'residential';
    SELECT id INTO cul_id FROM functional_categories WHERE slug = 'cultural';

    IF res_id IS NOT NULL THEN
        INSERT INTO functional_typologies (parent_category_id, name, slug) VALUES
        (res_id, 'Single Family', 'single-family'),
        (res_id, 'Apartment Block', 'apartment-block'),
        (res_id, 'Social Housing', 'social-housing')
        ON CONFLICT (parent_category_id, slug) DO NOTHING;
    END IF;

    IF cul_id IS NOT NULL THEN
        INSERT INTO functional_typologies (parent_category_id, name, slug) VALUES
        (cul_id, 'Museum', 'museum'),
        (cul_id, 'Gallery', 'gallery'),
        (cul_id, 'Pavilion', 'pavilion')
        ON CONFLICT (parent_category_id, slug) DO NOTHING;
    END IF;
END $$;

-- Attribute Groups
INSERT INTO attribute_groups (name, slug) VALUES
('Intervention', 'intervention'),
('Materiality', 'materiality'),
('Context', 'context'),
('Scale', 'scale')
ON CONFLICT (slug) DO NOTHING;

-- Attributes
DO $$
DECLARE
    int_id UUID;
    mat_id UUID;
    con_id UUID;
BEGIN
    SELECT id INTO int_id FROM attribute_groups WHERE slug = 'intervention';
    SELECT id INTO mat_id FROM attribute_groups WHERE slug = 'materiality';
    SELECT id INTO con_id FROM attribute_groups WHERE slug = 'context';

    IF int_id IS NOT NULL THEN
        INSERT INTO attributes (group_id, name, slug) VALUES
        (int_id, 'New Build', 'new-build'),
        (int_id, 'Renovation', 'renovation'),
        (int_id, 'Adaptive Reuse', 'adaptive-reuse')
        ON CONFLICT (group_id, slug) DO NOTHING;
    END IF;

    IF mat_id IS NOT NULL THEN
        INSERT INTO attributes (group_id, name, slug) VALUES
        (mat_id, 'Concrete', 'concrete'),
        (mat_id, 'Brick', 'brick'),
        (mat_id, 'Timber', 'timber'),
        (mat_id, 'Glass', 'glass'),
        (mat_id, 'Stone', 'stone')
        ON CONFLICT (group_id, slug) DO NOTHING;
    END IF;

    IF con_id IS NOT NULL THEN
        INSERT INTO attributes (group_id, name, slug) VALUES
        (con_id, 'Urban', 'urban'),
        (con_id, 'Rural', 'rural'),
        (con_id, 'Coastal', 'coastal'),
        (con_id, 'Alpine', 'alpine')
        ON CONFLICT (group_id, slug) DO NOTHING;
    END IF;
END $$;
