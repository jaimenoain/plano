-- Embassy weekly digest (Roadmap 3.2) — in-app + email return loop.
--
-- Every Monday 09:00 UTC, pg_cron calls public.run_weekly_digest(). For each active
-- ambassador who contributed something in the last 4 weeks it computes "you did X in
-- your chapter this week, your chapter did Y, N tasks are waiting", writes an in-app
-- notification, and fires ONE pg_net call to the send-weekly-digest edge function,
-- which mails the same payload.
--
-- ── Design notes, because the numbers here look like other numbers but are not ──
--
-- 1. METRIC PARTITION. building_audit_logs is split into THREE mutually exclusive
--    buckets — edits / moderation / research — so `you.total` is a real sum.
--    This deliberately matches NEITHER existing RPC:
--      * get_my_ambassador_impact.edits_count is an unfiltered COUNT(*), so it counts
--        moderation and research rows as edits too. A digest saying "you made 9 edits
--        and 4 moderations" when 4 of the 9 ARE the moderations is a lie the recipient
--        can check.
--      * get_chapter_ambassador_activity.edits_count excludes the 3 approval tags but
--        folds ai_research_apply in.
--    CONSEQUENCE: digest numbers are chapter-scoped AND week-windowed, so they will not
--    equal /embassy/impact (global, all-time) or the leaderboard. The email copy says
--    "in {Chapter} this week", never a bare "you did X".
--
-- 2. NO auth.uid() ANYWHERE. Every existing embassy RPC is self-scoped and returns
--    EMPTY (not an error) under a cron/service-role connection, so none of them are
--    reusable here. These functions take explicit parameters and are set-based over all
--    members at once.
--
-- 3. NO PER-ROW SCOPE HELPER. _building_in_ambassador_chapter_scope() is never called.
--    The header of 20271151000000_leaderboard_rpc_set_based_rewrite.sql records that
--    per-row calls to it blew the statement timeout and returned HTTP 500s; its
--    set-based scoped_buildings predicate is copied instead.
--
-- 4. SELF-ACTOR CONVENTION. notifications.actor_id is NOT NULL -> profiles(id) and this
--    database has no system profile, so a system-generated notification uses
--    actor_id = user_id. The digest genuinely is about the recipient, and the
--    actor:notifications_actor_id_fkey join always resolves. Roadmap 3.3 (milestones)
--    should reuse this; promote to a real system profile only if a third type appears.
--    Client code must therefore never interpolate actor.username for 'weekly_digest'.
--
-- 5. IDEMPOTENCY. embassy_digest_deliveries is the ledger. Each step has its own gate —
--    insert ON CONFLICT DO NOTHING, notify WHERE notified_at IS NULL, email WHERE
--    emailed_at IS NULL — so a crash after 2 of 3 emails resumes with no double-send.
--
-- 6. OPT-OUT. One key, profiles.notification_preferences->>'weekly_digest', governs both
--    channels. In-app is automatic (the existing before_insert_notifications trigger
--    drops the row); email is filtered in get_pending_weekly_digest_emails.

-- ─── 1. Ledger ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.embassy_digest_deliveries (
  user_id     uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  week_start  date        NOT NULL,
  chapter_id  uuid        REFERENCES public.ambassador_chapters (id) ON DELETE SET NULL,
  payload     jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  notified_at timestamptz,
  emailed_at  timestamptz,
  email_error text,
  CONSTRAINT embassy_digest_deliveries_pkey PRIMARY KEY (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS embassy_digest_deliveries_pending_email_idx
  ON public.embassy_digest_deliveries (week_start)
  WHERE emailed_at IS NULL;

-- RLS on with no policies: default-deny for anon/authenticated; service_role bypasses.
-- Same shape as credit_notification_log (20270823000000).
ALTER TABLE public.embassy_digest_deliveries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.embassy_digest_deliveries IS
  'One row per ambassador per digested week. Delivery ledger + payload snapshot; makes run_weekly_digest and send-weekly-digest idempotent and resumable. Service-role only.';

-- ─── 2. Chapter task backlog ──────────────────────────────────────────────────
--
-- The "N tasks waiting" number, mirroring the five queues StartHereQueue shows.
-- Exact counts for the two chapter-keyed queues; capped counts for the three
-- building-derived ones (an uncapped anti-join over a national chapter's building set
-- is exactly the shape that killed the leaderboard, and nobody acts differently on
-- 847 vs "200+").

CREATE OR REPLACE FUNCTION public._digest_chapter_backlog (p_chapter_id uuid, p_cap integer DEFAULT 200)
  RETURNS TABLE (
    research    integer,
    curation    integer,
    photography integer,
    outreach    integer,
    events      integer,
    total       integer,
    capped      boolean)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  WITH chapter AS (
    SELECT c.id, c.type, c.locality_id, c.country_code
    FROM   public.ambassador_chapters c
    WHERE  c.id = p_chapter_id
  ),
  -- Materialise the chapter's building set ONCE (predicate copied verbatim from
  -- 20271151000000_leaderboard_rpc_set_based_rewrite.sql).
  scoped_buildings AS (
    SELECT b.id AS building_id
    FROM   public.buildings b
           CROSS JOIN chapter c
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
  legs AS (
    SELECT
      -- Exact: chapter-keyed and indexed.
      (SELECT COUNT(*)::integer
         FROM public.ambassador_building_research_queue q
        WHERE q.chapter_id = p_chapter_id AND q.status = 'pending')          AS research,
      (SELECT COUNT(*)::integer
         FROM public.embassy_event_discoveries ed
        WHERE ed.chapter_id = p_chapter_id AND ed.status = 'pending')        AS events,
      -- Capped: building-derived. Mirrors get_ambassador_recent_buildings.
      (SELECT COUNT(*)::integer FROM (
         SELECT 1
           FROM public.buildings b
                INNER JOIN scoped_buildings sb ON sb.building_id = b.id
          WHERE b.created_at IS NOT NULL
            AND b.created_at >= (timezone('utc'::text, now()) - interval '30 days')
            AND b.moderated_at IS NULL
          LIMIT p_cap) t)                                                    AS curation,
      -- Mirrors get_ambassador_buildings_without_photos.
      (SELECT COUNT(*)::integer FROM (
         SELECT 1
           FROM public.buildings b
                INNER JOIN scoped_buildings sb ON sb.building_id = b.id
          WHERE b.hero_image_url IS NULL
            AND NOT EXISTS (
              SELECT 1
                FROM public.user_buildings ub
                     INNER JOIN public.review_images ri ON ri.review_id = ub.id
               WHERE ub.building_id = b.id)
          LIMIT p_cap) t)                                                    AS photography,
      -- Mirrors get_ambassador_unclaimed_firms.
      (SELECT COUNT(*)::integer FROM (
         SELECT co.id
           FROM public.companies co
                INNER JOIN public.building_credits bc ON bc.company_id = co.id
                                                     AND bc.status <> 'hidden'
                INNER JOIN scoped_buildings sb ON sb.building_id = bc.building_id
          WHERE co.claim_status = 'unclaimed'
          GROUP BY co.id
          LIMIT p_cap) t)                                                    AS outreach
  )
  SELECT
    l.research,
    l.curation,
    l.photography,
    l.outreach,
    l.events,
    (l.research + l.curation + l.photography + l.outreach + l.events)::integer AS total,
    (l.curation = p_cap OR l.photography = p_cap OR l.outreach = p_cap)        AS capped
  FROM legs l;
$$;

COMMENT ON FUNCTION public._digest_chapter_backlog (uuid, integer) IS
  'Internal: chapter task backlog for the weekly digest. Building-derived legs are capped at p_cap (capped=true means "p_cap+"). Called once per chapter, never per member.';

-- ─── 3. Payload computation ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_weekly_digest_payloads (p_week_start date, p_inactive_weeks integer DEFAULT 4)
  RETURNS TABLE (
    user_id    uuid,
    chapter_id uuid,
    payload    jsonb)
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
        WHERE al.table_name NOT IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval')
          AND COALESCE(al.operation, '') <> 'ai_research_apply'
      )::integer AS edits,
      COUNT(*) FILTER (
        WHERE al.table_name IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval')
      )::integer AS moderation,
      COUNT(*) FILTER (
        WHERE al.operation = 'ai_research_apply'
          AND al.table_name NOT IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval')
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

COMMENT ON FUNCTION public.compute_weekly_digest_payloads (date, integer) IS
  'Internal: one weekly digest payload per active ambassador with activity in the last p_inactive_weeks weeks. Set-based, no auth.uid(). Chapter-scoped and week-windowed, so its numbers intentionally differ from get_my_ambassador_impact (global, all-time).';

-- ─── 4. Notification type ─────────────────────────────────────────────────────
-- Re-declare the FULL notifications type set — the constraint is repeatedly
-- dropped/rebuilt, so append by restating the whole list. The 23 below were verified
-- live via pg_get_constraintdef before this migration was written.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'follow', 'like', 'comment', 'recommendation', 'friend_joined', 'suggest_follow',
  'visit_request', 'architect_verification', 'ambassador_application_received',
  'ambassador_application_approved', 'ambassador_application_rejected',
  'ambassador_membership_review', 'award_win', 'feedback_status_updated',
  'feedback_notes_updated', 'project_idea_submitted', 'collection_collab_requested',
  'collection_collab_accepted', 'collection_collab_rejected', 'collection_collab_added',
  'contribution_approved', 'contribution_flagged', 'person_claimed',
  'weekly_digest'
));

-- ─── 5. Pending email queue (service-role read for the edge function) ─────────

CREATE OR REPLACE FUNCTION public.get_pending_weekly_digest_emails (p_week_start date DEFAULT NULL, p_limit integer DEFAULT 200)
  RETURNS TABLE (
    user_id    uuid,
    week_start date,
    email      text,
    username   text,
    payload    jsonb)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    d.user_id,
    d.week_start,
    au.email::text,
    COALESCE(p.username, '')::text AS username,
    d.payload
  FROM   public.embassy_digest_deliveries d
         INNER JOIN public.profiles p  ON p.id  = d.user_id
         LEFT  JOIN auth.users     au  ON au.id = d.user_id
  WHERE  d.week_start = COALESCE(p_week_start, (date_trunc('week', timezone('utc'::text, now()))::date - 7))
    AND  d.emailed_at IS NULL
    AND  au.email IS NOT NULL
    -- Email opt-out. Same key the in-app trigger reads, so one toggle governs both.
    AND  COALESCE(p.notification_preferences ->> 'weekly_digest', '') <> 'false'
  ORDER BY d.user_id
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_pending_weekly_digest_emails (date, integer) IS
  'Service-role only. Un-emailed digest rows for a week, joined to auth.users for the address and filtered by the weekly_digest opt-out. Defaults to last week so cron and manual invocations agree.';

-- ─── 6. Orchestrator (the cron entry point) ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.run_weekly_digest (p_week_start date DEFAULT NULL, p_inactive_weeks integer DEFAULT 4)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, vault, net, extensions
  SET statement_timeout = '60s'
  AS $$
DECLARE
  v_week_start    date;
  v_candidates    integer := 0;
  v_inserted      integer := 0;
  v_notified      integer := 0;
  v_pending_email integer := 0;
  v_http_fired    boolean := FALSE;
  v_project_url   text;
  v_service_key   text;
  v_summary       jsonb;
BEGIN
  v_week_start := COALESCE(p_week_start, (date_trunc('week', timezone('utc'::text, now()))::date - 7));

  SELECT COUNT(*)::integer INTO v_candidates
  FROM public.compute_weekly_digest_payloads (v_week_start, p_inactive_weeks);

  -- Snapshot. ON CONFLICT DO NOTHING makes a re-fire a no-op.
  INSERT INTO public.embassy_digest_deliveries (user_id, week_start, chapter_id, payload)
  SELECT cp.user_id, v_week_start, cp.chapter_id, cp.payload
  FROM   public.compute_weekly_digest_payloads (v_week_start, p_inactive_weeks) cp
  ON CONFLICT (user_id, week_start) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- In-app. The before_insert_notifications trigger silently drops rows for users who
  -- opted out, so they are not counted here...
  INSERT INTO public.notifications (user_id, actor_id, type, metadata)
  SELECT
    d.user_id,
    d.user_id, -- self-actor: see design note 4
    'weekly_digest',
    jsonb_build_object(
      'chapter_id',   d.chapter_id,
      'chapter_name', d.payload ->> 'chapterName',
      'digest',       d.payload)
  FROM   public.embassy_digest_deliveries d
  WHERE  d.week_start = v_week_start
    AND  d.notified_at IS NULL;
  GET DIAGNOSTICS v_notified = ROW_COUNT;

  -- ...but every pending row is stamped, opted-out included, so they are not retried
  -- forever. The gap between candidates and notified is the opt-out count.
  UPDATE public.embassy_digest_deliveries
  SET    notified_at = timezone('utc'::text, now())
  WHERE  week_start = v_week_start
    AND  notified_at IS NULL;

  SELECT COUNT(*)::integer INTO v_pending_email
  FROM   public.embassy_digest_deliveries d
  WHERE  d.week_start = v_week_start
    AND  d.emailed_at IS NULL;

  IF v_pending_email > 0 THEN
    SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
    SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    IF v_project_url IS NULL OR v_service_key IS NULL THEN
      -- Deliberately NOT an exception: an email-transport misconfiguration must not roll
      -- back the ledger and the in-app notifications. The email step is independently
      -- resumable — invoke send-weekly-digest by hand once the secrets exist.
      RAISE LOG 'run_weekly_digest: vault secrets missing (project_url/service_role_key); skipped the email dispatch';
    ELSE
      PERFORM net.http_post(
        url     := rtrim(v_project_url, '/') || '/functions/v1/send-weekly-digest',
        headers := jsonb_build_object(
                     'Content-Type', 'application/json',
                     'Authorization', 'Bearer ' || v_service_key),
        body    := jsonb_build_object(
                     'weekStart', to_char(v_week_start, 'YYYY-MM-DD'),
                     'source', 'cron'));
      v_http_fired := TRUE;
    END IF;
  END IF;

  v_summary := jsonb_build_object(
    'week_start',    to_char(v_week_start, 'YYYY-MM-DD'),
    'candidates',    v_candidates,
    'inserted',      v_inserted,
    'notified',      v_notified,
    'pending_email', v_pending_email,
    'http_fired',    v_http_fired);

  RAISE LOG 'run_weekly_digest: %', v_summary;

  RETURN v_summary;
END;
$$;

COMMENT ON FUNCTION public.run_weekly_digest (date, integer) IS
  'Weekly digest entry point (pg_cron, Mondays 09:00 UTC). Snapshots payloads into embassy_digest_deliveries, writes in-app notifications, and fires one pg_net call to the send-weekly-digest edge function. Idempotent. p_inactive_weeks => 999 disables the inactivity skip without a migration.';

-- ─── 7. Grants — nothing here is called from the browser ─────────────────────
--
-- REVOKE ... FROM PUBLIC is NOT sufficient on Supabase. This project has
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,
-- authenticated, so every new function is granted to those two roles DIRECTLY at
-- creation, and revoking the PUBLIC pseudo-role leaves those direct grants in place.
-- Verified the hard way: with only the PUBLIC revoke, an anonymous
-- POST /rest/v1/rpc/run_weekly_digest returned 200 and ran the whole digest.
-- Every function here must therefore be revoked from anon and authenticated by name.

REVOKE ALL ON FUNCTION public._digest_chapter_backlog (uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.compute_weekly_digest_payloads (date, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_pending_weekly_digest_emails (date, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_weekly_digest (date, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_pending_weekly_digest_emails (date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_weekly_digest (date, integer) TO service_role;

-- ─── 8. Schedule ─────────────────────────────────────────────────────────────
-- Monday 09:00 UTC: the digest reports a completed week so it must run after
-- date_trunc('week') rolls over (Postgres weeks are ISO/Monday, so the cron day and
-- week_start agree by construction); 09:00 UTC is a workday morning across the current
-- chapters; and it does not collide with refresh-locality-hero-images at 03:00 Monday.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

DO $$
BEGIN
  PERFORM cron.unschedule('embassy-weekly-digest');
EXCEPTION
  WHEN OTHERS THEN NULL;
END
$$;

SELECT cron.schedule(
  'embassy-weekly-digest',
  '0 9 * * 1',
  $$SELECT public.run_weekly_digest()$$
);

NOTIFY pgrst, 'reload schema';
