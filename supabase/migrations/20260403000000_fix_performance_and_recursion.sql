-- Fix performance issues and potential recursion

-- 1. ADD MISSING INDEXES
-- The admin dashboard performs aggregate queries on these tables filtering by created_at.
-- Without indexes, these queries trigger full table scans, causing timeouts.

CREATE INDEX IF NOT EXISTS idx_log_created_at ON log(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_session_comments_created_at ON session_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON likes(created_at);
CREATE INDEX IF NOT EXISTS idx_session_likes_created_at ON session_likes(created_at);
CREATE INDEX IF NOT EXISTS idx_comment_likes_created_at ON comment_likes(created_at);
CREATE INDEX IF NOT EXISTS idx_poll_votes_created_at ON poll_votes(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Also useful for other queries
CREATE INDEX IF NOT EXISTS idx_group_sessions_session_date ON group_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at);

-- 2. FIX POTENTIAL RLS RECURSION
-- Ensure is_admin is robust and prevents infinite recursion.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Re-apply policies to ensure they use the safe function.
-- Drop potentially problematic policies first.

DROP POLICY IF EXISTS "Admins can do everything" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin full access" ON profiles;
DROP POLICY IF EXISTS "Admin" ON profiles;
DROP POLICY IF EXISTS "admin_policy" ON profiles;

-- Create the safe admin policy
CREATE POLICY "Admins can do everything"
ON profiles
FOR ALL
USING (is_admin());
