-- Fix: "buildings moderated" has always counted zero, everywhere.
--
-- Every Embassy moderation metric tests
--   building_audit_logs.table_name IN ('ambassador_approval', 'ambassador_photo_approval',
--                                      'ambassador_credit_approval')
-- but those values are written to the `operation` column, never to `table_name` —
-- `table_name` holds the table the approval touched ('review_images',
-- 'building_credits', 'building_posts'). Verified on prod before writing this:
--
--   SELECT count(*) FROM building_audit_logs
--   WHERE table_name IN ('ambassador_approval','ambassador_photo_approval','ambassador_credit_approval');
--   -- 0 rows, against 1508 rows carrying those values in `operation`.
--
-- So the predicate has never matched anything: moderation counts read 0 for every
-- ambassador, and all 1508 approvals were silently counted as plain edits instead.
-- Caught while verifying roadmap 3.3 — the new "50 moderations" milestone could never
-- have been earned by anyone.
--
-- This replaces the predicate with `operation IN (...)` in all three functions that
-- carry it, in one migration, because they must agree: the My impact page (3.1), goal
-- progress (2.4), and the weekly digest email (3.2) all quote the same metric at the
-- reader. Fixing one and not the others would put two Embassy pages in open
-- contradiction, which is the failure 20271193000000's design note 1 is about.
--
-- Also closes the gap the 2.4 / 3.1 / 3.2 headers documented as pre-existing and
-- unfixed: 'ambassador_video_approval' joins the list, so approving a video finally
-- counts as moderation like approving a photo or a credit does.
--
-- WHAT CHANGES FOR USERS: moderation numbers jump from 0 to their true values on
-- /embassy/impact, in goal progress, and in the next weekly digest email; the "edits"
-- number in the digest drops by the same amount (its three buckets stay mutually
-- exclusive). Owner decision, 2026-07-30: fix everywhere rather than leave the counters
-- reading zero.
--
-- Bodies below are the live definitions verbatim (pg_get_functiondef, 2026-07-30) with
-- only the predicate lines changed. Signatures and return types are untouched.
--
-- types-neutral: no signature or RETURNS change on any of the three functions, so
-- gen-types is a no-op for this migration.

-- ─── 1. My impact (20271185000000) — totals + timeline ────────────────────────

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
      WHEN al.operation IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval', 'ambassador_video_approval') THEN
        'moderation'
      WHEN al.operation = 'ai_research_apply' THEN
        'research'
      ELSE
        'edits'
      END AS type,
      al.created_at AS occurred_at,
      CASE
      WHEN al.operation IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval', 'ambassador_video_approval') THEN
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
    (SELECT COUNT(*)::integer FROM public.building_audit_logs al2 WHERE al2.user_id = v_uid AND al2.operation IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval', 'ambassador_video_approval')),
    (SELECT COUNT(*)::integer FROM public.outreach_log ol WHERE ol.ambassador_id = v_uid),
    (SELECT COUNT(*)::integer FROM public.embassy_event_discoveries ed WHERE ed.reviewed_by = v_uid AND ed.status = 'published'),
    (SELECT COUNT(*)::integer FROM public.building_audit_logs al3 WHERE al3.user_id = v_uid AND al3.operation = 'ai_research_apply'),
    v_streak,
    COALESCE(v_timeline, '[]'::jsonb);
END;
$$;

-- ─── 2. Goal progress (20271184000000) ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_ambassador_goals ()
  RETURNS TABLE (
    id uuid,
    user_id uuid,
    title text,
    target_value integer,
    current_value integer,
    metric text,
    status text,
    due_date timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid ();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    g.id,
    g.user_id,
    g.title,
    g.target_value,
    CASE g.metric
    WHEN 'photos' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.review_images ri
        WHERE
          ri.user_id = v_uid
          AND ri.created_at >= g.created_at), 0)
    WHEN 'edits' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.building_audit_logs al
        WHERE
          al.user_id = v_uid
          AND al.created_at >= g.created_at), 0)
    WHEN 'visits' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.user_buildings ub
        WHERE
          ub.user_id = v_uid
          AND ub.status::text = 'visited'
          AND COALESCE(ub.visited_at, ub.created_at) >= g.created_at), 0)
    WHEN 'firms_claimed' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.company_stewards cs
        WHERE
          cs.user_id = v_uid
          AND cs.role = 'owner'::public.company_steward_role
          AND cs.created_at >= g.created_at), 0)
    WHEN 'moderation' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.building_audit_logs al
        WHERE
          al.user_id = v_uid
          AND al.operation IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval', 'ambassador_video_approval')
          AND al.created_at >= g.created_at), 0)
    WHEN 'outreach' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.outreach_log ol
        WHERE
          ol.ambassador_id = v_uid
          AND ol.created_at >= g.created_at), 0)
    WHEN 'events' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.embassy_event_discoveries ed
        WHERE
          ed.reviewed_by = v_uid
          AND ed.status = 'published'
          AND ed.reviewed_at >= g.created_at), 0)
    WHEN 'research' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.building_audit_logs al
        WHERE
          al.user_id = v_uid
          AND al.operation = 'ai_research_apply'
          AND al.created_at >= g.created_at), 0)
    ELSE
      g.current_value
    END AS current_value,
    g.metric,
    g.status,
    g.due_date,
    g.created_at,
    g.updated_at
  FROM
    public.ambassador_goals g
  WHERE
    g.user_id = v_uid
  ORDER BY
    g.created_at DESC NULLS LAST;
END;
$$;

-- ─── 3. Weekly digest buckets (20271193000000) ────────────────────────────────
--
-- The three buckets must stay mutually exclusive, so the edits and research filters
-- move to `operation` alongside moderation. COALESCE guards the NOT IN legs: a NULL
-- operation is an edit, and `NULL NOT IN (...)` would otherwise drop the row entirely.

CREATE OR REPLACE FUNCTION public.compute_weekly_digest_payloads (p_week_start date, p_inactive_weeks integer DEFAULT 4)
  RETURNS TABLE (
    user_id uuid,
    chapter_id uuid,
    payload jsonb)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  WITH bounds AS (
    SELECT
      p_week_start::timestamptz                                                   AS v_start,
      (p_week_start + 7)::timestamptz                                             AS v_end,
      (p_week_start - (GREATEST(p_inactive_weeks, 1) - 1) * 7)::timestamptz       AS v_active_since
  ),
  members AS (
    SELECT m.user_id, m.chapter_id
    FROM   public.ambassador_memberships m
           INNER JOIN public.profiles p ON p.id = m.user_id
    WHERE  m.status = 'active'
  ),
  chapters AS (
    SELECT c.id, c.name, c.type, c.locality_id, c.country_code
    FROM   public.ambassador_chapters c
    WHERE  EXISTS (SELECT 1 FROM members me WHERE me.chapter_id = c.id)
  ),
  -- (chapter_id, building_id) pairs in a single buildings scan.
  scoped_buildings AS (
    SELECT c.id AS chapter_id, b.id AS building_id
    FROM   public.buildings b
           CROSS JOIN chapters c
    WHERE  COALESCE(b.is_deleted, FALSE) = FALSE
      AND  (
        (c.type = 'local'
          AND b.locality_id IS NOT NULL
          AND b.locality_id = c.locality_id)
        OR (c.type = 'national'
          AND (
            upper(COALESCE(b.country_code, '')) = c.country_code
            OR EXISTS (
              SELECT 1
              FROM   public.localities l
              WHERE  l.id = b.locality_id
                AND  upper(l.country_code) = c.country_code
            )
          )
        )
      )
  ),
  -- Three mutually exclusive buckets — see design note 1.
  audit_agg AS (
    SELECT
      al.user_id,
      sb.chapter_id,
      COUNT(*) FILTER (
        WHERE COALESCE(al.operation, '') NOT IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval', 'ambassador_video_approval')
          AND COALESCE(al.operation, '') <> 'ai_research_apply'
      )::integer AS edits,
      COUNT(*) FILTER (
        WHERE al.operation IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval', 'ambassador_video_approval')
      )::integer AS moderation,
      COUNT(*) FILTER (
        WHERE al.operation = 'ai_research_apply'
      )::integer AS research
    FROM   public.building_audit_logs al
           INNER JOIN scoped_buildings sb ON sb.building_id = al.building_id
           CROSS JOIN bounds bo
    WHERE  al.created_at >= bo.v_start
      AND  al.created_at <  bo.v_end
      AND  al.user_id IS NOT NULL
    GROUP BY al.user_id, sb.chapter_id
  ),
  photos_agg AS (
    SELECT ri.user_id, sb.chapter_id, COUNT(*)::integer AS photos
    FROM   public.review_images ri
           INNER JOIN public.building_posts bp ON bp.id = ri.review_id
           INNER JOIN scoped_buildings sb ON sb.building_id = bp.building_id
           CROSS JOIN bounds bo
    WHERE  ri.created_at >= bo.v_start
      AND  ri.created_at <  bo.v_end
    GROUP BY ri.user_id, sb.chapter_id
  ),
  visits_agg AS (
    SELECT ub.user_id, sb.chapter_id, COUNT(*)::integer AS visits
    FROM   public.user_buildings ub
           INNER JOIN scoped_buildings sb ON sb.building_id = ub.building_id
           CROSS JOIN bounds bo
    WHERE  ub.status = 'visited'
      AND  COALESCE(ub.visited_at, ub.created_at) >= bo.v_start
      AND  COALESCE(ub.visited_at, ub.created_at) <  bo.v_end
    GROUP BY ub.user_id, sb.chapter_id
  ),
  -- Global (a firm claim is not building-scoped), same as the leaderboard.
  firms_agg AS (
    SELECT cs.user_id, COUNT(*)::integer AS firms_claimed
    FROM   public.company_stewards cs
           CROSS JOIN bounds bo
    WHERE  cs.role = 'owner'::public.company_steward_role
      AND  cs.created_at >= bo.v_start
      AND  cs.created_at <  bo.v_end
    GROUP BY cs.user_id
  ),
  outreach_agg AS (
    SELECT ol.ambassador_id AS user_id, COUNT(*)::integer AS outreach
    FROM   public.outreach_log ol
           CROSS JOIN bounds bo
    WHERE  ol.created_at >= bo.v_start
      AND  ol.created_at <  bo.v_end
    GROUP BY ol.ambassador_id
  ),
  events_agg AS (
    SELECT ed.reviewed_by AS user_id, ed.chapter_id, COUNT(*)::integer AS events
    FROM   public.embassy_event_discoveries ed
           CROSS JOIN bounds bo
    WHERE  ed.status = 'published'
      AND  ed.reviewed_by IS NOT NULL
      AND  ed.reviewed_at >= bo.v_start
      AND  ed.reviewed_at <  bo.v_end
    GROUP BY ed.reviewed_by, ed.chapter_id
  ),
  -- Inactivity gate: the same 6-leg contribution union get_my_ambassador_impact uses
  -- for its streak, pushed down so it never scans all-time history.
  recently_active AS (
    SELECT DISTINCT e.user_id
    FROM (
      SELECT al.user_id, al.created_at AS occurred_at
        FROM public.building_audit_logs al
      UNION ALL
      SELECT ri.user_id, ri.created_at FROM public.review_images ri
      UNION ALL
      SELECT ub.user_id, COALESCE(ub.visited_at, ub.created_at)
        FROM public.user_buildings ub WHERE ub.status = 'visited'
      UNION ALL
      SELECT cs.user_id, cs.created_at
        FROM public.company_stewards cs
       WHERE cs.role = 'owner'::public.company_steward_role
      UNION ALL
      SELECT ol.ambassador_id, ol.created_at FROM public.outreach_log ol
      UNION ALL
      SELECT ed.reviewed_by, ed.reviewed_at
        FROM public.embassy_event_discoveries ed WHERE ed.status = 'published'
    ) e
    CROSS JOIN bounds bo
    WHERE e.user_id IS NOT NULL
      AND e.occurred_at IS NOT NULL
      AND e.occurred_at >= bo.v_active_since
  ),
  per_member AS (
    SELECT
      me.user_id,
      me.chapter_id,
      COALESCE(aa.edits, 0)         AS edits,
      COALESCE(pa.photos, 0)        AS photos,
      COALESCE(va.visits, 0)        AS visits,
      COALESCE(aa.moderation, 0)    AS moderation,
      COALESCE(oa.outreach, 0)      AS outreach,
      COALESCE(ea.events, 0)        AS events,
      COALESCE(aa.research, 0)      AS research,
      COALESCE(fa.firms_claimed, 0) AS firms_claimed
    FROM   members me
           LEFT JOIN audit_agg    aa ON aa.user_id = me.user_id AND aa.chapter_id = me.chapter_id
           LEFT JOIN photos_agg   pa ON pa.user_id = me.user_id AND pa.chapter_id = me.chapter_id
           LEFT JOIN visits_agg   va ON va.user_id = me.user_id AND va.chapter_id = me.chapter_id
           LEFT JOIN events_agg   ea ON ea.user_id = me.user_id AND ea.chapter_id = me.chapter_id
           LEFT JOIN outreach_agg oa ON oa.user_id = me.user_id
           LEFT JOIN firms_agg    fa ON fa.user_id = me.user_id
  ),
  per_member_total AS (
    SELECT
      pm.*,
      (pm.edits + pm.photos + pm.visits + pm.moderation + pm.outreach + pm.events
        + pm.research + pm.firms_claimed) AS total
    FROM per_member pm
  ),
  -- Aggregated FROM the member rows, so "you" is always a subset of "chapter".
  per_chapter AS (
    SELECT
      pmt.chapter_id,
      SUM(pmt.edits)::integer         AS edits,
      SUM(pmt.photos)::integer        AS photos,
      SUM(pmt.visits)::integer        AS visits,
      SUM(pmt.moderation)::integer    AS moderation,
      SUM(pmt.outreach)::integer      AS outreach,
      SUM(pmt.events)::integer        AS events,
      SUM(pmt.research)::integer      AS research,
      SUM(pmt.firms_claimed)::integer AS firms_claimed,
      SUM(pmt.total)::integer         AS total,
      COUNT(*) FILTER (WHERE pmt.total > 0)::integer AS active_members
    FROM per_member_total pmt
    GROUP BY pmt.chapter_id
  ),
  backlog AS (
    SELECT c.id AS chapter_id, b.*
    FROM   chapters c
           CROSS JOIN LATERAL public._digest_chapter_backlog (c.id) b
  )
  SELECT
    pmt.user_id,
    pmt.chapter_id,
    jsonb_build_object(
      'weekStart',   to_char(p_week_start, 'YYYY-MM-DD'),
      'weekEnd',     to_char(p_week_start + 7, 'YYYY-MM-DD'),
      'chapterId',   c.id,
      'chapterName', COALESCE(c.name, 'your chapter'),
      'you', jsonb_build_object(
        'edits', pmt.edits, 'photos', pmt.photos, 'visits', pmt.visits,
        'moderation', pmt.moderation, 'outreach', pmt.outreach, 'events', pmt.events,
        'research', pmt.research, 'firmsClaimed', pmt.firms_claimed, 'total', pmt.total),
      'chapter', jsonb_build_object(
        'edits', pc.edits, 'photos', pc.photos, 'visits', pc.visits,
        'moderation', pc.moderation, 'outreach', pc.outreach, 'events', pc.events,
        'research', pc.research, 'firmsClaimed', pc.firms_claimed, 'total', pc.total,
        'activeMembers', pc.active_members),
      'tasks', jsonb_build_object(
        'research', bl.research, 'curation', bl.curation, 'photography', bl.photography,
        'outreach', bl.outreach, 'events', bl.events, 'total', bl.total, 'capped', bl.capped)
    ) AS payload
  FROM   per_member_total pmt
         INNER JOIN chapters    c  ON c.id  = pmt.chapter_id
         INNER JOIN per_chapter pc ON pc.chapter_id = pmt.chapter_id
         INNER JOIN backlog     bl ON bl.chapter_id = pmt.chapter_id
  WHERE  EXISTS (SELECT 1 FROM recently_active ra WHERE ra.user_id = pmt.user_id)
  ORDER BY pmt.user_id;
$$;

-- ─── 4. Grants — re-asserted, unchanged from the originals ────────────────────
--
-- CREATE OR REPLACE keeps existing grants, but state them anyway so this file is
-- self-contained and the migration linter can see them. REVOKE names anon and
-- authenticated explicitly: FROM PUBLIC alone leaves the ALTER DEFAULT PRIVILEGES
-- grants in place (#1671).

REVOKE ALL ON FUNCTION public.compute_weekly_digest_payloads (date, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_ambassador_impact (integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_ambassador_goals () TO authenticated;
