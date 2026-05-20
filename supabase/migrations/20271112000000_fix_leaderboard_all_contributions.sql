-- Fix leaderboard to count all contribution types, not only edits.
-- Adds visits_count (user_buildings in period, chapter-scoped),
-- firms_claimed_count (company_stewards in period),
-- and total_score (edits + visits + firms). Orders by total_score DESC.
-- DROP required because the return type (OUT columns) changes.

DROP FUNCTION IF EXISTS public.get_chapter_ambassador_activity(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_chapter_ambassador_activity (
  p_chapter_id uuid,
  p_days integer DEFAULT 30
)
  RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    role text,
    edits_count bigint,
    photos_added bigint,
    visits_count bigint,
    firms_claimed_count bigint,
    total_score bigint,
    last_active_at timestamptz)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_end   timestamptz := timezone('utc'::text, now());
  v_start timestamptz := v_end - make_interval(days => greatest(p_days, 1));
BEGIN
  IF NOT (
    public.is_admin()
    OR public.is_chapter_leader(p_chapter_id)
    OR public.is_national_president_of_local_chapter_parent(p_chapter_id)
  ) THEN
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
      -- All building edits (audit log entries) in the period, scoped to chapter
      (
        SELECT COUNT(*)::bigint
        FROM   public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
               AND COALESCE(b.is_deleted, FALSE) = FALSE
        WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
          AND  al.user_id = m.user_id
          AND  al.created_at >= v_start
          AND  al.created_at <  v_end
      )                                                                    AS edits_count,
      -- Photo additions: edits where hero_image_url changed null→value
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
      -- Architect firms claimed as steward in the period (no chapter boundary)
      (
        SELECT COUNT(*)::bigint
        FROM   public.company_stewards cs
        WHERE  cs.user_id    = m.user_id
          AND  cs.created_at >= v_start
          AND  cs.created_at <  v_end
      )                                                                    AS firms_claimed_count,
      -- Most recent chapter-scoped audit log for "last active" display
      (
        SELECT MAX(al.created_at)
        FROM   public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
               AND COALESCE(b.is_deleted, FALSE) = FALSE
        WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
          AND  al.user_id = m.user_id
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
    (a.edits_count + a.visits_count + a.firms_claimed_count)::bigint AS total_score,
    a.last_active_at
  FROM activity a
  ORDER BY
    (a.edits_count + a.visits_count + a.firms_claimed_count) DESC,
    a.last_active_at DESC NULLS LAST,
    a.username ASC NULLS LAST;
END;
$$;
