-- Supersedes both 20271116000000_fix_leaderboard_access_for_all_ambassadors.sql
-- and 20271116000000_fix_ambassador_activity_moderation_outreach.sql (those two share a
-- timestamp and must not be applied individually).
--
-- Root causes fixed:
--   1. 20271112000000_fix_leaderboard_all_contributions.sql used DROP + CREATE without
--      a GRANT EXECUTE, revoking execute permission from all authenticated users
--      (including chapter leaders). Every call returned "permission denied for function",
--      producing "Could not load activity." on /embassy/leadership.
--   2. The auth guard was `is_chapter_leader()` — regular ambassadors who are NOT
--      exco/president received empty results on the /embassy/goals leaderboard
--      (feedback 89499f18, already fixed in principle but the GRANT was still missing).
--   3. moderation_count and outreach_count columns were missing; the component read
--      them but the function did not return them.
--
-- Fix:
--   • Auth guard: _ambassador_can_access_chapter() — any active chapter member may call.
--   • Full column set: edits, photos, visits, firms, moderation, outreach, total_score,
--     last_active_at (includes both audit-log and outreach activity).
--   • GRANT EXECUTE TO authenticated restored.
--
-- Feedback id: 0d31f8d5-4908-46e5-9ed9-3848b10ec545

DROP FUNCTION IF EXISTS public.get_chapter_ambassador_activity(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_chapter_ambassador_activity (
  p_chapter_id uuid,
  p_days integer DEFAULT 30
)
  RETURNS TABLE (
    user_id              uuid,
    username             text,
    avatar_url           text,
    role                 text,
    edits_count          bigint,
    photos_added         bigint,
    visits_count         bigint,
    firms_claimed_count  bigint,
    moderation_count     bigint,
    outreach_count       bigint,
    total_score          bigint,
    last_active_at       timestamptz)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_end   timestamptz := timezone('utc'::text, now());
  v_start timestamptz := v_end - make_interval(days => greatest(p_days, 1));
BEGIN
  IF NOT public._ambassador_can_access_chapter(p_chapter_id) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_chapters c WHERE c.id = p_chapter_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH activity AS (
    SELECT
      m.user_id,
      COALESCE(p.username, '')::text                                       AS username,
      p.avatar_url::text                                                   AS avatar_url,
      m.role::text                                                         AS role,

      -- Data edits: audit log entries that are NOT moderation approvals
      (
        SELECT COUNT(*)::bigint
        FROM   public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
               AND COALESCE(b.is_deleted, FALSE) = FALSE
        WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
          AND  al.user_id    = m.user_id
          AND  al.created_at >= v_start
          AND  al.created_at <  v_end
          AND  al.table_name NOT IN (
                 'ambassador_approval',
                 'ambassador_photo_approval',
                 'ambassador_credit_approval'
               )
      )                                                                    AS edits_count,

      -- Photo additions: hero_image_url changed null → value
      (
        SELECT COUNT(*)::bigint
        FROM   public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
               AND COALESCE(b.is_deleted, FALSE) = FALSE
        WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
          AND  al.user_id    = m.user_id
          AND  al.table_name = 'buildings'
          AND  al.operation  = 'UPDATE'
          AND  al.created_at >= v_start
          AND  al.created_at <  v_end
          AND  NULLIF(TRIM(BOTH FROM COALESCE(al.old_data ->> 'hero_image_url', '')), '') IS NULL
          AND  NULLIF(TRIM(BOTH FROM COALESCE(al.new_data ->> 'hero_image_url', '')), '') IS NOT NULL
      )                                                                    AS photos_added,

      -- Building visits logged in the period, scoped to chapter
      (
        SELECT COUNT(*)::bigint
        FROM   public.user_buildings ub
        INNER JOIN public.buildings b ON b.id = ub.building_id
               AND COALESCE(b.is_deleted, FALSE) = FALSE
        WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
          AND  ub.user_id    = m.user_id
          AND  ub.created_at >= v_start
          AND  ub.created_at <  v_end
      )                                                                    AS visits_count,

      -- Architect firms claimed as steward in the period
      (
        SELECT COUNT(*)::bigint
        FROM   public.company_stewards cs
        WHERE  cs.user_id    = m.user_id
          AND  cs.created_at >= v_start
          AND  cs.created_at <  v_end
      )                                                                    AS firms_claimed_count,

      -- Moderation approvals (buildings, photos, credits) in the period, scoped to chapter
      (
        SELECT COUNT(*)::bigint
        FROM   public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
               AND COALESCE(b.is_deleted, FALSE) = FALSE
        WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
          AND  al.user_id    = m.user_id
          AND  al.table_name IN (
                 'ambassador_approval',
                 'ambassador_photo_approval',
                 'ambassador_credit_approval'
               )
          AND  al.created_at >= v_start
          AND  al.created_at <  v_end
      )                                                                    AS moderation_count,

      -- Outreach interactions logged in the period
      (
        SELECT COUNT(*)::bigint
        FROM   public.outreach_log ol
        WHERE  ol.ambassador_id = m.user_id
          AND  ol.created_at   >= v_start
          AND  ol.created_at   <  v_end
      )                                                                    AS outreach_count,

      -- Last active: latest of audit-log or outreach activity
      GREATEST(
        (
          SELECT MAX(al.created_at)
          FROM   public.building_audit_logs al
          INNER JOIN public.buildings b ON b.id = al.building_id
                 AND COALESCE(b.is_deleted, FALSE) = FALSE
          WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
            AND  al.user_id = m.user_id
        ),
        (
          SELECT MAX(ol.created_at)
          FROM   public.outreach_log ol
          WHERE  ol.ambassador_id = m.user_id
        )
      )                                                                    AS last_active_at

    FROM
      public.ambassador_memberships m
      INNER JOIN public.profiles p ON p.id = m.user_id
    WHERE
      m.chapter_id = p_chapter_id
      AND m.status = 'active'
  )
  SELECT
    a.user_id,
    a.username,
    a.avatar_url,
    a.role,
    a.edits_count,
    a.photos_added,
    a.visits_count,
    a.firms_claimed_count,
    a.moderation_count,
    a.outreach_count,
    (a.edits_count + a.visits_count + a.firms_claimed_count + a.moderation_count + a.outreach_count)::bigint AS total_score,
    a.last_active_at
  FROM activity a
  ORDER BY
    (a.edits_count + a.visits_count + a.firms_claimed_count + a.moderation_count + a.outreach_count) DESC,
    a.last_active_at DESC NULLS LAST,
    a.username ASC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chapter_ambassador_activity(uuid, integer) TO authenticated;
