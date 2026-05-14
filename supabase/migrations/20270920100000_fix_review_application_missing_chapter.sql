-- Fix review_ambassador_application to handle applications submitted without a chapter_id
-- (new flow from 20270920000000). Adds optional p_chapter_id so admins can assign a chapter
-- during approval. Raises no_chapter_assigned when both are NULL.

CREATE OR REPLACE FUNCTION public.review_ambassador_application (
  p_application_id uuid,
  p_approve boolean,
  p_reviewer_note text DEFAULT NULL::text,
  p_chapter_id uuid DEFAULT NULL::uuid
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
  v_effective_chapter_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_app
  FROM public.ambassador_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'application_not_found';
  END IF;

  IF v_app.status <> 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  IF NOT (public.is_admin() OR public.is_chapter_leader(v_app.chapter_id)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Use the application's chapter if set, otherwise fall back to caller-supplied chapter.
  v_effective_chapter_id := COALESCE(v_app.chapter_id, p_chapter_id);

  SELECT * INTO v_chapter
  FROM public.ambassador_chapters
  WHERE id = v_effective_chapter_id;

  IF p_approve THEN
    IF v_effective_chapter_id IS NULL THEN
      RAISE EXCEPTION 'no_chapter_assigned';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.ambassador_memberships m
      WHERE m.user_id = v_app.user_id
        AND m.status = 'active'
    ) THEN
      RAISE EXCEPTION 'applicant_already_member';
    END IF;

    IF NOT public.is_admin() THEN
      SELECT COUNT(*)::integer INTO v_amb_count
      FROM public.ambassador_memberships m
      WHERE m.chapter_id = v_effective_chapter_id
        AND m.role = 'ambassador'
        AND m.status = 'active';
      IF v_amb_count >= v_chapter.max_ambassadors THEN
        RAISE EXCEPTION 'chapter_full';
      END IF;
    END IF;

    -- Persist chapter assignment if it was supplied by the caller.
    IF v_app.chapter_id IS NULL THEN
      UPDATE public.ambassador_applications
      SET chapter_id = v_effective_chapter_id
      WHERE id = p_application_id;
    END IF;

    INSERT INTO public.ambassador_memberships (chapter_id, user_id, role, exco_responsibility, status, invited_by)
      VALUES (v_effective_chapter_id, v_app.user_id, 'ambassador', NULL, 'active', v_uid);

    UPDATE public.ambassador_applications
    SET
      status = 'approved',
      reviewed_by = v_uid,
      reviewer_note = NULL,
      reviewed_at = timezone('utc'::text, now())
    WHERE id = p_application_id;

    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
      VALUES (
        v_app.user_id,
        v_uid,
        'ambassador_application_approved',
        jsonb_build_object(
          'application_id', p_application_id,
          'chapter_id', v_effective_chapter_id,
          'chapter_name', v_chapter.name
        )
      );
  ELSE
    UPDATE public.ambassador_applications
    SET
      status = 'rejected',
      reviewed_by = v_uid,
      reviewer_note = NULLIF(trim(p_reviewer_note), ''),
      reviewed_at = timezone('utc'::text, now())
    WHERE id = p_application_id;

    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
      VALUES (
        v_app.user_id,
        v_uid,
        'ambassador_application_rejected',
        jsonb_build_object(
          'application_id', p_application_id,
          'chapter_id', v_app.chapter_id,
          'reviewer_note', NULLIF(trim(p_reviewer_note), '')
        )
      );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_ambassador_application(uuid, boolean, text, uuid) TO authenticated;
