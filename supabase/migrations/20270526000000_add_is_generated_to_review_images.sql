ALTER TABLE public.review_images ADD COLUMN IF NOT EXISTS is_generated BOOLEAN DEFAULT false;
COMMENT ON COLUMN public.review_images.is_generated IS 'Flag to indicate if the image is a CGI/Render';
