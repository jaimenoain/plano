
-- Add notification_preferences column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}'::jsonb;

-- Create function to check notification preferences
CREATE OR REPLACE FUNCTION check_notification_preference()
RETURNS TRIGGER AS $$
DECLARE
  pref jsonb;
  n_type text;
BEGIN
  -- Get user preferences
  SELECT notification_preferences INTO pref FROM profiles WHERE id = NEW.user_id;

  -- If preferences is null, allow insert (all active by default)
  IF pref IS NULL THEN
    RETURN NEW;
  END IF;

  n_type := NEW.type;

  -- Check if the type is explicitly set to false
  -- We assume if it's missing, it's true (default active)
  IF (pref ->> n_type) = 'false' THEN
    RETURN NULL; -- Block insertion silently
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow idempotency
DROP TRIGGER IF EXISTS before_insert_notifications ON notifications;

-- Create trigger
CREATE TRIGGER before_insert_notifications
BEFORE INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION check_notification_preference();
