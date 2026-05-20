-- Add moderated_at / moderated_by to building_credits so credit approvals persist.
-- Adds ambassador_approve_credit() SECURITY DEFINER RPC.
-- Feedback id: c51f4adc-fdb8-4736-8fe3-79ad130db42d

-- ─── 1. Schema additions ────────────────────────────────────────────────────

ALTER TABLE public.building_credits
  ADD COLUMN IF NOT EXISTS moderated_at  timestamptz  NULL,
  ADD COLUMN IF NOT EXISTS moderated_by  uuid         NULL
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─── 2. Approve RPC ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ambassador_approve_credit(p_credit_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_chapter_id  uuid;
  v_building_id uuid;
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
