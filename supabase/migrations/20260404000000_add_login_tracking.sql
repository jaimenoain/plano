-- Migration to add login tracking
-- Add last_login to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Create login_logs table
CREATE TABLE IF NOT EXISTS login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);

-- RLS
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own login logs" ON login_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins can view all logs (or maybe just for dashboard)
-- For now, we only need insert access for the user.
-- Dashboard accesses via security definer RPC.

-- RPC to track login
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
  UPDATE profiles SET last_login = NOW() WHERE id = v_user_id;
END;
$$;
