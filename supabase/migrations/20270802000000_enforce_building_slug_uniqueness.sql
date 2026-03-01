-- Enforce uniqueness on the slug column of the public.buildings table.
-- This will automatically create a unique b-tree index on the column, improving search performance.
-- The migration will fail if there are any duplicate slugs, acting as a safety check.

ALTER TABLE public.buildings
ADD CONSTRAINT buildings_slug_key UNIQUE (slug);
