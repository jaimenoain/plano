-- Fix: Collection Settings drawer reported success but never saved.
--
-- Symptom (confirmed with the user): editing a collection's settings shows a
-- "Collection updated" toast, but the change never persists — for the owner AND
-- for editor-collaborators. A Supabase UPDATE that matches zero rows returns
-- `{ data: null, error: null }`, so the client could not tell a rejected write
-- from a successful one (the client is now hardened with `.select()` too).
--
-- The live database (probed 2026-07-23) had drifted from the create migration
-- `20260906000000_create_collections.sql`:
--   * the "Editors can update collections" policy was MISSING entirely, so
--     editor-collaborators matched zero rows on UPDATE (confirmed: an editor
--     UPDATE matched 0 rows, an owner UPDATE matched 1) — hence editors could
--     never save collection settings; and
--   * a stray "Admins can update collections" policy existed with a broken
--     predicate (`collection_contributors.collection_id = collection_contributors.id`,
--     comparing a contributor row's collection_id to its own id) that never
--     matches anyone. The intended design (see PR #1609) is owner + editor only,
--     with no admin bypass on collections, so this legacy policy is removed.
--
-- This migration reconciles prod to the intended state: owner may update, editor
-- contributor may update, no admin policy. It is idempotent and safe to re-run.
--
-- types-neutral: RLS policy changes do not alter the generated Supabase types.

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Remove the legacy, broken admin-bypass policy (not part of the intended design).
DROP POLICY IF EXISTS "Admins can update collections" ON public.collections;

DROP POLICY IF EXISTS "Owners can update collections" ON public.collections;
CREATE POLICY "Owners can update collections"
ON public.collections FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

-- NOTE the explicit `cc` alias and `collections.id` qualification. The original
-- create migration wrote `WHERE collection_id = id`, where the unqualified `id`
-- silently bound to `collection_contributors.id` (the inner table) instead of the
-- outer `collections.id`, so the correlation never held and the policy matched no
-- rows — the real reason editors could never save. Qualify both sides to fix it.
DROP POLICY IF EXISTS "Editors can update collections" ON public.collections;
CREATE POLICY "Editors can update collections"
ON public.collections FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collection_contributors cc
        WHERE cc.collection_id = collections.id
        AND cc.user_id = auth.uid()
        AND cc.role = 'editor'
    )
);
