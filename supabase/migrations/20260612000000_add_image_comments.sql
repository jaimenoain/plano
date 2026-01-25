-- Create image_comments table
CREATE TABLE IF NOT EXISTS public.image_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES public.review_images(id) ON DELETE CASCADE,
    content TEXT NOT NULL
);

-- Enable RLS for image_comments
ALTER TABLE public.image_comments ENABLE ROW LEVEL SECURITY;

-- Policies for image_comments
CREATE POLICY "Image comments are viewable by everyone"
ON public.image_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create image comments"
ON public.image_comments FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own image comments"
ON public.image_comments FOR DELETE
USING (auth.uid() = user_id);
