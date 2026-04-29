-- Ambassador applications: table, partial unique index, RLS, notification types, RPCs.
-- Apply via Supabase SQL Editor in timestamp order after prior migrations.

-- ── Notifications: extend allowed types ─────────────────────────────────────

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'follow',
      'like',
      'comment',
      'recommendation',
      'friend_joined',
      'suggest_follow',
      'visit_request',
      'architect_verification',
      'ambassador_application_received',
      'ambassador_application_approved',
      'ambassador_application_rejected'
    )
  );

-- ── Table: ambassador_applications ────────────────────────────────────────

CREATE TABLE public.ambassador_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.ambassador_chapters (id) ON DELETE CASCADE,
  motivation_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles (id),
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX ambassador_applications_one_pending_per_user
  ON public.ambassador_applications (user_id)
  WHERE (status = 'pending');

CREATE INDEX ambassador_applications_chapter_id_idx ON public.ambassador_applications (chapter_id);

CREATE INDEX ambassador_applications_status_idx ON public.ambassador_applications (status);

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.ambassador_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ambassador_applications_select"
  ON public.ambassador_applications
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
    OR public.is_chapter_leader (chapter_id)
  );

CREATE POLICY "ambassador_applications_update_leaders"
  ON public.ambassador_applications
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_chapter_leader (chapter_id)
  )
  WITH CHECK (
    public.is_admin()
    OR public.is_chapter_leader (chapter_id)
  );

CREATE POLICY "ambassador_applications_delete_admin"
  ON public.ambassador_applications
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

GRANT SELECT, UPDATE, DELETE ON TABLE public.ambassador_applications TO authenticated;

-- Inserts only via submit_ambassador_application (SECURITY DEFINER).
REVOKE INSERT ON TABLE public.ambassador_applications FROM authenticated;

-- ── RPC: submit (validates, inserts, notifies chapter leaders) ─────────────

CREATE OR REPLACE FUNCTION public.submit_ambassador_application (
  p_chapter_id uuid,
  p_motivation_text text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_app_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF char_length(trim(p_motivation_text)) < 100 THEN
    RAISE EXCEPTION 'motivation_too_short';
  END IF;
  IF EXISTS (
    SELECT
      1
    FROM
      public.ambassador_memberships m
    WHERE
      m.user_id = v_uid
      AND m.status = 'active') THEN
    RAISE EXCEPTION 'already_member';
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.ambassador_chapters c
    WHERE
      c.id = p_chapter_id
      AND c.status IN ('active', 'forming')) THEN
    RAISE EXCEPTION 'invalid_chapter';
  END IF;
  INSERT INTO public.ambassador_applications (user_id, chapter_id, motivation_text)
    VALUES (v_uid, p_chapter_id, trim(p_motivation_text))
  RETURNING
    id INTO v_app_id;
  INSERT INTO public.notifications (user_id, actor_id, type, metadata)
  SELECT
    m.user_id,
    v_uid,
    'ambassador_application_received'::text,
    jsonb_build_object('application_id', v_app_id, 'chapter_id', p_chapter_id)
  FROM
    public.ambassador_memberships m
  WHERE
    m.chapter_id = p_chapter_id
    AND m.status = 'active'
    AND m.role IN ('president', 'exco');
  RETURN v_app_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'pending_exists';
END;
$$;

-- ── RPC: review (approve creates membership; reject updates row; notifies) ─

CREATE OR REPLACE FUNCTION public.review_ambassador_application (
  p_application_id uuid,
  p_approve boolean,
  p_reviewer_note text DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_app public.ambassador_applications;
  v_uid uuid := auth.uid();
  v_chapter public.ambassador_chapters;
  v_amb_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT
    * INTO v_app
  FROM
    public.ambassador_applications
  WHERE
    id = p_application_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'application_not_found';
  END IF;
  IF v_app.status <> 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;
  IF NOT (public.is_admin() OR public.is_chapter_leader (v_app.chapter_id)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT
    * INTO v_chapter
  FROM
    public.ambassador_chapters
  WHERE
    id = v_app.chapter_id;
  IF p_approve THEN
    IF EXISTS (
      SELECT
        1
      FROM
        public.ambassador_memberships m
      WHERE
        m.user_id = v_app.user_id
        AND m.status = 'active') THEN
      RAISE EXCEPTION 'applicant_already_member';
    END IF;
    IF NOT public.is_admin() THEN
      SELECT
        COUNT(*)::integer INTO v_amb_count
      FROM
        public.ambassador_memberships m
      WHERE
        m.chapter_id = v_app.chapter_id
        AND m.role = 'ambassador'
        AND m.status = 'active';
      IF v_amb_count >= v_chapter.max_ambassadors THEN
        RAISE EXCEPTION 'chapter_full';
      END IF;
    END IF;
    INSERT INTO public.ambassador_memberships (chapter_id, user_id, role, exco_responsibility, status, invited_by)
      VALUES (v_app.chapter_id, v_app.user_id, 'ambassador', NULL, 'active', v_uid);
    UPDATE
      public.ambassador_applications
    SET
      status = 'approved',
      reviewed_by = v_uid,
      reviewer_note = NULL,
      reviewed_at = timezone('utc'::text, now())
    WHERE
      id = p_application_id;
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
      VALUES (v_app.user_id, v_uid, 'ambassador_application_approved', jsonb_build_object('application_id', p_application_id, 'chapter_id', v_app.chapter_id, 'chapter_name', v_chapter.name));
  ELSE
    UPDATE
      public.ambassador_applications
    SET
      status = 'rejected',
      reviewed_by = v_uid,
      reviewer_note = NULLIF (trim(p_reviewer_note), ''),
      reviewed_at = timezone('utc'::text, now())
    WHERE
      id = p_application_id;
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
      VALUES (v_app.user_id, v_uid, 'ambassador_application_rejected', jsonb_build_object('application_id', p_application_id, 'chapter_id', v_app.chapter_id, 'reviewer_note', NULLIF (trim(p_reviewer_note), '')));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_ambassador_application (uuid, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.review_ambassador_application (uuid, boolean, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_ambassador_application (uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.review_ambassador_application (uuid, boolean, text) TO authenticated;
