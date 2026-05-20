-- Intervention Queue — Phase 3
-- Creates admin_flag_dismissals table, get_programme_intervention_flags() RPC,
-- and dismiss_intervention_flag() RPC for /admin/programme/interventions.

-- ─── Table: admin_flag_dismissals ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_flag_dismissals (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_type    text        NOT NULL,
  entity_id    uuid        NOT NULL,
  dismissed_by uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  snooze_until timestamptz
);

-- One active dismissal record per user per flag per entity; ON CONFLICT DO UPDATE handles re-snooze.
CREATE UNIQUE INDEX IF NOT EXISTS admin_flag_dismissals_unique_per_user
  ON public.admin_flag_dismissals (flag_type, entity_id, dismissed_by);

ALTER TABLE public.admin_flag_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read their own dismissals"
  ON public.admin_flag_dismissals FOR SELECT
  USING (dismissed_by = auth.uid() AND is_admin());

CREATE POLICY "Admins can insert their own dismissals"
  ON public.admin_flag_dismissals FOR INSERT
  WITH CHECK (dismissed_by = auth.uid() AND is_admin());

CREATE POLICY "Admins can update their own dismissals"
  ON public.admin_flag_dismissals FOR UPDATE
  USING (dismissed_by = auth.uid() AND is_admin())
  WITH CHECK (dismissed_by = auth.uid() AND is_admin());

-- ─── RPC: get_programme_intervention_flags ────────────────────────────────────
-- Evaluates all flag conditions and returns the active list, excluding any
-- flags the calling admin has dismissed or snoozed (and whose snooze hasn't expired).

DROP FUNCTION IF EXISTS get_programme_intervention_flags();

CREATE FUNCTION get_programme_intervention_flags()
RETURNS TABLE (
  flag_type        text,
  severity         text,
  chapter_id       uuid,
  chapter_name     text,
  country_code     text,
  description      text,
  suggested_action text,
  detected_at      timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  WITH all_flags AS (
    -- 1. No president assigned to an active chapter
    SELECT
      'no_president'::text                                               AS flag_type,
      'urgent'::text                                                     AS severity,
      c.id                                                               AS chapter_id,
      c.name                                                             AS chapter_name,
      c.country_code                                                     AS country_code,
      'No president assigned to this active chapter'::text               AS description,
      'Assign a president'::text                                         AS suggested_action,
      now()                                                              AS detected_at
    FROM ambassador_chapters c
    WHERE c.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM ambassador_memberships am
        WHERE am.chapter_id = c.id AND am.role = 'president' AND am.status = 'active'
      )
      AND NOT EXISTS (
        SELECT 1 FROM admin_flag_dismissals d
        WHERE d.flag_type = 'no_president'
          AND d.entity_id = c.id
          AND d.dismissed_by = auth.uid()
          AND (d.snooze_until IS NULL OR d.snooze_until > now())
      )

    UNION ALL

    -- 2. President has no audit log activity in > 30 days
    SELECT
      'president_inactive'::text,
      'warning'::text,
      c.id,
      c.name,
      c.country_code,
      ('President @' || p.username || ' has had no activity in over 30 days')::text,
      'Review or reassign'::text,
      now()
    FROM ambassador_chapters c
    JOIN ambassador_memberships am
      ON  am.chapter_id = c.id
      AND am.role       = 'president'
      AND am.status     = 'active'
    JOIN profiles p ON p.id = am.user_id
    WHERE c.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM building_audit_logs bal
        WHERE bal.user_id = am.user_id
          AND bal.created_at >= now() - INTERVAL '30 days'
      )
      AND NOT EXISTS (
        SELECT 1 FROM admin_flag_dismissals d
        WHERE d.flag_type = 'president_inactive'
          AND d.entity_id = c.id
          AND d.dismissed_by = auth.uid()
          AND (d.snooze_until IS NULL OR d.snooze_until > now())
      )

    UNION ALL

    -- 3. Chapter has been in forming status for > 60 days
    SELECT
      'forming_stalled'::text,
      'warning'::text,
      c.id,
      c.name,
      c.country_code,
      ('Chapter has been in "forming" status for '
        || EXTRACT(DAY FROM now() - c.created_at)::int::text
        || ' days')::text,
      'Follow up or close'::text,
      c.created_at
    FROM ambassador_chapters c
    WHERE c.status = 'forming'
      AND c.created_at < now() - INTERVAL '60 days'
      AND NOT EXISTS (
        SELECT 1 FROM admin_flag_dismissals d
        WHERE d.flag_type = 'forming_stalled'
          AND d.entity_id = c.id
          AND d.dismissed_by = auth.uid()
          AND (d.snooze_until IS NULL OR d.snooze_until > now())
      )

    UNION ALL

    -- 4. Chapter at max capacity with pending applications
    SELECT
      'at_capacity_open_apps'::text,
      'warning'::text,
      c.id,
      c.name,
      c.country_code,
      ('Chapter is at capacity ('
        || mc.active_count::text || '/' || c.max_ambassadors::text
        || ' members) with '
        || pa.pending_count::text || ' pending application(s)')::text,
      'Review cap or approve applications'::text,
      now()
    FROM ambassador_chapters c
    CROSS JOIN LATERAL (
      SELECT COUNT(*) AS active_count
      FROM ambassador_memberships am
      WHERE am.chapter_id = c.id AND am.status = 'active'
    ) mc
    CROSS JOIN LATERAL (
      SELECT COUNT(*) AS pending_count
      FROM ambassador_applications aa
      WHERE aa.chapter_id = c.id AND aa.status = 'pending'
    ) pa
    WHERE c.status = 'active'
      AND mc.active_count >= c.max_ambassadors
      AND pa.pending_count > 0
      AND NOT EXISTS (
        SELECT 1 FROM admin_flag_dismissals d
        WHERE d.flag_type = 'at_capacity_open_apps'
          AND d.entity_id = c.id
          AND d.dismissed_by = auth.uid()
          AND (d.snooze_until IS NULL OR d.snooze_until > now())
      )

    UNION ALL

    -- 5. No building activity from any chapter member in the last 30 days
    SELECT
      'no_chapter_activity'::text,
      'info'::text,
      c.id,
      c.name,
      c.country_code,
      'No building edits or photos from chapter members in the last 30 days'::text,
      'Check in with president'::text,
      now()
    FROM ambassador_chapters c
    WHERE c.status = 'active'
      AND NOT EXISTS (
        SELECT 1
        FROM building_audit_logs bal
        JOIN ambassador_memberships am
          ON  am.user_id     = bal.user_id
          AND am.chapter_id  = c.id
          AND am.status      = 'active'
        WHERE bal.created_at >= now() - INTERVAL '30 days'
      )
      AND NOT EXISTS (
        SELECT 1 FROM admin_flag_dismissals d
        WHERE d.flag_type = 'no_chapter_activity'
          AND d.entity_id = c.id
          AND d.dismissed_by = auth.uid()
          AND (d.snooze_until IS NULL OR d.snooze_until > now())
      )
  )
  SELECT *
  FROM all_flags
  ORDER BY
    CASE all_flags.severity WHEN 'urgent' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
    all_flags.chapter_name;
END;
$$;

REVOKE ALL ON FUNCTION get_programme_intervention_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_programme_intervention_flags() TO authenticated;

-- ─── RPC: dismiss_intervention_flag ──────────────────────────────────────────
-- Upserts a dismissal record for the calling admin. Pass p_snooze_days = NULL
-- for a permanent dismissal; pass 7, 14, or 30 to snooze.

DROP FUNCTION IF EXISTS dismiss_intervention_flag(text, uuid, int);

CREATE FUNCTION dismiss_intervention_flag(
  p_flag_type   text,
  p_entity_id   uuid,
  p_snooze_days int DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snooze_until timestamptz;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_snooze_until := CASE
    WHEN p_snooze_days IS NOT NULL THEN now() + (p_snooze_days::text || ' days')::interval
    ELSE NULL
  END;

  INSERT INTO admin_flag_dismissals (flag_type, entity_id, dismissed_by, snooze_until)
  VALUES (p_flag_type, p_entity_id, auth.uid(), v_snooze_until)
  ON CONFLICT (flag_type, entity_id, dismissed_by)
  DO UPDATE SET dismissed_at = now(), snooze_until = EXCLUDED.snooze_until;
END;
$$;

REVOKE ALL ON FUNCTION dismiss_intervention_flag(text, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dismiss_intervention_flag(text, uuid, int) TO authenticated;
