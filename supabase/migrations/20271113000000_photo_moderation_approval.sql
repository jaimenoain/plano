-- Add moderated_at / moderated_by to review_images so photo approvals persist.
-- Adds ambassador_approve_photo() SECURITY DEFINER RPC.
-- Feedback id: 410311ad-cb11-4957-993e-1747907dfc1d

-- ─── 1. Schema additions ────────────────────────────────────────────────────

ALTER TABLE public.review_images
  ADD COLUMN IF NOT EXISTS moderated_at  timestamptz  NULL,
  ADD COLUMN IF NOT EXISTS moderated_by  uuid         NULL
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─── 2. Approve RPC ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ambassador_approve_photo(p_photo_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_building_id uuid;
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
