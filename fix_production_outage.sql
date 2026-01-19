-- ==============================================================================
-- 1. FIX RLS RECURSION ON PROFILES
-- ==============================================================================

-- Create a SECURITY DEFINER function to check admin status.
-- This bypasses RLS on the profiles table within the function scope,
-- preventing the infinite recursion loop when the policy queries the table.
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

-- Drop likely problematic policies that might be causing recursion.
-- We attempt to cover common names users might have used manually.
DROP POLICY IF EXISTS "Admins can do everything" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin full access" ON profiles;
DROP POLICY IF EXISTS "Admin" ON profiles;
DROP POLICY IF EXISTS "admin_policy" ON profiles;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Re-establish standard policies to ensure the site functions for normal users.
-- We use DROP IF EXISTS followed by CREATE to ensure we overwrite correctly.

-- 1. Public Read Access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- 2. User Self-Management (Insert)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- 3. User Self-Management (Update)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- 4. Safe Admin Access (using the new function)
-- This grants full access (ALL) to admins without triggering recursion.
CREATE POLICY "Admins can do everything"
ON profiles
FOR ALL
USING (is_admin());


-- ==============================================================================
-- 2. FIX RPC FUNCTION ERROR (gm.created_at -> gm.joined_at)
-- ==============================================================================

-- Redefine the function with the correct column reference for group_members.
CREATE OR REPLACE FUNCTION get_user_groups_summary(
  p_user_id UUID,
  p_type TEXT DEFAULT 'my', -- 'my' or 'public'
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  is_public BOOLEAN,
  cover_url TEXT,
  member_count BIGINT,
  member_avatars TEXT[],
  next_session_date TIMESTAMPTZ,
  last_session_date TIMESTAMPTZ,
  recent_posters TEXT[]
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_ids UUID[];
BEGIN
  -- 1. Identify target groups
  IF p_type = 'my' THEN
    SELECT ARRAY_AGG(gm.group_id) INTO v_group_ids
    FROM group_members gm
    WHERE gm.user_id = p_user_id AND gm.status = 'active';
  ELSIF p_type = 'public' THEN
    SELECT ARRAY_AGG(t.id) INTO v_group_ids
    FROM (
      SELECT g.id
      FROM groups g
      WHERE g.is_public = TRUE
      AND g.id NOT IN (
        SELECT gm.group_id FROM group_members gm WHERE gm.user_id = p_user_id
      )
      ORDER BY g.created_at DESC
      LIMIT p_limit
    ) t;
  END IF;

  -- Handle case where no groups found
  IF v_group_ids IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.slug,
    g.name,
    g.description,
    g.is_public,
    g.cover_url,
    (SELECT count(*) FROM group_members gm WHERE gm.group_id = g.id) as member_count,
    COALESCE(
      ARRAY(
        SELECT p.avatar_url
        FROM group_members gm
        JOIN profiles p ON gm.user_id = p.id
        WHERE gm.group_id = g.id AND p.avatar_url IS NOT NULL
        -- FIX: Changed from gm.created_at to gm.joined_at
        ORDER BY gm.joined_at DESC NULLS LAST
        LIMIT 3
      ),
      ARRAY[]::TEXT[]
    ) as member_avatars,
    (
      SELECT MIN(gs.session_date)
      FROM group_sessions gs
      WHERE gs.group_id = g.id AND gs.session_date >= NOW()
    ) as next_session_date,
    (
      SELECT MAX(gs.session_date)
      FROM group_sessions gs
      WHERE gs.group_id = g.id AND gs.session_date < NOW()
    ) as last_session_date,
    COALESCE(
      ARRAY(
        SELECT f.poster_path
        FROM group_sessions gs
        JOIN session_films sf ON gs.id = sf.session_id
        JOIN films f ON sf.film_id = f.id
        WHERE gs.group_id = g.id AND f.poster_path IS NOT NULL
        ORDER BY gs.session_date DESC
        LIMIT 4
      ),
      ARRAY[]::TEXT[]
    ) as recent_posters
  FROM groups g
  WHERE g.id = ANY(v_group_ids)
  ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql;
