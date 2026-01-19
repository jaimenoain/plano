-- Create saved_views table
CREATE TABLE IF NOT EXISTS public.saved_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saved views"
    ON public.saved_views
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved views"
    ON public.saved_views
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved views"
    ON public.saved_views
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved views"
    ON public.saved_views
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create unique index for pinned view per user
-- Only one row with is_pinned = true allowed per user_id
CREATE UNIQUE INDEX unique_pinned_view_per_user
    ON public.saved_views (user_id)
    WHERE (is_pinned = true);

-- Add comments for documentation
COMMENT ON TABLE public.saved_views IS 'Stores user saved search filters';
COMMENT ON COLUMN public.saved_views.filters IS 'JSONB structure of filter configuration, excluding search query';
