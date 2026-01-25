-- Add functional_category_id to buildings table
ALTER TABLE buildings
ADD COLUMN functional_category_id UUID REFERENCES functional_categories(id) ON DELETE SET NULL;
