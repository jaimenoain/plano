-- Add moderated_at / moderated_by to building_posts so video approvals persist.
-- Adds ambassador_approve_video() SECURITY DEFINER RPC.
--
-- Bug: the Embassy → Contribute → Moderation → Videos tab's "Approve" / "Approve all"
-- buttons only mutated client-side React state (a `dismissed` Set) — no DB write.
-- On refresh, fetchModerationVideos() re-fetched every building_posts row with a
-- non-null video_url, so approved videos reappeared.
--
-- Mirrors the photo approval pattern (migration 20271113000000). No chapter-scope
-- guard is required because the Videos tab query is global (matches photos behaviour).

-- ─── 1. Schema additions ────────────────────────────────────────────────────

ALTER TABLE public.building_posts
  ADD COLUMN IF NOT EXISTS moderated_at  timestamptz  NULL,
  ADD COLUMN IF NOT EXISTS moderated_by  uuid         NULL
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─── 2. Approve RPC ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ambassador_approve_video(p_post_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_building_id uuid;
  v_video_url   text;
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
