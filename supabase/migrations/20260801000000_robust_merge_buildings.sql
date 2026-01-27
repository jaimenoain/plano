-- Robust Merge Buildings Function & Schema Updates
-- Implements atomic merging, relationship migration, conflict handling, and audit logging.

-- 1. Schema Updates: Add merged_into_id for traceability
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'merged_into_id') THEN
        ALTER TABLE buildings ADD COLUMN merged_into_id UUID REFERENCES buildings(id);
    END IF;
END $$;

-- Ensure Admin Audit Logs table exists (if not already created by previous migrations)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for audit logs if newly created (idempotent)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_logs' AND policyname = 'Admins can view audit logs') THEN
        CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (public.is_admin());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_logs' AND policyname = 'Admins can insert audit logs') THEN
        CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (public.is_admin());
    END IF;
END $$;


-- 2. The Robust Merge Function
CREATE OR REPLACE FUNCTION merge_buildings(
  source_id UUID,
  target_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    building_snapshot JSONB;
    conflict_record RECORD;
    target_ub_id UUID;
    source_opt RECORD;
    target_opt_id UUID;
    admin_user_id UUID;
BEGIN
    -- Permission Check
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required.';
    END IF;

    -- Validation
    IF source_id = target_id THEN
        RAISE EXCEPTION 'Cannot merge a building into itself.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM buildings WHERE id = source_id) THEN
        RAISE EXCEPTION 'Source building not found.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM buildings WHERE id = target_id) THEN
        RAISE EXCEPTION 'Target building not found.';
    END IF;

    -- Capture Snapshot of Source Building for Audit
    SELECT row_to_json(b) INTO building_snapshot FROM buildings b WHERE id = source_id;
    admin_user_id := auth.uid();

    -- ==============================================================================
    -- MIGRATION: User Buildings (Reviews, Status, Lists)
    -- ==============================================================================

    -- A. Handle Conflicts (User has BOTH Source and Target)
    -- For these users, we keep the Target record ("Target Prevails").
    -- However, we must rescue resources (Images) and Content (if Target is empty).
    FOR conflict_record IN
        SELECT ub.id, ub.user_id, ub.content, ub.rating
        FROM user_buildings ub
        WHERE ub.building_id = source_id
        AND EXISTS (
            SELECT 1 FROM user_buildings ub2
            WHERE ub2.building_id = target_id AND ub2.user_id = ub.user_id
        )
    LOOP
        -- Get the Target User Building ID
        SELECT id INTO target_ub_id
        FROM user_buildings
        WHERE building_id = target_id AND user_id = conflict_record.user_id;

        -- 1. Rescue Content (if Target has none)
        UPDATE user_buildings
        SET content = conflict_record.content,
            rating = COALESCE(rating, conflict_record.rating)
        WHERE id = target_ub_id
        AND (content IS NULL OR content = '');

        -- 2. Move Review Images
        -- Assuming 'review_images' table exists and links to 'user_buildings.id' via 'review_id'
        UPDATE review_images
        SET review_id = target_ub_id
        WHERE review_id = conflict_record.id;

        -- 3. Delete the Source Record (Redundant now)
        DELETE FROM user_buildings WHERE id = conflict_record.id;
    END LOOP;

    -- B. Handle Non-Conflicts (User has Source ONLY)
    -- Simply move them to the Target Building.
    UPDATE user_buildings
    SET building_id = target_id
    WHERE building_id = source_id;


    -- ==============================================================================
    -- MIGRATION: Other Relations
    -- ==============================================================================

    -- Recommendations: Move if unique, Delete if duplicate
    UPDATE recommendations
    SET building_id = target_id
    WHERE building_id = source_id
    AND NOT EXISTS (
        SELECT 1 FROM recommendations r2
        WHERE r2.building_id = target_id
        AND r2.recipient_id = recommendations.recipient_id
        AND r2.recommender_id = recommendations.recommender_id
    );
    DELETE FROM recommendations WHERE building_id = source_id;

    -- Watchlist Notifications
    UPDATE watchlist_notifications
    SET building_id = target_id
    WHERE building_id = source_id
    AND NOT EXISTS (
        SELECT 1 FROM watchlist_notifications w2
        WHERE w2.building_id = target_id
        AND w2.user_id = watchlist_notifications.user_id
        AND w2.provider_name = watchlist_notifications.provider_name
    );
    DELETE FROM watchlist_notifications WHERE building_id = source_id;

    -- Session Buildings
    UPDATE session_buildings
    SET building_id = target_id
    WHERE building_id = source_id
    AND NOT EXISTS (
        SELECT 1 FROM session_buildings s2
        WHERE s2.building_id = target_id
        AND s2.session_id = session_buildings.session_id
    );
    DELETE FROM session_buildings WHERE building_id = source_id;

    -- Group Backlog Items
    UPDATE group_backlog_items
    SET building_id = target_id
    WHERE building_id = source_id
    AND NOT EXISTS (
        SELECT 1 FROM group_backlog_items g2
        WHERE g2.building_id = target_id
        AND g2.group_id = group_backlog_items.group_id
    );
    DELETE FROM group_backlog_items WHERE building_id = source_id;

    -- Building Architects: Insert ignore Target, Delete Source
    INSERT INTO building_architects (building_id, architect_id)
    SELECT target_id, architect_id
    FROM building_architects
    WHERE building_id = source_id
    ON CONFLICT (building_id, architect_id) DO NOTHING;

    DELETE FROM building_architects WHERE building_id = source_id;

    -- Poll Options
    FOR source_opt IN
        SELECT * FROM poll_options WHERE building_id = source_id
    LOOP
        -- Check if target building is already an option in the same question
        SELECT id INTO target_opt_id
        FROM poll_options
        WHERE question_id = source_opt.question_id
        AND building_id = target_id;

        IF target_opt_id IS NOT NULL THEN
            -- Target option exists. Move votes to Target Option.
            UPDATE poll_votes SET option_id = target_opt_id WHERE option_id = source_opt.id;
            -- Delete source option
            DELETE FROM poll_options WHERE id = source_opt.id;
        ELSE
            -- No target option. Safe to update building_id.
            UPDATE poll_options SET building_id = target_id WHERE id = source_opt.id;
        END IF;
    END LOOP;

    -- Film Availability: Just delete source (scraper handles master)
    DELETE FROM film_availability WHERE building_id = source_id;


    -- ==============================================================================
    -- FINAL CLEANUP
    -- ==============================================================================

    -- Fill Main Image if missing in Target
    UPDATE buildings
    SET main_image_url = (building_snapshot->>'main_image_url')
    WHERE id = target_id
    AND (main_image_url IS NULL OR main_image_url = '');

    -- Soft Delete Source Building
    UPDATE buildings
    SET is_deleted = true,
        merged_into_id = target_id,
        updated_at = now()
    WHERE id = source_id;


    -- ==============================================================================
    -- AUDIT LOGGING
    -- ==============================================================================

    INSERT INTO admin_audit_logs (
        admin_id,
        action_type,
        target_type,
        target_id,
        details
    ) VALUES (
        admin_user_id,
        'MERGE_BUILDINGS',
        'building',
        target_id::text,
        json_build_object(
            'source_id', source_id,
            'source_snapshot', building_snapshot,
            'timestamp', now()
        )
    );

END;
$$;
