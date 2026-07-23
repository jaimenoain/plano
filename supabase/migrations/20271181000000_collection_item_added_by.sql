-- Attribution for collection buildings: record WHICH user added each building,
-- and a per-collection toggle to surface "Added by @username" in the list.
--
-- `added_by` defaults to auth.uid(): because every insert into collection_items
-- runs client-side as the acting user (gated by RLS), the adder is captured
-- automatically at every insert site with no application changes. Nullable so
-- pre-existing rows (and any service-role inserts) stay NULL and simply render
-- no attribution label.
ALTER TABLE public.collection_items
  ADD COLUMN added_by uuid DEFAULT auth.uid();

ALTER TABLE public.collection_items
  ADD CONSTRAINT collection_items_added_by_fkey
  FOREIGN KEY (added_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Persisted, per-collection display setting (mirrors show_community_images).
-- Visible to everyone viewing the collection when enabled.
ALTER TABLE public.collections
  ADD COLUMN show_added_by boolean NOT NULL DEFAULT false;
