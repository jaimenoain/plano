-- Add hero_image_url column to buildings
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS hero_image_url text;

-- Update the computed column function to prefer hero_image_url
CREATE OR REPLACE FUNCTION main_image_url(b buildings)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    b.hero_image_url,
    (
      SELECT ri.storage_path
      FROM review_images ri
      JOIN user_buildings ub ON ri.review_id = ub.id
      WHERE ub.building_id = b.id
      ORDER BY ri.likes_count DESC, ri.created_at DESC
      LIMIT 1
    )
  );
$$;
