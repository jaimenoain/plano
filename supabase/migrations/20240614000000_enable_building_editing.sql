-- Fix admin permission issue with infinite recursion if not careful
-- We need to check if the user is an admin without triggering policies on the profiles table that might reference other things.
-- Or better, we assume the `is_admin()` function is efficient.

-- First, let's make sure the is_admin function exists and is correct.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
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

-- Now, let's create the policy for UPDATE on buildings.
-- We want to allow update if:
-- 1. The user is the creator (created_by = auth.uid())
-- 2. The user is an admin (is_admin() is true)

-- Drop existing update policy if it exists to be safe (or we can just create if not exists, but replacing is cleaner)
DROP POLICY IF EXISTS "Users can update buildings" ON public.buildings;

CREATE POLICY "Users can update buildings"
ON public.buildings
FOR UPDATE
USING (
  auth.uid() = created_by
  OR
  public.is_admin()
);

-- Ensure we have select access (usually already there as "Enable read access for all users")
-- but good to double check or just leave it if it's working.
-- Assuming "Enable read access for all users" exists.

-- Verify insert is authenticated users only
-- CREATE POLICY "Enable insert for authenticated users only" ON "public"."buildings"
-- FOR INSERT TO "authenticated" WITH CHECK (true);

-- Double check if changing location triggers duplicate check.
-- The requirement says: "Ensure that changing the location of an existing building triggers a new duplicate check to maintain data integrity."
-- This likely means in the frontend UI, but we should also think if we want a trigger in the DB.
-- Usually, UI validation is preferred for "Duplicate check" (soft warning),
-- whereas a unique constraint (hard error) is DB side.
-- The memory says we use fuzzy search for duplicates, so it's not a strict unique constraint.
-- So the "duplicate check" requirement is purely a frontend task to warn the user.
