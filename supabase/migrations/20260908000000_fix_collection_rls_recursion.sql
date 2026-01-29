-- Fix infinite recursion in collections policies by using a security definer function
-- to check for contributor status without triggering RLS on collection_contributors table.

CREATE OR REPLACE FUNCTION public.is_collection_contributor(_collection_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.collection_contributors
        WHERE collection_id = _collection_id
        AND user_id = auth.uid()
    );
$$;

DROP POLICY IF EXISTS "Collections are viewable by contributors" ON public.collections;

CREATE POLICY "Collections are viewable by contributors"
ON public.collections FOR SELECT
TO authenticated
USING (
    public.is_collection_contributor(id)
);
