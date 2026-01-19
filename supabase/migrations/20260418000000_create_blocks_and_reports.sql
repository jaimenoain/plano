-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reported_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Blocks Policies
CREATE POLICY "Users can read their own blocks" ON blocks
    FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can create blocks" ON blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks" ON blocks
    FOR DELETE USING (auth.uid() = blocker_id);

-- Reports Policies
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- RPC: Block User
CREATE OR REPLACE FUNCTION block_user(
    p_target_id UUID,
    p_reason TEXT,
    p_report_abuse BOOLEAN DEFAULT FALSE,
    p_report_details TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();

    -- 1. Insert Block
    INSERT INTO blocks (blocker_id, blocked_id, reason)
    VALUES (v_uid, p_target_id, p_reason)
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

    -- 2. Report Abuse
    IF p_report_abuse THEN
        INSERT INTO reports (reporter_id, reported_id, reason, details)
        VALUES (v_uid, p_target_id, p_reason, p_report_details);
    END IF;

    -- 3. Clean up Follows (Bidirectional)
    DELETE FROM follows
    WHERE (follower_id = v_uid AND following_id = p_target_id)
       OR (follower_id = p_target_id AND following_id = v_uid);

    -- 4. Clean up Recommendations (Bidirectional)
    -- Deleting pending/active recommendations.
    -- We'll delete 'pending' and 'watch_with'.
    -- We might want to keep 'watched' logs? The 'recommendations' table usually has 'status'.
    DELETE FROM recommendations
    WHERE ((recommender_id = v_uid AND recipient_id = p_target_id)
       OR (recommender_id = p_target_id AND recipient_id = v_uid))
       AND status IN ('pending', 'watch_with');

    -- 5. Clean up Likes
    -- Remove likes by v_uid on p_target_id's content
    DELETE FROM likes
    WHERE user_id = v_uid
    AND interaction_id IN (SELECT id FROM log WHERE user_id = p_target_id);

    -- Remove likes by p_target_id on v_uid's content
    DELETE FROM likes
    WHERE user_id = p_target_id
    AND interaction_id IN (SELECT id FROM log WHERE user_id = v_uid);

    -- 6. Clean up Comments
    DELETE FROM comments
    WHERE user_id = v_uid
    AND interaction_id IN (SELECT id FROM log WHERE user_id = p_target_id);

    DELETE FROM comments
    WHERE user_id = p_target_id
    AND interaction_id IN (SELECT id FROM log WHERE user_id = v_uid);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS for Profiles
-- Attempt to drop common permissive policies to replace with restrictive one.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
    DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
    DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
END $$;

CREATE POLICY "Public profiles are viewable by non-blocked users" ON profiles
    FOR SELECT USING (
        auth.uid() IS NULL OR -- allow public if desired, but blocking implies auth. If anon, no blocks exist.
        NOT EXISTS (
            SELECT 1 FROM blocks
            WHERE (blocker_id = auth.uid() AND blocked_id = id)
               OR (blocker_id = id AND blocked_id = auth.uid())
        )
    );

-- Update RLS for Logs
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public logs are viewable by everyone" ON log;
    DROP POLICY IF EXISTS "Logs are viewable by everyone" ON log;
    DROP POLICY IF EXISTS "Enable read access for all users" ON log;
END $$;

CREATE POLICY "Logs are viewable by non-blocked users" ON log
    FOR SELECT USING (
        auth.uid() IS NULL OR
        NOT EXISTS (
            SELECT 1 FROM blocks
            WHERE (blocker_id = auth.uid() AND blocked_id = user_id)
               OR (blocker_id = user_id AND blocked_id = auth.uid())
        )
    );

-- Update RLS for Comments
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public comments are viewable by everyone" ON comments;
    DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
    DROP POLICY IF EXISTS "Enable read access for all users" ON comments;
END $$;

CREATE POLICY "Comments are viewable by non-blocked users" ON comments
    FOR SELECT USING (
        auth.uid() IS NULL OR
        NOT EXISTS (
            SELECT 1 FROM blocks
            WHERE (blocker_id = auth.uid() AND blocked_id = user_id)
               OR (blocker_id = user_id AND blocked_id = auth.uid())
        )
    );
