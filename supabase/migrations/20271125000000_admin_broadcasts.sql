-- Admin Broadcasts — Phase 4
-- Creates admin_broadcasts, admin_broadcast_reads tables and all supporting RPCs
-- for /admin/programme/broadcasts and the embassy leadership banner.

-- ─── Table: admin_broadcasts ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_broadcasts (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject         text        NOT NULL,
  body            text        NOT NULL CHECK (char_length(body) <= 2000),
  type            text        NOT NULL CHECK (type IN ('announcement', 'action_required', 'check_in')),
  recipient_scope text        NOT NULL CHECK (recipient_scope IN ('all', 'country', 'chapter')),
  scope_value     text,
  sent_by         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  pinned          boolean     NOT NULL DEFAULT false
);

ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage broadcasts" ON public.admin_broadcasts;
CREATE POLICY "Admins can manage broadcasts"
  ON public.admin_broadcasts FOR ALL USING (is_admin());

-- ─── Table: admin_broadcast_reads ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_broadcast_reads (
  broadcast_id      uuid        NOT NULL REFERENCES public.admin_broadcasts(id) ON DELETE CASCADE,
  recipient_user_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_broadcast_reads_pkey PRIMARY KEY (broadcast_id, recipient_user_id)
);

ALTER TABLE public.admin_broadcast_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own broadcast reads" ON public.admin_broadcast_reads;
DROP POLICY IF EXISTS "Admins read all broadcast reads" ON public.admin_broadcast_reads;
DROP POLICY IF EXISTS "Users insert own broadcast reads" ON public.admin_broadcast_reads;

CREATE POLICY "Users read own broadcast reads"
  ON public.admin_broadcast_reads FOR SELECT
  USING (recipient_user_id = auth.uid());

CREATE POLICY "Admins read all broadcast reads"
  ON public.admin_broadcast_reads FOR SELECT
  USING (is_admin());

CREATE POLICY "Users insert own broadcast reads"
  ON public.admin_broadcast_reads FOR INSERT
  WITH CHECK (recipient_user_id = auth.uid());

-- ─── Extend notifications.type CHECK constraint ───────────────────────────────
-- Adds 'admin_broadcast' to the allowed notification types.

DO $$
BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END;
$$;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'follow', 'like', 'comment', 'recommendation',
    'friend_joined', 'suggest_follow', 'visit_request',
    'architect_verification',
    'ambassador_application_received',
    'ambassador_application_approved',
    'ambassador_application_rejected',
    'ambassador_membership_review',
    'admin_broadcast'
  ));

-- ─── RPC: send_admin_broadcast ────────────────────────────────────────────────
-- Creates the broadcast row, resolves recipients by scope, inserts notification
-- rows for each president, and enforces a rate limit of 3 per day per admin.

DROP FUNCTION IF EXISTS send_admin_broadcast(text, text, text, text, text);

CREATE FUNCTION send_admin_broadcast(
  p_subject         text,
  p_body            text,
  p_type            text,
  p_recipient_scope text,
  p_scope_value     text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_broadcast_id uuid;
  v_rate_check   int;
BEGIN
  v_user_id := auth.uid();
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COUNT(*) INTO v_rate_check
  FROM admin_broadcasts
  WHERE sent_by = v_user_id
    AND sent_at > now() - interval '1 day';

  IF v_rate_check >= 3 THEN
    RAISE EXCEPTION 'Rate limit: max 3 broadcasts per day';
  END IF;

  INSERT INTO admin_broadcasts (subject, body, type, recipient_scope, scope_value, sent_by)
  VALUES (p_subject, p_body, p_type, p_recipient_scope, p_scope_value, v_user_id)
  RETURNING id INTO v_broadcast_id;

  INSERT INTO notifications (user_id, actor_id, type, metadata)
  SELECT
    am.user_id,
    v_user_id,
    'admin_broadcast',
    jsonb_build_object(
      'broadcast_id',   v_broadcast_id,
      'subject',        p_subject,
      'broadcast_type', p_type
    )
  FROM ambassador_memberships am
  JOIN ambassador_chapters ac ON ac.id = am.chapter_id
  WHERE am.role   = 'president'
    AND am.status = 'active'
    AND ac.status IN ('active', 'forming')
    AND CASE
      WHEN p_recipient_scope = 'all'     THEN true
      WHEN p_recipient_scope = 'country' THEN ac.country_code = p_scope_value
      WHEN p_recipient_scope = 'chapter' THEN am.chapter_id::text = p_scope_value
      ELSE false
    END;

  RETURN v_broadcast_id;
END;
$$;

REVOKE ALL ON FUNCTION send_admin_broadcast(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION send_admin_broadcast(text, text, text, text, text) TO authenticated;

-- ─── RPC: toggle_broadcast_pin ────────────────────────────────────────────────
-- Pins or unpins a broadcast. Only one broadcast can be pinned at a time.

DROP FUNCTION IF EXISTS toggle_broadcast_pin(uuid, boolean);

CREATE FUNCTION toggle_broadcast_pin(p_broadcast_id uuid, p_pinned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_pinned THEN
    UPDATE admin_broadcasts SET pinned = false WHERE pinned = true;
  END IF;
  UPDATE admin_broadcasts SET pinned = p_pinned WHERE id = p_broadcast_id;
END;
$$;

REVOKE ALL ON FUNCTION toggle_broadcast_pin(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION toggle_broadcast_pin(uuid, boolean) TO authenticated;

-- ─── RPC: get_admin_broadcasts ────────────────────────────────────────────────
-- Returns all broadcasts with recipient and read counts for the admin panel.

DROP FUNCTION IF EXISTS get_admin_broadcasts();

CREATE FUNCTION get_admin_broadcasts()
RETURNS TABLE (
  id               uuid,
  subject          text,
  body             text,
  type             text,
  recipient_scope  text,
  scope_value      text,
  sent_by_username text,
  sent_at          timestamptz,
  pinned           boolean,
  recipient_count  bigint,
  read_count       bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.subject,
    b.body,
    b.type,
    b.recipient_scope,
    b.scope_value,
    p.username          AS sent_by_username,
    b.sent_at,
    b.pinned,
    COUNT(DISTINCT n.user_id)               AS recipient_count,
    COUNT(DISTINCT br.recipient_user_id)    AS read_count
  FROM admin_broadcasts b
  JOIN profiles p ON p.id = b.sent_by
  LEFT JOIN notifications n
    ON  n.type = 'admin_broadcast'
    AND (n.metadata->>'broadcast_id')::uuid = b.id
  LEFT JOIN admin_broadcast_reads br ON br.broadcast_id = b.id
  WHERE is_admin()
  GROUP BY b.id, b.subject, b.body, b.type, b.recipient_scope,
           b.scope_value, p.username, b.sent_at, b.pinned
  ORDER BY b.sent_at DESC;
$$;

REVOKE ALL ON FUNCTION get_admin_broadcasts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_admin_broadcasts() TO authenticated;

-- ─── RPC: get_broadcast_read_status ──────────────────────────────────────────
-- Returns per-president read status for a given broadcast (admin only).

DROP FUNCTION IF EXISTS get_broadcast_read_status(uuid);

CREATE FUNCTION get_broadcast_read_status(p_broadcast_id uuid)
RETURNS TABLE (
  chapter_id         uuid,
  chapter_name       text,
  president_username text,
  president_user_id  uuid,
  read_at            timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    am.chapter_id,
    ac.name         AS chapter_name,
    pr.username     AS president_username,
    am.user_id      AS president_user_id,
    br.read_at
  FROM notifications n
  JOIN ambassador_memberships am ON am.user_id = n.user_id
  JOIN ambassador_chapters ac   ON ac.id = am.chapter_id
  JOIN profiles pr              ON pr.id = am.user_id
  LEFT JOIN admin_broadcast_reads br
    ON  br.broadcast_id = p_broadcast_id
    AND br.recipient_user_id = am.user_id
  WHERE n.type = 'admin_broadcast'
    AND (n.metadata->>'broadcast_id')::uuid = p_broadcast_id
    AND am.role   = 'president'
    AND am.status = 'active'
    AND is_admin()
  ORDER BY br.read_at NULLS LAST, ac.name;
$$;

REVOKE ALL ON FUNCTION get_broadcast_read_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_broadcast_read_status(uuid) TO authenticated;

-- ─── RPC: get_ambassador_broadcast_banners ────────────────────────────────────
-- Returns broadcasts that should appear as banners in the Embassy Leadership tab:
-- (1) the current pinned broadcast (visible to all active leaders)
-- (2) unread action_required broadcasts targeted at the calling president

DROP FUNCTION IF EXISTS get_ambassador_broadcast_banners();

CREATE FUNCTION get_ambassador_broadcast_banners()
RETURNS TABLE (
  id        uuid,
  subject   text,
  body      text,
  type      text,
  sent_at   timestamptz,
  is_pinned boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.subject, b.body, b.type, b.sent_at, true AS is_pinned
  FROM admin_broadcasts b
  WHERE b.pinned = true
    AND EXISTS (
      SELECT 1 FROM ambassador_memberships am
      WHERE am.user_id = auth.uid()
        AND am.status  = 'active'
        AND am.role IN ('president', 'exco')
    )

  UNION ALL

  SELECT b.id, b.subject, b.body, b.type, b.sent_at, false AS is_pinned
  FROM notifications n
  JOIN admin_broadcasts b ON b.id = (n.metadata->>'broadcast_id')::uuid
  WHERE n.user_id   = auth.uid()
    AND n.type      = 'admin_broadcast'
    AND n.is_read   = false
    AND b.type      = 'action_required'
    AND NOT b.pinned

  ORDER BY is_pinned DESC, sent_at DESC;
$$;

REVOKE ALL ON FUNCTION get_ambassador_broadcast_banners() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_ambassador_broadcast_banners() TO authenticated;

-- ─── RPC: mark_broadcast_read ────────────────────────────────────────────────
-- Records that the calling user has read a broadcast and marks the notification read.

DROP FUNCTION IF EXISTS mark_broadcast_read(uuid);

CREATE FUNCTION mark_broadcast_read(p_broadcast_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_broadcast_reads (broadcast_id, recipient_user_id)
  VALUES (p_broadcast_id, auth.uid())
  ON CONFLICT DO NOTHING;

  UPDATE notifications
  SET is_read = true
  WHERE user_id = auth.uid()
    AND type    = 'admin_broadcast'
    AND (metadata->>'broadcast_id')::uuid = p_broadcast_id;
END;
$$;

REVOKE ALL ON FUNCTION mark_broadcast_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_broadcast_read(uuid) TO authenticated;
