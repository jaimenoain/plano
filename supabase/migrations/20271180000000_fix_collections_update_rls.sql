-- Fix: Collection Settings drawer reported success but never saved.
--
-- Symptom (confirmed with the user): editing a collection's settings shows a
-- "Collection updated" toast, but the change never persists — for the owner AND
-- for editor-collaborators. A Supabase UPDATE that matches zero rows returns
-- `{ data: null, error: null }`, so the client could not tell a rejected write
-- from a successful one (the client is now hardened with `.select()` too).
--
-- The only way even the *owner* matches zero rows is that the row-level-security
-- UPDATE policies on `public.collections` are not effective in the live database
-- (applied state having drifted from the create migration
-- `20260906000000_create_collections.sql`). This migration idempotently
-- re-asserts those two UPDATE policies exactly as originally intended:
--   * owners may update their own collection, and
--   * editor-contributors may update collections they collaborate on.
-- It is safe to run whether or not the policies already exist.

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can update collections" ON public.collections;
CREATE POLICY "Owners can update collections"
ON public.collections FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Editors can update collections" ON public.collections;
CREATE POLICY "Editors can update collections"
ON public.collections FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collection_contributors
        WHERE collection_id = id
        AND user_id = auth.uid()
        AND role = 'editor'
    )
);
