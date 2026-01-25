-- Fix the handle_new_user function to match the profiles schema (remove email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN new;
END;
$$;

-- Backfill missing profiles for existing users
DO $$
DECLARE
  missing_user RECORD;
  new_username text;
BEGIN
  FOR missing_user IN
    SELECT u.id, u.raw_user_meta_data, u.email
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL
  LOOP
    -- Generate a username if needed
    IF length(COALESCE(missing_user.raw_user_meta_data ->> 'username', '')) >= 3 THEN
      new_username := missing_user.raw_user_meta_data ->> 'username';
    ELSIF length(split_part(missing_user.email, '@', 1)) >= 3 THEN
      new_username := split_part(missing_user.email, '@', 1);
    ELSE
      new_username := 'user_' || substr(md5(random()::text), 1, 8);
    END IF;

    BEGIN
      INSERT INTO public.profiles (id, username, avatar_url)
      VALUES (
        missing_user.id,
        new_username,
        missing_user.raw_user_meta_data ->> 'avatar_url'
      );
    EXCEPTION WHEN unique_violation THEN
      -- Handle unique constraint violation on username by appending random string
      INSERT INTO public.profiles (id, username, avatar_url)
      VALUES (
        missing_user.id,
        new_username || '_' || substr(md5(random()::text), 1, 4),
        missing_user.raw_user_meta_data ->> 'avatar_url'
      );
    END;
  END LOOP;
END $$;
