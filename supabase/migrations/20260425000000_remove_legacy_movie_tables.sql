-- Drop legacy tables from the movie era that are no longer required
-- 1. film_availability: Tracks streaming providers (irrelevant for buildings)
-- 2. watchlist_notifications: Tracks movie availability notifications (irrelevant for buildings)
-- 3. session_films: Replaced by session_buildings

DROP TABLE IF EXISTS public.film_availability CASCADE;
DROP TABLE IF EXISTS public.watchlist_notifications CASCADE;
DROP TABLE IF EXISTS public.session_films CASCADE;
