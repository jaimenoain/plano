-- Pixel dimensions of the stored file (after client resize). Used for building detail hero eligibility
-- (landscape, min width) without fetching binary metadata at request time.
ALTER TABLE public.review_images
  ADD COLUMN IF NOT EXISTS width_px integer,
  ADD COLUMN IF NOT EXISTS height_px integer;

COMMENT ON COLUMN public.review_images.width_px IS 'Output width in pixels of the stored image file (nullable for legacy rows).';
COMMENT ON COLUMN public.review_images.height_px IS 'Output height in pixels of the stored image file (nullable for legacy rows).';
