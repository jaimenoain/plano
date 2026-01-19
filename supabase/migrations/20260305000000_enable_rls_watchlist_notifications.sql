ALTER TABLE public.watchlist_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist notifications"
    ON public.watchlist_notifications
    FOR SELECT
    USING (auth.uid() = user_id);
