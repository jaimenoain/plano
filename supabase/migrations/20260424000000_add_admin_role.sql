
-- 1. Add 'role' column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Create is_admin() helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$$;

-- 3. Update RLS policy for buildings table
-- First, drop the existing policy
DROP POLICY IF EXISTS "Users can update their own buildings" ON public.buildings;

-- Re-create the policy with the Admin override
CREATE POLICY "Users can update their own buildings"
ON public.buildings
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() OR public.is_admin()
)
WITH CHECK (
  created_by = auth.uid() OR public.is_admin()
);
