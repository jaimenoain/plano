-- Create a function to check slug availability
CREATE OR REPLACE FUNCTION public.check_slug_availability(target_slug text, exclude_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_available boolean;
BEGIN
  -- A slug is available if no building exists with the same slug that is NOT deleted.
  -- Exclude the provided ID if one is given.
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.buildings
    WHERE slug = target_slug
      AND (exclude_id IS NULL OR id != exclude_id)
      AND (is_deleted IS FALSE OR is_deleted IS NULL)
  ) INTO is_available;

  RETURN is_available;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.check_slug_availability TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_slug_availability TO anon;
