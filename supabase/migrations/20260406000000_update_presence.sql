-- Rename last_login to last_online
ALTER TABLE profiles RENAME COLUMN last_login TO last_online;

-- Update track_login function to use last_online
CREATE OR REPLACE FUNCTION track_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Insert log
  INSERT INTO login_logs (user_id) VALUES (v_user_id);

  -- Update profile
  UPDATE profiles SET last_online = NOW() WHERE id = v_user_id;
END;
$$;

-- Create update_presence function
CREATE OR REPLACE FUNCTION update_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE profiles SET last_online = NOW() WHERE id = v_user_id;
END;
$$;
