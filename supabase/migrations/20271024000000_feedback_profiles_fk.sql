-- Add a FK from feedback.user_id to public.profiles(id) so PostgREST can
-- resolve the profiles join in the admin feedback page.
-- The existing FK to auth.users is kept; this one adds a traversable path
-- through the public schema.
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
