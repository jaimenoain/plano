-- Fix: /embassy/leadership — 500 error on get_chapter_metrics
--
-- Root cause:
--   Migration 20271132000000 (fix_goals_page_rpc_500_errors) unconditionally
--   rebuilt get_chapter_ambassador_activity and get_ambassador_my_audit_timeline
--   but omitted get_chapter_metrics. The live DB's get_chapter_metrics function
--   still has a lost EXECUTE grant (or a stale body referencing hero_image_url
--   audit-log transitions for photos) from prior DROP+CREATE cycles, causing every
--   call to /embassy/leadership to return HTTP 500.
--
-- Fix:
--   Unconditional DROP + CREATE + REVOKE ALL + GRANT EXECUTE for get_chapter_metrics,
--   using the definitive latest body from migration 20271128000000:
--   photos counted from review_images (joined via building_posts → buildings),
--   not from building_audit_logs hero_image_url transitions.
--
-- Feedback id: 033ee938-f84f-4e69-a014-6b7c126793c8
-- Page: /embassy/leadership

DROP FUNCTION IF EXISTS public.get_chapter_metrics(uuid, integer);

CREATE FUNCTION public.get_chapter_metrics (
  p_chapter_id uuid,
  p_days integer DEFAULT 30
)
  RETURNS TABLE (
    total_edits                bigint,
    total_photos_added         bigint,
    total_building_visits      bigint,
    period_start               timestamptz,
    period_end                 timestamptz,
    prev_total_edits           bigint,
    prev_total_photos_added    bigint,
    prev_total_building_visits bigint,
    prev_period_start          timestamptz,
    prev_period_end            timestamptz)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_end        timestamptz := timezone('utc'::text, now());
  v_start      timestamptz := v_end      - make_interval(days => greatest(p_days, 1));
  v_prev_end   timestamptz := v_start;
  v_prev_start timestamptz := v_prev_end - make_interval(days => greatest(p_days, 1));
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
  SELECT
    -- Current period: total edits (all audit log rows, chapter-scoped)
    (
      SELECT COUNT(*)::bigint
      FROM   public.building_audit_logs al
      INNER JOIN public.buildings b ON b.id = al.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  al.created_at >= v_start
        AND  al.created_at <  v_end
    ) AS total_edits,

    -- Current period: photos uploaded (via review_images, not hero_image_url transitions)
    (
      SELECT COUNT(*)::bigint
      FROM   public.review_images ri
      INNER JOIN public.building_posts bp ON bp.id = ri.review_id
      INNER JOIN public.buildings b ON b.id = bp.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  ri.created_at >= v_start
        AND  ri.created_at <  v_end
    ) AS total_photos_added,

    -- Current period: building visits
    (
      SELECT COUNT(*)::bigint
      FROM   public.user_buildings ub
      INNER JOIN public.buildings b ON b.id = ub.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  ub.status::text = 'visited'
        AND  ub.visited_at IS NOT NULL
        AND  ub.visited_at >= v_start
        AND  ub.visited_at <  v_end
    ) AS total_building_visits,

    v_start AS period_start,
    v_end   AS period_end,

    -- Prior period: total edits
    (
      SELECT COUNT(*)::bigint
      FROM   public.building_audit_logs al
      INNER JOIN public.buildings b ON b.id = al.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  al.created_at >= v_prev_start
        AND  al.created_at <  v_prev_end
    ) AS prev_total_edits,

    -- Prior period: photos uploaded (via review_images)
    (
      SELECT COUNT(*)::bigint
      FROM   public.review_images ri
      INNER JOIN public.building_posts bp ON bp.id = ri.review_id
      INNER JOIN public.buildings b ON b.id = bp.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  ri.created_at >= v_prev_start
        AND  ri.created_at <  v_prev_end
    ) AS prev_total_photos_added,

    -- Prior period: building visits
    (
      SELECT COUNT(*)::bigint
      FROM   public.user_buildings ub
      INNER JOIN public.buildings b ON b.id = ub.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  ub.status::text = 'visited'
        AND  ub.visited_at IS NOT NULL
        AND  ub.visited_at >= v_prev_start
        AND  ub.visited_at <  v_prev_end
    ) AS prev_total_building_visits,

    v_prev_start AS prev_period_start,
    v_prev_end   AS prev_period_end;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chapter_metrics(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chapter_metrics(uuid, integer) TO authenticated;
