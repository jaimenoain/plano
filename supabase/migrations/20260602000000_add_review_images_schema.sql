-- Create review_images table
CREATE TABLE IF NOT EXISTS public.review_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.user_buildings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for review_images
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;

-- Policies for review_images
CREATE POLICY "Review images are viewable by everyone"
ON public.review_images FOR SELECT
USING (true);

CREATE POLICY "Users can upload their own review images"
ON public.review_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review images"
ON public.review_images FOR DELETE
USING (auth.uid() = user_id);

-- Create image_likes table
CREATE TABLE IF NOT EXISTS public.image_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES public.review_images(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, image_id)
);

-- Enable RLS for image_likes
ALTER TABLE public.image_likes ENABLE ROW LEVEL SECURITY;

-- Policies for image_likes
CREATE POLICY "Image likes are viewable by everyone"
ON public.image_likes FOR SELECT
USING (true);

CREATE POLICY "Users can create their own image likes"
ON public.image_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own image likes"
ON public.image_likes FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for review_images
INSERT INTO storage.buckets (id, name, public)
VALUES ('review_images', 'review_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Review images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'review_images');

CREATE POLICY "Authenticated users can upload review images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'review_images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own review images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'review_images' AND
  auth.uid() = owner
);

CREATE POLICY "Users can delete their own review images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'review_images' AND
  auth.uid() = owner
);

-- Function to handle likes count
CREATE OR REPLACE FUNCTION public.handle_image_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.review_images
        SET likes_count = likes_count + 1
        WHERE id = NEW.image_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.review_images
        SET likes_count = likes_count - 1
        WHERE id = OLD.image_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for likes count
CREATE TRIGGER on_image_like_change
AFTER INSERT OR DELETE ON public.image_likes
FOR EACH ROW
EXECUTE FUNCTION public.handle_image_likes_count();
