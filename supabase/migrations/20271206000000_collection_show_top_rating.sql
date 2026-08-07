-- Persisted, per-collection display setting: show the building's top member
-- rating (and who gave it) in the collection list, under the Member Ratings
-- categorization method. Mirrors show_added_by (visible to everyone viewing
-- the collection when enabled).
ALTER TABLE public.collections
  ADD COLUMN show_top_rating boolean NOT NULL DEFAULT false;
