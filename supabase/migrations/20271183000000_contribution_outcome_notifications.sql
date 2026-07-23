-- Roadmap 2.3 — Contribution outcome notifications.
--
-- Ambassadors approve or flag members' building/photo/video/credit submissions in the
-- Embassy Moderation tool, but the submitter never learns the outcome — the "silent
-- moderation loop" the roadmap spec calls out. This migration:
--
--   1. Adds `contribution_approved` / `contribution_flagged` to the notifications type list.
--   2. Teaches the six `ambassador_approve_*` RPCs to notify the original contributor
--      (buildings.created_by / review_images.user_id / building_posts.user_id /
--      building_credits.added_by_user_id) right after they stamp `moderated_at`.
--   3. Adds an AFTER INSERT trigger on `reports`, scoped to rows with a non-null
--      `content_type` (i.e. rows written by the embassy flag button, per migration
--      20271182000000 — the older user-block report path in 20260418000000 never sets
--      content_type, so it's naturally excluded), that resolves the flagged content's
--      owner and fires `contribution_flagged`.
--
-- Both paths skip the insert when the recipient can't be resolved or is the acting
-- ambassador/reporter themself. Existing per-type opt-out (profiles.notification_preferences,
-- migration 20260311000000) applies automatically via the notifications table's own
-- before-insert trigger — nothing new needed there.
--
-- types-neutral: notifications.type is a plain text column (CHECK constraint only,
-- not an enum) and every function below is a body-only CREATE OR REPLACE with an
-- unchanged signature/return type — gen-types is a no-op for this migration.

-- ─── 1. Notification type check constraint ─────────────────────────────────────

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'follow', 'like', 'comment', 'recommendation', 'friend_joined', 'suggest_follow',
  'visit_request', 'architect_verification', 'ambassador_application_received',
  'ambassador_application_approved', 'ambassador_application_rejected',
  'ambassador_membership_review', 'award_win', 'feedback_status_updated',
  'feedback_notes_updated', 'project_idea_submitted', 'collection_collab_requested',
  'collection_collab_accepted', 'collection_collab_rejected', 'collection_collab_added',
  'contribution_approved', 'contribution_flagged'
));

-- ─── 2. Approve RPCs — notify the original contributor ─────────────────────────

CREATE OR REPLACE FUNCTION public.ambassador_approve_building(p_building_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_chapter_id        uuid;
  v_recipient         uuid;
  v_building_name     text;
  v_building_slug     text;
  v_building_short_id integer;
BEGIN
  -- Resolve caller's active chapter
  SELECT chapter_id INTO v_chapter_id
  FROM public.ambassador_memberships
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;

  IF v_chapter_id IS NULL THEN
    RAISE EXCEPTION 'not_ambassador'
      USING HINT = 'Caller is not an active ambassador';
  END IF;

  -- Building must be within chapter scope
  IF NOT public._building_in_ambassador_chapter_scope(p_building_id, v_chapter_id) THEN
    RAISE EXCEPTION 'out_of_scope'
      USING HINT = 'Building is not in this ambassador''s chapter scope';
  END IF;

  -- Stamp approval (idempotent — no-op when already moderated)
  UPDATE public.buildings
  SET
    moderated_at = now(),
    moderated_by = auth.uid()
  WHERE id = p_building_id
    AND is_deleted IS NOT TRUE
    AND moderated_at IS NULL;

  -- Notify the original contributor
  SELECT created_by, name, slug, short_id
    INTO v_recipient, v_building_name, v_building_slug, v_building_short_id
  FROM public.buildings
  WHERE id = p_building_id;

  IF v_recipient IS NOT NULL AND v_recipient <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    VALUES (
      v_recipient,
      auth.uid(),
      'contribution_approved',
      jsonb_build_object(
        'content_type', 'building',
        'building_id', p_building_id,
        'building_name', v_building_name,
        'building_slug', v_building_slug,
        'building_short_id', v_building_short_id
      )
    );
  END IF;

  -- Audit trail
  INSERT INTO public.building_audit_logs (building_id, user_id, operation, table_name, new_data)
  VALUES (
    p_building_id,
    auth.uid(),
    'ambassador_approval',
    'buildings',
    jsonb_build_object(
      'moderated_at', now(),
      'moderated_by',  auth.uid()
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ambassador_approve_building(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_approve_building(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ambassador_approve_building_global(p_building_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_user_id           uuid := auth.uid();
  v_recipient         uuid;
  v_building_name     text;
  v_building_slug     text;
  v_building_short_id integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_ambassador'
      USING HINT = 'Caller is not an active ambassador';
  END IF;

  UPDATE public.buildings
  SET
    moderated_at = now(),
    moderated_by = v_user_id
  WHERE id = p_building_id
    AND is_deleted IS NOT TRUE
    AND moderated_at IS NULL;

  SELECT created_by, name, slug, short_id
    INTO v_recipient, v_building_name, v_building_slug, v_building_short_id
  FROM public.buildings
  WHERE id = p_building_id;

  IF v_recipient IS NOT NULL AND v_recipient <> v_user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    VALUES (
      v_recipient,
      v_user_id,
      'contribution_approved',
      jsonb_build_object(
        'content_type', 'building',
        'building_id', p_building_id,
        'building_name', v_building_name,
        'building_slug', v_building_slug,
        'building_short_id', v_building_short_id
      )
    );
  END IF;

  INSERT INTO public.building_audit_logs (building_id, user_id, operation, table_name, new_data)
  VALUES (
    p_building_id,
    v_user_id,
    'ambassador_approval',
    'buildings',
    jsonb_build_object(
      'moderated_at', now(),
      'moderated_by',  v_user_id,
      'global',        true
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ambassador_approve_building_global(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_approve_building_global(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ambassador_approve_photo(p_photo_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_building_id       uuid;
  v_recipient         uuid;
  v_building_name     text;
  v_building_slug     text;
  v_building_short_id integer;
BEGIN
  -- Verify caller is an active ambassador
  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_ambassador'
      USING HINT = 'Caller is not an active ambassador';
  END IF;

  -- Resolve the building this photo belongs to (review_images → building_posts → buildings)
  SELECT bp.building_id INTO v_building_id
  FROM public.review_images ri
  JOIN public.building_posts bp ON bp.id = ri.review_id
  WHERE ri.id = p_photo_id;

  IF v_building_id IS NULL THEN
    RAISE EXCEPTION 'photo_not_found'
      USING HINT = 'Photo does not exist or has no associated building';
  END IF;

  -- Stamp approval (idempotent — no-op when already moderated)
  UPDATE public.review_images
  SET
    moderated_at = now(),
    moderated_by = auth.uid()
  WHERE id = p_photo_id
    AND moderated_at IS NULL;

  -- Notify the original contributor
  SELECT ri.user_id, b.name, b.slug, b.short_id
    INTO v_recipient, v_building_name, v_building_slug, v_building_short_id
  FROM public.review_images ri
  JOIN public.buildings b ON b.id = v_building_id
  WHERE ri.id = p_photo_id;

  IF v_recipient IS NOT NULL AND v_recipient <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    VALUES (
      v_recipient,
      auth.uid(),
      'contribution_approved',
      jsonb_build_object(
        'content_type', 'photo',
        'building_id', v_building_id,
        'building_name', v_building_name,
        'building_slug', v_building_slug,
        'building_short_id', v_building_short_id
      )
    );
  END IF;

  -- Audit trail
  INSERT INTO public.building_audit_logs (building_id, user_id, operation, table_name, new_data)
  VALUES (
    v_building_id,
    auth.uid(),
    'ambassador_photo_approval',
    'review_images',
    jsonb_build_object(
      'photo_id',     p_photo_id,
      'moderated_at', now(),
      'moderated_by', auth.uid()
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ambassador_approve_photo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_approve_photo(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ambassador_approve_video(p_post_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_building_id       uuid;
  v_video_url         text;
  v_recipient         uuid;
  v_building_name     text;
  v_building_slug     text;
  v_building_short_id integer;
BEGIN
  -- Verify caller is an active ambassador
  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_ambassador'
      USING HINT = 'Caller is not an active ambassador';
  END IF;

  -- Resolve the building this video belongs to, and ensure the post is a video
  SELECT building_id, video_url INTO v_building_id, v_video_url
  FROM public.building_posts
  WHERE id = p_post_id;

  IF v_building_id IS NULL THEN
    RAISE EXCEPTION 'video_not_found'
      USING HINT = 'Building post does not exist';
  END IF;

  IF v_video_url IS NULL THEN
    RAISE EXCEPTION 'not_a_video'
      USING HINT = 'Building post has no video to moderate';
  END IF;

  -- Stamp approval (idempotent — no-op when already moderated)
  UPDATE public.building_posts
  SET
    moderated_at = now(),
    moderated_by = auth.uid()
  WHERE id = p_post_id
    AND moderated_at IS NULL;

  -- Notify the original contributor
  SELECT bp.user_id, b.name, b.slug, b.short_id
    INTO v_recipient, v_building_name, v_building_slug, v_building_short_id
  FROM public.building_posts bp
  JOIN public.buildings b ON b.id = bp.building_id
  WHERE bp.id = p_post_id;

  IF v_recipient IS NOT NULL AND v_recipient <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    VALUES (
      v_recipient,
      auth.uid(),
      'contribution_approved',
      jsonb_build_object(
        'content_type', 'video',
        'building_id', v_building_id,
        'building_name', v_building_name,
        'building_slug', v_building_slug,
        'building_short_id', v_building_short_id
      )
    );
  END IF;

  -- Audit trail
  INSERT INTO public.building_audit_logs (building_id, user_id, operation, table_name, new_data)
  VALUES (
    v_building_id,
    auth.uid(),
    'ambassador_video_approval',
    'building_posts',
    jsonb_build_object(
      'post_id',      p_post_id,
      'moderated_at', now(),
      'moderated_by', auth.uid()
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ambassador_approve_video(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_approve_video(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ambassador_approve_credit(p_credit_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_chapter_id        uuid;
  v_building_id       uuid;
  v_recipient         uuid;
  v_building_name     text;
  v_building_slug     text;
  v_building_short_id integer;
BEGIN
  -- Resolve caller's active chapter
  SELECT chapter_id INTO v_chapter_id
  FROM public.ambassador_memberships
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;

  IF v_chapter_id IS NULL THEN
    RAISE EXCEPTION 'not_ambassador'
      USING HINT = 'Caller is not an active ambassador';
  END IF;

  -- Resolve the building this credit belongs to
  SELECT building_id INTO v_building_id
  FROM public.building_credits
  WHERE id = p_credit_id;

  IF v_building_id IS NULL THEN
    RAISE EXCEPTION 'credit_not_found'
      USING HINT = 'Credit does not exist';
  END IF;

  -- Credit's building must be within chapter scope
  IF NOT public._building_in_ambassador_chapter_scope(v_building_id, v_chapter_id) THEN
    RAISE EXCEPTION 'out_of_scope'
      USING HINT = 'Credit building is not in this ambassador''s chapter scope';
  END IF;

  -- Stamp approval (idempotent — no-op when already moderated)
  UPDATE public.building_credits
  SET
    moderated_at = now(),
    moderated_by = auth.uid()
  WHERE id = p_credit_id
    AND moderated_at IS NULL;

  -- Notify the original contributor
  SELECT bc.added_by_user_id, b.name, b.slug, b.short_id
    INTO v_recipient, v_building_name, v_building_slug, v_building_short_id
  FROM public.building_credits bc
  JOIN public.buildings b ON b.id = bc.building_id
  WHERE bc.id = p_credit_id;

  IF v_recipient IS NOT NULL AND v_recipient <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    VALUES (
      v_recipient,
      auth.uid(),
      'contribution_approved',
      jsonb_build_object(
        'content_type', 'credit',
        'building_id', v_building_id,
        'building_name', v_building_name,
        'building_slug', v_building_slug,
        'building_short_id', v_building_short_id
      )
    );
  END IF;

  -- Audit trail
  INSERT INTO public.building_audit_logs (building_id, user_id, operation, table_name, new_data)
  VALUES (
    v_building_id,
    auth.uid(),
    'ambassador_credit_approval',
    'building_credits',
    jsonb_build_object(
      'credit_id',    p_credit_id,
      'moderated_at', now(),
      'moderated_by', auth.uid()
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ambassador_approve_credit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_approve_credit(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ambassador_approve_credit_global(p_credit_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_user_id           uuid := auth.uid();
  v_building_id        uuid;
  v_recipient         uuid;
  v_building_name     text;
  v_building_slug     text;
  v_building_short_id integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_ambassador'
      USING HINT = 'Caller is not an active ambassador';
  END IF;

  SELECT building_id INTO v_building_id
  FROM public.building_credits
  WHERE id = p_credit_id;

  IF v_building_id IS NULL THEN
    RAISE EXCEPTION 'credit_not_found'
      USING HINT = 'Credit does not exist';
  END IF;

  UPDATE public.building_credits
  SET
    moderated_at = now(),
    moderated_by = v_user_id
  WHERE id = p_credit_id
    AND moderated_at IS NULL;

  SELECT bc.added_by_user_id, b.name, b.slug, b.short_id
    INTO v_recipient, v_building_name, v_building_slug, v_building_short_id
  FROM public.building_credits bc
  JOIN public.buildings b ON b.id = bc.building_id
  WHERE bc.id = p_credit_id;

  IF v_recipient IS NOT NULL AND v_recipient <> v_user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    VALUES (
      v_recipient,
      v_user_id,
      'contribution_approved',
      jsonb_build_object(
        'content_type', 'credit',
        'building_id', v_building_id,
        'building_name', v_building_name,
        'building_slug', v_building_slug,
        'building_short_id', v_building_short_id
      )
    );
  END IF;

  INSERT INTO public.building_audit_logs (building_id, user_id, operation, table_name, new_data)
  VALUES (
    v_building_id,
    v_user_id,
    'ambassador_credit_approval',
    'building_credits',
    jsonb_build_object(
      'credit_id',    p_credit_id,
      'moderated_at', now(),
      'moderated_by', v_user_id,
      'global',       true
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ambassador_approve_credit_global(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_approve_credit_global(uuid) TO authenticated;

-- ─── 3. Flag path — notify the original contributor when an ambassador flags content ──

CREATE OR REPLACE FUNCTION public._notify_contribution_flagged()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_recipient         uuid;
  v_building_id       uuid;
  v_building_name     text;
  v_building_slug     text;
  v_building_short_id integer;
BEGIN
  IF NEW.content_type IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.content_type = 'building' THEN
    SELECT created_by, id, name, slug, short_id
      INTO v_recipient, v_building_id, v_building_name, v_building_slug, v_building_short_id
    FROM public.buildings
    WHERE id = NEW.reported_id;
  ELSIF NEW.content_type = 'photo' THEN
    SELECT ri.user_id, b.id, b.name, b.slug, b.short_id
      INTO v_recipient, v_building_id, v_building_name, v_building_slug, v_building_short_id
    FROM public.review_images ri
    JOIN public.building_posts bp ON bp.id = ri.review_id
    JOIN public.buildings b ON b.id = bp.building_id
    WHERE ri.id = NEW.reported_id;
  ELSIF NEW.content_type = 'video' THEN
    SELECT bp.user_id, b.id, b.name, b.slug, b.short_id
      INTO v_recipient, v_building_id, v_building_name, v_building_slug, v_building_short_id
    FROM public.building_posts bp
    JOIN public.buildings b ON b.id = bp.building_id
    WHERE bp.id = NEW.reported_id;
  ELSIF NEW.content_type = 'credit' THEN
    SELECT bc.added_by_user_id, b.id, b.name, b.slug, b.short_id
      INTO v_recipient, v_building_id, v_building_name, v_building_slug, v_building_short_id
    FROM public.building_credits bc
    JOIN public.buildings b ON b.id = bc.building_id
    WHERE bc.id = NEW.reported_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_recipient IS NOT NULL AND v_recipient <> NEW.reporter_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, metadata)
    VALUES (
      v_recipient,
      NEW.reporter_id,
      'contribution_flagged',
      jsonb_build_object(
        'content_type', NEW.content_type,
        'building_id', v_building_id,
        'building_name', v_building_name,
        'building_slug', v_building_slug,
        'building_short_id', v_building_short_id,
        'reason', NEW.reason
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_contribution_flagged ON public.reports;
CREATE TRIGGER trg_notify_contribution_flagged
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public._notify_contribution_flagged();
