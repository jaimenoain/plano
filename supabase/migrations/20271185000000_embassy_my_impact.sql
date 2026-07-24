-- Roadmap 3.1 — "My impact" page with streaks.
--
-- Every ambassador gets a self-scoped view of their own contributions: all-time
-- totals per contribution type, a weekly streak, and a timeline. Today the only
-- activity view is get_chapter_ambassador_activity, which is chapter-wide and
-- leader-only (gated in Leadership.tsx), and get_ambassador_my_audit_timeline,
-- which is self-scoped but only covers building_audit_logs (edits/moderation/
-- research) — missing photos, visits, firms claimed, outreach, and events.
--
-- get_my_ambassador_impact() unions all 8 contribution sources (same
-- source/filter as get_my_ambassador_goals' CASE branches, 20271184000000, but
-- all-time instead of goal-scoped) into one self-scoped row: 8 total counts, a
-- weekly streak (consecutive weeks with any activity, one week's grace so it
-- doesn't reset before the ambassador has had a chance to act this week), and a
-- recent timeline as jsonb. The streak is computed by materializing the set of
-- distinct active weeks into a plpgsql array once, then walking it backward in
-- memory — simpler and easier to verify than a set-based row_number trick, and
-- bounded (capped at 520 iterations) so it can't run away.
--
-- Known pre-existing gap, same as 20271184000000: video approvals tag their
-- audit row table_name='building_posts', so they never count as moderation
-- anywhere in the app, including here.

CREATE OR REPLACE FUNCTION public.get_my_ambassador_impact (p_timeline_limit integer DEFAULT 30)
  RETURNS TABLE (
    edits_count integer,
    photos_count integer,
    visits_count integer,
    firms_claimed_count integer,
    moderation_count integer,
    outreach_count integer,
    events_count integer,
    research_count integer,
    weekly_streak integer,
    timeline jsonb)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid ();
  v_weeks date[];
  v_this_week date := date_trunc('week', now())::date;
  v_cursor date;
  v_streak integer := 0;
  v_timeline jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT
    array_agg(DISTINCT date_trunc('week', e.occurred_at)::date)
  INTO v_weeks
  FROM (
    SELECT al.created_at AS occurred_at
    FROM public.building_audit_logs al
    WHERE al.user_id = v_uid
    UNION ALL
    SELECT ri.created_at
    FROM public.review_images ri
    WHERE ri.user_id = v_uid
    UNION ALL
    SELECT COALESCE(ub.visited_at, ub.created_at)
    FROM public.user_buildings ub
    WHERE ub.user_id = v_uid
      AND ub.status = 'visited'
    UNION ALL
    SELECT cs.created_at
    FROM public.company_stewards cs
    WHERE cs.user_id = v_uid
      AND cs.role = 'owner'::public.company_steward_role
    UNION ALL
    SELECT ol.created_at
    FROM public.outreach_log ol
    WHERE ol.ambassador_id = v_uid
    UNION ALL
    SELECT ed.reviewed_at
    FROM public.embassy_event_discoveries ed
    WHERE ed.reviewed_by = v_uid
      AND ed.status = 'published'
  ) e
  WHERE e.occurred_at IS NOT NULL;

  v_weeks := COALESCE(v_weeks, ARRAY[]::date[]);

  IF v_this_week = ANY (v_weeks) THEN
    v_cursor := v_this_week;
  ELSIF (v_this_week - 7) = ANY (v_weeks) THEN
    v_cursor := v_this_week - 7;
  ELSE
    v_cursor := NULL;
  END IF;

  WHILE v_cursor IS NOT NULL AND v_cursor = ANY (v_weeks) LOOP
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 7;
    EXIT WHEN v_streak > 520;
  END LOOP;

  SELECT
    jsonb_agg(jsonb_build_object('type', t.type, 'label', t.label, 'occurredAt', t.occurred_at) ORDER BY t.occurred_at DESC)
  INTO v_timeline
  FROM (
    SELECT
      CASE
      WHEN al.table_name IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval') THEN
        'moderation'
      WHEN al.operation = 'ai_research_apply' THEN
        'research'
      ELSE
        'edits'
      END AS type,
      al.created_at AS occurred_at,
      CASE
      WHEN al.table_name IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval') THEN
        'Moderated ' || COALESCE(bu.name, 'a building')
      WHEN al.operation = 'ai_research_apply' THEN
        'Applied research to ' || COALESCE(bu.name, 'a building')
      ELSE
        initcap(replace(al.operation, '_', ' ')) || ' · ' || COALESCE(bu.name, 'a building')
      END AS label
    FROM
      public.building_audit_logs al
      LEFT JOIN public.buildings bu ON bu.id = al.building_id
    WHERE
      al.user_id = v_uid
    UNION ALL
    SELECT
      'photos',
      ri.created_at,
      'Photo uploaded · ' || COALESCE(bu2.name, 'a building')
    FROM
      public.review_images ri
      LEFT JOIN public.building_posts bp ON bp.id = ri.review_id
      LEFT JOIN public.buildings bu2 ON bu2.id = bp.building_id
    WHERE
      ri.user_id = v_uid
    UNION ALL
    SELECT
      'visits',
      COALESCE(ub.visited_at, ub.created_at),
      'Visited ' || COALESCE(bu3.name, 'a building')
    FROM
      public.user_buildings ub
      LEFT JOIN public.buildings bu3 ON bu3.id = ub.building_id
    WHERE
      ub.user_id = v_uid
      AND ub.status = 'visited'
    UNION ALL
    SELECT
      'firms_claimed',
      cs.created_at,
      'Claimed ' || COALESCE(co.name, 'a firm')
    FROM
      public.company_stewards cs
      LEFT JOIN public.companies co ON co.id = cs.company_id
    WHERE
      cs.user_id = v_uid
      AND cs.role = 'owner'::public.company_steward_role
    UNION ALL
    SELECT
      'outreach',
      ol.created_at,
      'Reached out to ' || COALESCE(co2.name, 'a firm')
    FROM
      public.outreach_log ol
      LEFT JOIN public.companies co2 ON co2.id = ol.firm_id
    WHERE
      ol.ambassador_id = v_uid
    UNION ALL
    SELECT
      'events',
      ed.reviewed_at,
      'Published ' || ed.title
    FROM
      public.embassy_event_discoveries ed
    WHERE
      ed.reviewed_by = v_uid
      AND ed.status = 'published'
    ORDER BY
      occurred_at DESC
    LIMIT p_timeline_limit) t;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::integer FROM public.building_audit_logs al WHERE al.user_id = v_uid),
    (SELECT COUNT(*)::integer FROM public.review_images ri WHERE ri.user_id = v_uid),
    (SELECT COUNT(*)::integer FROM public.user_buildings ub WHERE ub.user_id = v_uid AND ub.status = 'visited'),
    (SELECT COUNT(*)::integer FROM public.company_stewards cs WHERE cs.user_id = v_uid AND cs.role = 'owner'::public.company_steward_role),
    (SELECT COUNT(*)::integer FROM public.building_audit_logs al2 WHERE al2.user_id = v_uid AND al2.table_name IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval')),
    (SELECT COUNT(*)::integer FROM public.outreach_log ol WHERE ol.ambassador_id = v_uid),
    (SELECT COUNT(*)::integer FROM public.embassy_event_discoveries ed WHERE ed.reviewed_by = v_uid AND ed.status = 'published'),
    (SELECT COUNT(*)::integer FROM public.building_audit_logs al3 WHERE al3.user_id = v_uid AND al3.operation = 'ai_research_apply'),
    v_streak,
    COALESCE(v_timeline, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_ambassador_impact (integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_ambassador_impact (integer) TO authenticated;
