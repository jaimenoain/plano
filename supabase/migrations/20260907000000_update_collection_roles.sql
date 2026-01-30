-- Allow new roles
ALTER TABLE public.collection_contributors
DROP CONSTRAINT IF EXISTS collection_contributors_role_check;

ALTER TABLE public.collection_contributors
ADD CONSTRAINT collection_contributors_role_check
CHECK (role IN ('admin', 'editor', 'contributor', 'viewer'));

-- Create helper function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_collection_admin(_collection_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.collection_contributors
    WHERE collection_id = _collection_id
    AND user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Policies

-- Collections: Owners and Admins can update
DROP POLICY IF EXISTS "Editors can update collections" ON public.collections;
CREATE POLICY "Admins can update collections"
ON public.collections FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collection_contributors
        WHERE collection_id = id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
);

-- Collection Items: Owners, Admins, Editors, Contributors can insert/update/delete

-- INSERT
DROP POLICY IF EXISTS "Owners and editors can insert collection items" ON public.collection_items;
CREATE POLICY "Contributors can insert collection items"
ON public.collection_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.collections c
        LEFT JOIN public.collection_contributors cc ON c.id = cc.collection_id AND cc.user_id = auth.uid()
        WHERE c.id = collection_items.collection_id
        AND (
            c.owner_id = auth.uid()
            OR (cc.user_id IS NOT NULL AND cc.role IN ('admin', 'editor', 'contributor'))
        )
    )
);

-- UPDATE
DROP POLICY IF EXISTS "Owners and editors can update collection items" ON public.collection_items;
CREATE POLICY "Contributors can update collection items"
ON public.collection_items FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collections c
        LEFT JOIN public.collection_contributors cc ON c.id = cc.collection_id AND cc.user_id = auth.uid()
        WHERE c.id = collection_items.collection_id
        AND (
            c.owner_id = auth.uid()
            OR (cc.user_id IS NOT NULL AND cc.role IN ('admin', 'editor', 'contributor'))
        )
    )
);

-- DELETE
DROP POLICY IF EXISTS "Owners and editors can delete collection items" ON public.collection_items;
CREATE POLICY "Contributors can delete collection items"
ON public.collection_items FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collections c
        LEFT JOIN public.collection_contributors cc ON c.id = cc.collection_id AND cc.user_id = auth.uid()
        WHERE c.id = collection_items.collection_id
        AND (
            c.owner_id = auth.uid()
            OR (cc.user_id IS NOT NULL AND cc.role IN ('admin', 'editor', 'contributor'))
        )
    )
);

-- Policies for collection_contributors (Admins management)

CREATE POLICY "Admins can insert contributors"
ON public.collection_contributors FOR INSERT
TO authenticated
WITH CHECK (
    public.is_collection_admin(collection_id)
);

CREATE POLICY "Admins can update contributors"
ON public.collection_contributors FOR UPDATE
TO authenticated
USING (
    public.is_collection_admin(collection_id)
);

CREATE POLICY "Admins can delete contributors"
ON public.collection_contributors FOR DELETE
TO authenticated
USING (
    public.is_collection_admin(collection_id)
);
