-- Migration: Ensure user profile trigger
-- Description: Ensures that the handle_new_user function is up to date and the trigger on auth.users exists.

-- 1. Update the handle_new_user function to include invited_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, invited_by)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'invited_by'
  );
  RETURN new;
END;
$$;

-- 2. Ensure the trigger exists
-- Drop it first to ensure we can recreate it cleanly (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
